import { describe, it, expect, beforeEach, vi } from "vitest";

import "../scoring.js";
import "../analyzer.js";

const { describeRenderOrigin } = window;

const empty = { ssrScore: 0, csrScore: 0, indicators: [], signals: [], details: {} };

/**
 * Stub every module the analyzer calls. The two explanatory modules are
 * stubbed like the rest, so these tests cover aggregation rather than
 * re-testing the detectors.
 */
function stubDetectors(overrides = {}) {
  window.analyzeContent = vi.fn(() => overrides.content || empty);
  window.detectFrameworks = vi.fn(() => overrides.frameworks || empty);
  window.analyzeMeta = vi.fn(() => overrides.meta || empty);
  window.analyzePerformance = vi.fn(() => overrides.performance || empty);
  window.detectCSRPatterns = vi.fn(() => overrides.csrPatterns || empty);
  window.detectHybridPatterns = vi.fn(
    () => overrides.hybrid || { hybridScore: 0, indicators: [], signals: [], details: {} },
  );
  window.detectPlatformSignals = vi.fn(() => overrides.platform || empty);
  window.detectDelivery = vi.fn(
    () => overrides.delivery || { ...empty, details: { delivery: { available: false } } },
  );
  window.detectDomDiff = vi.fn(
    () => overrides.diff || { ...empty, details: { domDiff: { available: false } } },
  );
  window.compareInitialVsRendered = vi.fn(async () =>
    "comparison" in overrides ? overrides.comparison : null,
  );
}

function delivery(fields) {
  return {
    ...empty,
    details: { delivery: { available: true, cdn: null, modeLabel: "", ...fields } },
  };
}

describe("describeRenderOrigin", () => {
  it("says the browser built it for any CSR verdict", () => {
    expect(describeRenderOrigin("Client-Side Rendered (CSR)", null, null).id).toBe("browser");
    expect(describeRenderOrigin("Likely CSR/SPA", null, null).id).toBe("browser");
  });

  it("names the delivery path even for a CSR page", () => {
    const origin = describeRenderOrigin(
      "Client-Side Rendered (CSR)",
      { available: true, mode: "edge-cached", modeLabel: "Served from CDN cache", cdn: "Fastly" },
      null,
    );

    expect(origin.id).toBe("browser");
    expect(origin.detail).toContain("Fastly");
  });

  it.each([
    ["prerendered", "build"],
    ["static", "build"],
    ["edge-cached", "edge"],
    ["origin", "server"],
    ["dynamic", "server"],
    ["unknown", "server"],
  ])("maps an SSR page delivered as %s to %s", (mode, expected) => {
    const origin = describeRenderOrigin(
      "Server-Side Rendered (SSR)",
      { available: true, mode, modeLabel: "", cdn: null },
      null,
    );

    expect(origin.id).toBe(expected);
  });

  describe("hybrid pages", () => {
    // "Hybrid" covers two opposite shapes, and the wording has to match the
    // split bar the user is looking at right above it.
    it("calls an islands page server-rendered with client islands", () => {
      const origin = describeRenderOrigin("Hybrid/Islands Architecture", null, {
        available: true,
        serverSharePct: 100,
      });

      expect(origin.id).toBe("islands");
      expect(origin.detail).toMatch(/arrived as HTML/i);
    });

    it("calls a mostly-client hybrid what it is", () => {
      const origin = describeRenderOrigin("Hybrid/Mixed Rendering", null, {
        available: true,
        serverSharePct: 12,
      });

      expect(origin.id).toBe("mixed");
      expect(origin.detail).toContain("12%");
    });

    it("falls back to the neutral description in between", () => {
      const origin = describeRenderOrigin("Hybrid/Mixed Rendering", null, {
        available: true,
        serverSharePct: 55,
      });

      expect(origin.label).toBe("Server shell, client regions");
    });

    it("falls back to the neutral description with no diff data", () => {
      expect(describeRenderOrigin("Hybrid/Mixed Rendering", null, null).id).toBe("mixed");
    });
  });
});

describe("pageAnalyzer signal aggregation", () => {
  beforeEach(() => {
    document.body.innerHTML = "<p>test page</p>";
  });

  it("collects signals from every module, strongest first", async () => {
    stubDetectors({
      content: {
        ...empty,
        ssrScore: 20,
        signals: [{ id: "content.rich", label: "Rich", impact: "ssr", weight: 20 }],
      },
      frameworks: {
        ...empty,
        ssrScore: 30,
        signals: [{ id: "framework.hydrated", label: "Hydrated", impact: "ssr", weight: 30 }],
      },
      delivery: {
        ...delivery({ mode: "edge-cached" }),
        signals: [{ id: "delivery.cdn", label: "CDN", impact: "info", weight: 0 }],
      },
    });

    const result = await window.pageAnalyzer();

    // Weighted signals first, then the zero-weight context — including the
    // analyzer's own note that it could not re-fetch the HTML in this stub.
    expect(result.signals.map((s) => s.id)).toEqual([
      "framework.hydrated",
      "content.rich",
      "delivery.cdn",
      "comparison.unavailable",
    ]);
  });

  it("tolerates a module that emits no signals at all", async () => {
    stubDetectors();

    const result = await window.pageAnalyzer();

    expect(Array.isArray(result.signals)).toBe(true);
  });

  it("keeps explanatory modules out of the scored channels", async () => {
    stubDetectors({
      delivery: {
        ssrScore: 0,
        csrScore: 0,
        indicators: [],
        signals: [{ id: "delivery.mode", label: "Cached", impact: "info", weight: 0 }],
        details: { delivery: { available: true, mode: "edge-cached", modeLabel: "", cdn: null } },
      },
      comparison: {
        rawLength: 900,
        renderedLength: 1000,
        contentRatio: 0.9,
        isLikelyCSR: false,
        isLikelySSR: true,
        isDecisiveCSR: false,
        rawDocument: document.implementation.createHTMLDocument(),
      },
    });

    const result = await window.pageAnalyzer();

    // Only the comparison indicator: delivery contributed a signal, not an
    // indicator, so it cannot inflate the confidence bonus.
    expect(result.indicators).toEqual([
      "raw HTML matches rendered content (0.9x ratio) - SSR",
    ]);
    expect(result.signals.some((s) => s.id === "delivery.mode")).toBe(true);
  });

  it("degrades gracefully when the explanatory modules are absent", async () => {
    stubDetectors();
    delete window.detectDelivery;
    delete window.detectDomDiff;

    const result = await window.pageAnalyzer();

    expect(result.renderType).not.toBe("Analysis Error");
    expect(result.renderOrigin).toBeTruthy();
  });

  it("reports a schema version and a duration for consumers of the export", async () => {
    stubDetectors();

    const result = await window.pageAnalyzer();

    expect(result.schemaVersion).toBe(2);
    expect(typeof result.analysisMs).toBe("number");
  });

  it("keeps the result JSON-serializable with the new fields", async () => {
    stubDetectors({
      delivery: delivery({ mode: "origin" }),
      diff: {
        ...empty,
        details: { domDiff: { available: true, serverSharePct: 80, regions: [] } },
      },
      comparison: {
        rawLength: 900,
        renderedLength: 1000,
        contentRatio: 0.9,
        isLikelyCSR: false,
        isLikelySSR: true,
        isDecisiveCSR: false,
        rawDocument: document.implementation.createHTMLDocument(),
        rawHTML: "<html><body>raw</body></html>",
        responseHeaders: { server: "nginx" },
      },
    });

    const result = await window.pageAnalyzer();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("<html>");
    expect(JSON.parse(serialized).detailedInfo.delivery.mode).toBe("origin");
  });

  it("passes the captured response headers to the delivery detector", async () => {
    const headers = { "x-vercel-cache": "HIT" };
    stubDetectors({
      comparison: {
        rawLength: 900,
        renderedLength: 1000,
        contentRatio: 0.9,
        isLikelyCSR: false,
        isLikelySSR: true,
        isDecisiveCSR: false,
        rawDocument: document.implementation.createHTMLDocument(),
        responseHeaders: headers,
      },
    });

    await window.pageAnalyzer();

    expect(window.detectDelivery).toHaveBeenCalledWith(headers);
  });

  it("passes null headers through when the comparison fetch failed", async () => {
    stubDetectors({ comparison: null });

    await window.pageAnalyzer();

    expect(window.detectDelivery).toHaveBeenCalledWith(null);
    expect(window.detectDomDiff).toHaveBeenCalledWith(null);
  });
});

describe("response headers never reach the result", () => {
  beforeEach(() => {
    document.body.innerHTML = "<p>test page</p>";
  });

  // The result crosses an executeScript boundary into the popup, gets written
  // to local history, and can be exported to a file the user shares. Response
  // headers are read to classify delivery and must not travel with it.
  it("keeps header values and the headers object out of the serialized result", async () => {
    stubDetectors({
      comparison: {
        rawLength: 900,
        renderedLength: 1000,
        contentRatio: 0.9,
        isLikelyCSR: false,
        isLikelySSR: true,
        isDecisiveCSR: false,
        rawDocument: document.implementation.createHTMLDocument(),
        rawHTML: "<html><body>raw</body></html>",
        responseHeaders: {
          "set-cookie": "session=secret",
          authorization: "Bearer topsecret",
          "x-vercel-cache": "HIT",
        },
      },
    });

    const serialized = JSON.stringify(await window.pageAnalyzer());

    expect(serialized).not.toContain("session=secret");
    expect(serialized).not.toContain("topsecret");
    expect(serialized).not.toContain("responseHeaders");
    expect(serialized).not.toContain("rawHTML");
    expect(serialized).not.toContain("rawDocument");
  });
});

describe("decisive-CSR cap arithmetic", () => {
  beforeEach(() => {
    document.body.innerHTML = "<p>test page</p>";
  });

  it("reports the points the cap removed, so the evidence adds up", async () => {
    stubDetectors({
      content: {
        ...empty,
        ssrScore: 50,
        signals: [{ id: "content.rich", label: "Rich", impact: "ssr", weight: 50 }],
      },
      meta: {
        ...empty,
        ssrScore: 40,
        signals: [{ id: "meta.rich", label: "Meta", impact: "ssr", weight: 40 }],
      },
      comparison: {
        rawLength: 10,
        renderedLength: 5000,
        contentRatio: 0,
        isLikelyCSR: true,
        isLikelySSR: false,
        isDecisiveCSR: true,
        rawDocument: document.implementation.createHTMLDocument(),
      },
    });

    const result = await window.pageAnalyzer();
    const cap = result.signals.find((s) => s.id === "comparison.decisiveCsr");

    expect(result.detailedInfo.ssrScore).toBe(10);
    // 90 points of SSR signal, capped to 10, so the cap accounts for −80.
    // Negative and on the SSR side, not positive on the CSR side: the branch
    // takes SSR points away and adds nothing to csrScore, so "CSR +80" would
    // claim evidence that was never found.
    expect(cap.weight).toBe(-80);
    expect(cap.impact).toBe("ssr");
    expect(cap.detail).toContain("90");

    // Both sides now total the scores the verdict actually used. This is the
    // property the sign carries: group the weights by impact and you get the
    // scoring back, cap included.
    const totalFor = (impact) =>
      result.signals.filter((s) => s.impact === impact).reduce((sum, s) => sum + s.weight, 0);
    expect(totalFor("ssr")).toBe(result.detailedInfo.ssrScore);
    expect(totalFor("csr")).toBe(result.detailedInfo.csrScore);

    // A removal that large belongs near the top of the evidence, not below
    // every zero-weight note.
    expect(result.signals.indexOf(cap)).toBeLessThan(2);
  });

  it("does not claim to have removed anything when the score was already low", async () => {
    stubDetectors({
      content: { ...empty, ssrScore: 5 },
      comparison: {
        rawLength: 10,
        renderedLength: 5000,
        contentRatio: 0,
        isLikelyCSR: true,
        isLikelySSR: false,
        isDecisiveCSR: true,
        rawDocument: document.implementation.createHTMLDocument(),
      },
    });

    const result = await window.pageAnalyzer();
    const cap = result.signals.find((s) => s.id === "comparison.decisiveCsr");

    expect(result.detailedInfo.ssrScore).toBe(5);
    expect(cap.weight).toBe(-0);
    expect(cap.detail).toContain("5");
  });
});
