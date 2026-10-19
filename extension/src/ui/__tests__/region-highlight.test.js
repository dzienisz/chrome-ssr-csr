import { afterEach, describe, expect, it } from "vitest";

import "../region-highlight.js";

const highlight = window.SSRRegionHighlight;

function addMain() {
  document.body.innerHTML = "<main>Live page content</main>";
  const main = document.querySelector("main");
  main.getBoundingClientRect = () => ({
    top: 20,
    left: 30,
    right: 230,
    bottom: 120,
    width: 200,
    height: 100,
  });
  return main;
}

afterEach(() => {
  highlight.remove();
});

describe("originStyle and chipText", () => {
  it("returns the fixed styles for each origin and mixed for unknown origins", () => {
    expect(highlight.originStyle("client").outline).toBe("#ea580c");
    expect(highlight.originStyle("mixed").outline).toBe("#f59e0b");
    expect(highlight.originStyle("server").outline).toBe("#16a34a");
    expect(highlight.originStyle("unknown")).toBe(highlight.ORIGIN_STYLES.mixed);
    expect(Object.isFrozen(highlight.ORIGIN_STYLES)).toBe(true);
  });

  it("keeps chip text contrast above WCAG AA for every origin", () => {
    const luminance = (hex) => {
      const channels = hex.match(/[a-f\d]{2}/gi).map((value) => {
        const channel = parseInt(value, 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };

    for (const style of Object.values(highlight.ORIGIN_STYLES)) {
      const light = luminance(style.chipText);
      const dark = luminance(style.chipBg);
      expect((Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses provided strings, English fallbacks, truncated labels, and optional shares", () => {
    expect(
      highlight.chipText(
        { origin: "client", key: "#x", label: "Results", serverPct: 40 },
        { client: "Built in browser", share: "$1% server content" },
      ),
    ).toBe("Built in browser · Results · 40% server content");
    expect(
      highlight.chipText({ origin: "server", key: "#content", serverPct: 100 }),
    ).toBe("From server · #content · 100% from server");
    expect(
      highlight.chipText({
        origin: "mixed",
        key: "#content",
        label: "x".repeat(60),
      }),
    ).toBe(`Mixed · ${"x".repeat(47)}…`);
  });
});

describe("layoutChips", () => {
  it("stacks partially offscreen chips below the viewport edge", () => {
    const height = 16;
    const placements = highlight.layoutChips(
      [-20, -40, -60].map((top) => ({
        rect: { top, left: 20, right: 120, bottom: 100 },
        width: 80,
        height,
      })),
    );

    expect(placements.map(({ top }) => top)).toEqual([
      0,
      height + 2,
      height * 2 + 4,
    ]);
  });

  it("leaves chips at the same top when they do not overlap horizontally", () => {
    const placements = highlight.layoutChips(
      [0, 120, 240].map((left) => ({
        rect: { top: 0, left, right: left + 100, bottom: 100 },
        width: 80,
        height: 16,
      })),
    );

    expect(placements.map(({ top }) => top)).toEqual([0, 0, 0]);
  });

  it("hides a bumped chip when it no longer fits inside its region", () => {
    const placements = highlight.layoutChips([
      {
        rect: { top: -5, left: 10, right: 50, bottom: 50 },
        width: 20,
        height: 20,
      },
      {
        rect: { top: -4, left: 10, right: 50, bottom: 15 },
        width: 20,
        height: 20,
      },
    ]);

    expect(placements[0].hidden).toBe(false);
    expect(placements[1]).toEqual({ top: 22, left: 10, hidden: true });
  });

  it("returns placements in the same order as the input entries", () => {
    const placements = highlight.layoutChips([
      {
        rect: { top: 30, left: 0, right: 20, bottom: 50 },
        width: 10,
        height: 5,
      },
      {
        rect: { top: 5, left: 40, right: 60, bottom: 50 },
        width: 10,
        height: 5,
      },
      {
        rect: { top: 20, left: 80, right: 100, bottom: 50 },
        width: 10,
        height: 5,
      },
    ]);

    expect(placements).toEqual([
      { top: 30, left: 0, hidden: false },
      { top: 5, left: 40, hidden: false },
      { top: 20, left: 80, hidden: false },
    ]);
  });
});

describe("show and remove", () => {
  it("places one closed-shadow host under the document element without changing body HTML", () => {
    const main = addMain();
    const before = document.body.innerHTML;

    expect(highlight.show([{ key: "main", label: "Main", origin: "server", serverPct: 80 }])).toEqual({
      drawn: 1,
      total: 1,
    });

    const { host, root, items } = highlight.inspect();
    expect(host.parentElement).toBe(document.documentElement);
    expect(document.body.innerHTML).toBe(before);
    expect(host.shadowRoot).toBeNull();
    expect(host.style.getPropertyValue("pointer-events")).toBe("none");
    expect(host.style.getPropertyValue("z-index")).toBe("2147483647");
    expect(root.textContent).toContain("From server · Main · 80% from server");
    expect(items[0].el).toBe(main);
    expect(highlight.isActive()).toBe(true);
  });

  it("skips missing regions and does not create a host when none match", () => {
    addMain();
    expect(
      highlight.show([
        { key: "main", origin: "client" },
        { key: "section", origin: "server" },
      ]),
    ).toEqual({ drawn: 1, total: 2 });
    expect(document.querySelectorAll("ssr-detector-highlight")).toHaveLength(1);
    highlight.remove();

    expect(highlight.show([{ key: "section", origin: "server" }])).toEqual({
      drawn: 0,
      total: 1,
    });
    expect(document.querySelectorAll("ssr-detector-highlight")).toHaveLength(0);
    expect(highlight.inspect()).toBeNull();
    expect(highlight.isActive()).toBe(false);
  });

  it("replaces an existing host when shown again", () => {
    addMain();
    highlight.show([{ key: "main", origin: "client" }]);
    highlight.show([{ key: "main", origin: "mixed" }]);

    expect(document.querySelectorAll("ssr-detector-highlight")).toHaveLength(1);
    expect(highlight.inspect().root.textContent).toContain("Mixed · main");
  });

  it("removes the host on Escape and reports removal transitions", () => {
    addMain();
    highlight.show([{ key: "main", origin: "client" }]);
    expect(highlight.remove()).toBe(true);
    expect(highlight.remove()).toBe(false);
    expect(highlight.isActive()).toBe(false);

    highlight.show([{ key: "main", origin: "server" }]);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(document.querySelectorAll("ssr-detector-highlight")).toHaveLength(0);
    expect(highlight.isActive()).toBe(false);
  });
});
