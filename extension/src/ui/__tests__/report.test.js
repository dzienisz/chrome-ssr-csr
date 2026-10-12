import { describe, it, expect, beforeEach } from "vitest";

import "../jev.js";
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
      contentComparison: {
        rawLength: 2000,
        renderedLength: 2010,
        ratio: 0.99,
        source: "fetch",
        wordCoverage: 0.99,
      },
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

  it("shows why an unassessable result has no confidence dial", () => {
    const node = renderVerdict(
      result({
        renderType: "Cannot assess",
        confidence: 0,
        assessable: false,
        unassessableReason: "bot-challenge",
        signals: [
          {
            id: "gate.botChallenge",
            label: "The page you are on is a bot check, not the site",
            impact: "info",
            weight: 0,
            detail: "The title or visible text matches a bot challenge page.",
          },
        ],
      }),
    );

    expect(node.dataset.kind).toBe("unknown");
    expect(node.querySelector(".verdict-kind").textContent).toBe("?");
    expect(node.querySelector(".verdict-label").textContent).toBe("Cannot assess");
    expect(node.querySelector(".verdict-reason").textContent).toContain(
      "bot challenge page",
    );
    expect(node.querySelector(".dial")).toBeNull();
    expect(node.textContent).not.toContain("%");
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
  it("shows the server word-coverage percentage when available", () => {
    const container = document.createElement("div");
    container.appendChild(renderOverview(result()));

    const stat = [...container.querySelectorAll(".stat")].find(
      (item) => item.querySelector(".stat-label")?.textContent === "Words from server",
    );

    expect(stat.querySelector(".stat-value").textContent).toBe("99%");
  });

  it("omits the server word-coverage stat for unassessable results", () => {
    const container = document.createElement("div");
    container.appendChild(renderOverview(result({ assessable: false })));

    expect(
      [...container.querySelectorAll(".stat")].some(
        (item) =>
          item.querySelector(".stat-label")?.textContent === "Words from server",
      ),
    ).toBe(false);
  });

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

  it("renders an Ask Jev card as text and wires its button", () => {
    const onAsk = vi.fn();
    const container = document.createElement("div");
    container.appendChild(
      renderOverview(result(), {
        jev: { source: "fetch", status: "idle", onAsk },
      }),
    );

    expect(container.textContent).toContain("Uncertain result — ask a second opinion");
    const button = container.querySelector(".jev-card button");
    expect(button.disabled).toBe(false);
    button.click();
    expect(onAsk).toHaveBeenCalledOnce();
  });

  it("disables Ask Jev when the comparison did not come from a fetch", () => {
    const container = document.createElement("div");
    container.appendChild(
      renderOverview(result(), {
        jev: { source: "parser-snapshot", status: "idle" },
      }),
    );

    expect(container.querySelector(".jev-card button").disabled).toBe(true);
    expect(container.textContent).toContain(
      "The site refused a second copy of its HTML, so there is nothing to compare.",
    );
  });

  it("renders server and browser probabilities and typed errors", () => {
    const container = document.createElement("div");
    container.appendChild(
      renderOverview(result(), {
        jev: {
          source: "fetch",
          status: "result",
          result: { contentInInitialHtml: 0.92, emptyShell: 0.03 },
        },
      }),
    );
    expect(container.textContent).toContain(
      "Jev: the main content is in the server HTML (92%)",
    );
    expect(container.textContent).toContain(
      "Second opinion from TypeSafe's Jev — it does not change the verdict above.",
    );

    document.body.appendChild(container);
    container.replaceChildren(
      renderOverview(result(), {
        jev: {
          source: "fetch",
          status: "result",
          result: { contentInInitialHtml: 0.12, emptyShell: 0.9 },
        },
      }),
    );
    expect(container.textContent).toContain(
      "Jev: the main content is built by JavaScript in the browser (88%)",
    );
    container.replaceChildren(
      renderOverview(result(), {
        jev: {
          source: "fetch",
          status: "error",
          errorKind: "auth",
        },
      }),
    );
    expect(container.textContent).toContain(
      "Jev rejected the API key — check it in Settings",
    );
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

  // The decisive-CSR cap removes SSR points rather than adding CSR ones.
  // Rendering it as "CSR +80" would claim evidence that was never found.
  it("renders a negative weight as a signed adjustment on its own side", () => {
    const data = result();
    data.signals = [
      {
        id: "comparison.decisiveCsr",
        label: "Server-side signals capped",
        impact: "ssr",
        weight: -80,
        detail: "Cut from 90 to 10.",
      },
    ];

    const container = document.createElement("div");
    container.appendChild(renderSignals(data));

    expect(container.querySelector(".signal-weight").textContent).toBe("SSR \u221280");
    expect(container.querySelector(".signal").dataset.impact).toBe("ssr");
  });

  it("counts a negative weight as scored evidence, not as context", () => {
    const data = result();
    data.signals = [
      { id: "cap", label: "Capped", impact: "ssr", weight: -80, detail: "" },
      { id: "info", label: "Info", impact: "info", weight: 0, detail: "" },
    ];

    const container = document.createElement("div");
    container.appendChild(renderSignals(data));

    const cards = container.querySelectorAll(".card");
    expect(cards[0].textContent).toContain("Capped");
    expect(cards[1].textContent).toContain("Info");
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

  it("uses word-covered characters for the region bar, label, and accessible name", () => {
    const data = result();
    data.detailedInfo.domDiff.regions = [
      {
        key: "#article",
        label: "Article",
        rawChars: 719,
        coveredChars: 0,
        renderedChars: 720,
        addedChars: 720,
        origin: "client",
      },
    ];
    const container = document.createElement("div");
    container.appendChild(renderDiff(data));
    const track = container.querySelector(".region-track");

    expect(container.textContent).toContain("0 from server");
    expect(track.querySelector(".split-server").style.width).toBe("0%");
    expect(track.getAttribute("aria-label")).toBe(
      "0 characters from server, 720 added by JavaScript",
    );
  });

  it("explains itself when the raw HTML was unavailable", () => {
    const data = result();
    data.detailedInfo.domDiff = { available: false };

    expect(renderDiff(data).className).toBe("empty");
  });
});
