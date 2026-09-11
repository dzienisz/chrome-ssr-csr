import { describe, it, expect, beforeEach } from "vitest";

import "../report.js";

const { verdictKind, verdictBadge, renderVerdict, renderOverview, renderSignals, renderDelivery, renderDiff } =
  window.SSRReport;

/** A complete, realistic result — the renderer must not need every field. */
function result(overrides = {}) {
  return {
    renderType: "Server-Side Rendered (SSR)",
    confidence: 92,
    indicators: ["raw HTML matches rendered content (0.98x ratio) - SSR"],
    renderOrigin: {
      id: "edge",
      label: "Rendered once, served from cache",
      detail: "A cache via Vercel answered this request.",
    },
    signals: [
      {
        id: "comparison.match",
        label: "The served HTML already contained the page",
        impact: "ssr",
        weight: 30,
        detail: "2,000 of 2,010 visible characters were in the initial response.",
      },
      {
        id: "delivery.cdn",
        label: "Served through Vercel",
        impact: "info",
        weight: 0,
        detail: "Cache state reported as HIT.",
      },
    ],
    detailedInfo: {
      ssrScore: 85,
      csrScore: 0,
      ssrPercentage: 100,
      hybridScore: 0,
      totalIndicators: 5,
      frameworks: ["nextjs"],
      generators: ["hugo"],
      contentComparison: { rawLength: 2000, renderedLength: 2010, ratio: 0.99 },
      timing: { domContentLoaded: 12, firstContentfulPaint: 340 },
      delivery: {
        available: true,
        mode: "edge-cached",
        modeLabel: "Served from CDN cache",
        modeDetail: "A cache answered this request.",
        cdn: "Vercel",
        runtime: "Next.js",
        cacheState: "HIT",
        age: 312,
        cacheControl: "public, s-maxage=86400",
        sMaxAge: 86400,
        staleWhileRevalidate: 59,
        compression: "br",
        varies: null,
        lastModified: null,
        ttfb: 47,
        serverTiming: [{ name: "edge", duration: 3, description: "HIT" }],
        evidence: ["cache hit"],
      },
      domDiff: {
        available: true,
        serverChars: 2000,
        clientChars: 10,
        serverSharePct: 99,
        rawElements: 120,
        renderedElements: 126,
        elementsAddedByJs: 6,
        regionCount: 2,
        serverRegionCount: 2,
        clientRegionCount: 0,
        mixedRegionCount: 0,
        regions: [
          {
            key: "main",
            label: "Main content",
            rawChars: 1800,
            renderedChars: 1800,
            addedChars: 0,
            origin: "server",
            existedInRawHtml: true,
          },
        ],
        biggestClientRegion: null,
      },
    },
    ...overrides,
  };
}

describe("verdictKind", () => {
  it.each([
    ["Server-Side Rendered (SSR)", "ssr"],
    ["Likely SSR with Hydration", "ssr"],
    ["Client-Side Rendered (CSR)", "csr"],
    ["Likely CSR/SPA", "csr"],
    ["Hybrid/Islands Architecture", "hybrid"],
    ["Hybrid/Mixed Rendering", "hybrid"],
    ["Analysis Error", "unknown"],
    ["", "unknown"],
  ])("maps %s to %s", (renderType, expected) => {
    expect(verdictKind(renderType)).toBe(expected);
  });

  it("classifies hybrid before SSR, because both strings contain a verdict word", () => {
    expect(verdictKind("Hybrid/Islands Architecture")).toBe("hybrid");
    expect(verdictBadge("Hybrid/Islands Architecture")).toBe("MIX");
  });
});

describe("renderVerdict", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the verdict, the badge and the confidence", () => {
    const node = renderVerdict(result());

    expect(node.dataset.kind).toBe("ssr");
    expect(node.querySelector(".verdict-label").textContent).toBe("Server-Side Rendered (SSR)");
    expect(node.querySelector(".verdict-kind").textContent).toBe("SSR");
    expect(node.querySelector(".dial-value").textContent).toBe("92");
    expect(node.querySelector(".dial").style.getPropertyValue("--value")).toBe("92");
  });

  it("keeps the split bar out of the verdict row so it cannot steal its width", () => {
    const node = renderVerdict(result());

    expect(node.querySelector(".verdict-main .split")).toBeNull();
    expect(node.querySelector(":scope > .split")).not.toBeNull();
  });

  it("omits the split bar when there is nothing to compare", () => {
    const node = renderVerdict(
      result({ detailedInfo: { ...result().detailedInfo, domDiff: { available: false } } }),
    );

    expect(node.querySelector(".split")).toBeNull();
  });

  it("renders without a render origin", () => {
    const node = renderVerdict(result({ renderOrigin: null }));

    expect(node.querySelector(".verdict-origin")).toBeNull();
  });
});

describe("escaping", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  // The analysis result carries strings the inspected page chose: element ids,
  // framework names, header values. None of them may ever become markup.
  const payload = '<img src=x onerror="globalThis.__pwned = true">';

  it("never turns a page-controlled framework name into markup", () => {
    const data = result();
    data.detailedInfo.frameworks = [payload];

    const container = document.createElement("div");
    container.appendChild(renderOverview(data));

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain(payload);
  });

  it("never turns a page-controlled region selector into markup", () => {
    const data = result();
    data.detailedInfo.domDiff.regions[0].key = payload;
    data.detailedInfo.domDiff.regions[0].label = payload;

    const container = document.createElement("div");
    container.appendChild(renderDiff(data));

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain(payload);
  });

  it("never turns a page-controlled header value into markup", () => {
    const data = result();
    data.detailedInfo.delivery.server = payload;

    const container = document.createElement("div");
    container.appendChild(renderDelivery(data));

    expect(container.querySelector("img")).toBeNull();
  });

  it("never turns a signal label into markup", () => {
    const data = result();
    data.signals[0].label = payload;

    const container = document.createElement("div");
    container.appendChild(renderSignals(data));

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain(payload);
  });
});

describe("renderOverview", () => {
  it("lists frameworks and generators as chips", () => {
    const container = document.createElement("div");
    container.appendChild(renderOverview(result()));

    const chips = [...container.querySelectorAll(".chip")].map((c) => c.textContent);
    expect(chips).toContain("nextjs");
    expect(chips).toContain("hugo");
  });

  it("shows the three strongest signals by default", () => {
    const container = document.createElement("div");
    container.appendChild(renderOverview(result()));

    expect(container.textContent).toContain("The served HTML already contained the page");
  });

  it("omits them when the caller renders the full list elsewhere", () => {
    const container = document.createElement("div");
    container.appendChild(renderOverview(result(), { topSignals: false }));

    expect(container.textContent).not.toContain("The served HTML already contained the page");
  });

  it("survives a result with no comparison, timing or delivery data", () => {
    const container = document.createElement("div");
    const bare = result({
      detailedInfo: { ssrScore: 0, csrScore: 0, ssrPercentage: 50 },
      signals: [],
    });

    expect(() => container.appendChild(renderOverview(bare))).not.toThrow();
  });
});

describe("renderSignals", () => {
  it("separates scored evidence from context", () => {
    const container = document.createElement("div");
    container.appendChild(renderSignals(result()));

    const cards = container.querySelectorAll(".card");
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("The served HTML already contained the page");
    expect(cards[1].textContent).toContain("Served through Vercel");
  });

  it("labels the weight with the side it moved", () => {
    const container = document.createElement("div");
    container.appendChild(renderSignals(result()));

    expect(container.querySelector(".signal-weight").textContent).toBe("SSR +30");
  });

  it("reports an empty state rather than an empty card", () => {
    const node = renderSignals(result({ signals: [] }));

    expect(node.className).toBe("empty");
  });
});

describe("renderDelivery", () => {
  it("renders the transport details", () => {
    const container = document.createElement("div");
    container.appendChild(renderDelivery(result()));

    expect(container.textContent).toContain("Vercel");
    expect(container.textContent).toContain("HIT");
    expect(container.textContent).toContain("312s");
    expect(container.textContent).toContain("47 ms");
  });

  it("explains itself when headers were unavailable", () => {
    const data = result();
    data.detailedInfo.delivery = { available: false };

    const node = renderDelivery(data);
    expect(node.className).toBe("empty");
  });
});

describe("renderDiff", () => {
  it("renders one row per region", () => {
    const container = document.createElement("div");
    container.appendChild(renderDiff(result()));

    expect(container.querySelectorAll(".region")).toHaveLength(1);
    expect(container.textContent).toContain("Main content");
  });

  it("explains itself when the raw HTML was unavailable", () => {
    const data = result();
    data.detailedInfo.domDiff = { available: false };

    expect(renderDiff(data).className).toBe("empty");
  });
});
