import { describe, expect, it } from "vitest";

import "../region-key.js";

const { resolveRegionKey } = window;

describe("resolveRegionKey", () => {
  it("maps body to the provided root", () => {
    expect(resolveRegionKey(document.body, "body")).toBe(document.body);
  });

  it("resolves ids, including ids that need escaping", () => {
    document.body.innerHTML = '<div id="__next"></div><div id=":r0:"></div>';

    expect(resolveRegionKey(document.body, "#__next")).toBe(
      document.getElementById("__next"),
    );
    const escapedId =
      typeof CSS !== "undefined" && typeof CSS.escape === "function"
        ? CSS.escape(":r0:")
        : "\\:r0\\:";
    expect(resolveRegionKey(document.body, `#${escapedId}`)).toBe(
      document.getElementById(":r0:"),
    );
  });

  it("anchors a tag key to direct children of the root", () => {
    document.body.innerHTML = "<div><main></main></div>";

    expect(resolveRegionKey(document.body, "main")).toBeNull();
  });

  it("resolves nested paths from the root", () => {
    document.body.innerHTML =
      "<div><section id='first'></section></div><div><section id='second'></section></div>";

    expect(resolveRegionKey(document.body, "div:nth-of-type(2) > section")).toBe(
      document.getElementById("second"),
    );
  });

  it("returns null for invalid selectors and missing roots", () => {
    expect(resolveRegionKey(document.body, "[")).toBeNull();
    expect(resolveRegionKey(null, "main")).toBeNull();
  });
});
