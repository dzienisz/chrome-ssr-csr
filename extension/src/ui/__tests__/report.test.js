import { describe, it, expect, beforeEach } from "vitest";

import "../jev.js";
import "../report.js";

const {
  verdictKind,
  verdictBadge,
  confidenceLevelLabel,
  historyConfidenceText,
  renderVerdict,
  renderOverview,
  renderServerViewCard,
  renderSignals,
  renderDelivery,
  renderDiff,
  describeDecision,
} = window.SSRReport;

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

function sampleDecision(overrides = {}) {
  return {
    algorithmVersion: 3,
    gate: { passed: true, reason: null, visibleChars: 4210 },
    measurement: {
      source: "fetch",
      measure: "words",
      value: 0.11,
      matched: 22,
      total: 193,
      hiddenWordCount: 0,
      snapshotReason: null,
      band: "csr",
      bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
      points: { side: "csr", value: 40 },
    },
    cap: null,
    score: { ssr: 85, csr: 20, ssrPercentage: 81, hybridScore: 0 },
    rule: "ssr",
    threshold: 75,
    downgraded: false,
    confidenceCap: null,
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

describe("describeDecision", () => {
  it("describes the fetch CSR path and decisive cap with the recorded values", () => {
    expect(
      describeDecision(
        sampleDecision({
          cap: { kind: "decisive", from: 45, to: 10 },
          score: { ssr: 10, csr: 40, ssrPercentage: 20, hybridScore: 0 },
          rule: "csr",
          threshold: 25,
        }),
      ),
    ).toEqual([
      {
        id: "gate",
        label: "Page check",
        detail: "Passed: 4,210 characters of visible text.",
      },
      {
        id: "measurement",
        label: "Measurement",
        detail: "22 of 193 visible words (11%) were in the HTML the server sent.",
      },
      {
        id: "rule",
        label: "Comparison rule",
        detail:
          "Under 20% → client-rendered evidence: CSR +40. Server-side signals read after JavaScript were capped from 45 to 10.",
      },
      {
        id: "score",
        label: "Score",
        detail: "SSR 10 vs CSR 40 → 20% SSR · hybrid score 0.",
      },
      {
        id: "verdict",
        label: "Verdict",
        detail: "SSR share 20% ≤ 25% → Client-Side Rendered (CSR).",
      },
      {
        id: "algorithm",
        label: "Algorithm",
        detail: "Algorithm v3 · every signal is in the Evidence section",
      },
    ]);
  });

  it("adds a measurement-quality confidence step before the algorithm footer", () => {
    const steps = describeDecision(
      sampleDecision({
        measurement: {
          source: "fetch",
          measure: "words",
          value: 0.11,
          matched: 22,
          total: 50,
          snapshotReason: null,
          band: "csr",
          bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
          points: { side: "csr", value: 40 },
        },
        rule: "csr",
        threshold: 25,
        confidenceLevel: "medium",
        confidenceLevelReason: "near-threshold",
        confidenceScore: 75,
        confidenceLevels: { minWords: 50, clearCsr: 0.1, clearSsr: 0.8 },
      }),
    );
    const confidence = steps.find((step) => step.id === "confidence");

    expect(confidence).toEqual({
      id: "confidence",
      label: "Confidence",
      detail:
        "Medium — 11% is near the 20% threshold. Score 75. Levels are rules about measurement quality, not a calibrated probability.",
    });
    expect(steps.findIndex((step) => step.id === "confidence")).toBeLessThan(
      steps.findIndex((step) => step.id === "algorithm"),
    );
  });

  it("reports hidden words only when the omitted count is positive", () => {
    const measurementFor = (hiddenWordCount) =>
      describeDecision(
        sampleDecision({
          measurement: {
            ...sampleDecision().measurement,
            hiddenWordCount,
          },
        }),
      ).find((step) => step.id === "measurement").detail;

    expect(measurementFor(0)).toBe(
      "22 of 193 visible words (11%) were in the HTML the server sent.",
    );
    expect(measurementFor(1712)).toBe(
      "22 of 193 visible words (11%) were in the HTML the server sent. 1,712 words in hidden elements were not counted.",
    );
  });

  it.each([
    [
      "no measurement",
      "no-measurement",
      null,
      "Low — no HTML comparison. Score 75.",
    ],
    [
      "contradictory verdict",
      "verdict-contradicts-measurement",
      sampleDecision().measurement,
      "Low — CSR coverage (11%) conflicts with the verdict. Score 75.",
    ],
    [
      "neutral band",
      "inconclusive-band",
      {
        ...sampleDecision().measurement,
        value: 0.55,
        band: "neutral",
        bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
      },
      "Low — 55% is in the inconclusive 40–70% range. Score 75.",
    ],
    [
      "few fetch words",
      "few-words",
      { ...sampleDecision().measurement, total: 49 },
      "Low — only 49 visible words; minimum 50. Score 75.",
    ],
    [
      "short parser snapshot",
      "few-words",
      {
        ...sampleDecision().measurement,
        source: "parser-snapshot",
        measure: "length",
        matched: 100,
        total: 120,
        band: "short",
      },
      "Low — only 120 parser-snapshot characters. Score 75.",
    ],
    [
      "length-only parser snapshot",
      "length-only",
      {
        ...sampleDecision().measurement,
        source: "parser-snapshot",
        measure: "length",
        matched: 1200,
        total: 5400,
        band: "ssr",
      },
      "Medium — the parser snapshot compares text length, not words. Score 75.",
    ],
    [
      "partial band",
      "partial-band",
      {
        ...sampleDecision().measurement,
        value: 0.3,
        band: "partial",
        bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
      },
      "Medium — 30% coverage is in the partial 20–40% range. Score 75.",
    ],
    [
      "near threshold",
      "near-threshold",
      sampleDecision().measurement,
      "Medium — 11% is near the 20% threshold. Score 75.",
    ],
    [
      "clear CSR",
      "clear-measurement",
      {
        ...sampleDecision().measurement,
        value: 0.1,
      },
      "High — 10% coverage is at or below the 10% CSR cutoff. Score 75.",
    ],
    [
      "clear SSR",
      "clear-measurement",
      {
        ...sampleDecision().measurement,
        value: 0.8,
        matched: 160,
        total: 200,
        band: "ssr",
      },
      "High — 80% coverage is at or above the 80% SSR cutoff. Score 75.",
    ],
  ])("explains %s confidence from the recorded measurement", (_, reason, measurement, expected) => {
    const steps = describeDecision(
      sampleDecision({
        measurement,
        confidenceLevel:
          reason === "clear-measurement"
            ? "high"
            : ["length-only", "partial-band", "near-threshold"].includes(reason)
              ? "medium"
              : "low",
        confidenceLevelReason: reason,
        confidenceScore: 75,
        confidenceLevels: { minWords: 50, clearCsr: 0.1, clearSsr: 0.8 },
      }),
    );
    const detail = steps.find((step) => step.id === "confidence").detail;

    expect(detail).toContain(expected);
    expect(detail).toContain(
      "Levels are rules about measurement quality, not a calibrated probability.",
    );
  });

  it("renders the confidence explanation in the Overview Why card", () => {
    const overview = renderOverview(
      result({
        decision: sampleDecision({
          confidenceLevel: "medium",
          confidenceLevelReason: "near-threshold",
          confidenceScore: 75,
          confidenceLevels: { minWords: 50, clearCsr: 0.1, clearSsr: 0.8 },
        }),
      }),
    );

    expect(overview.textContent).toContain("Confidence");
    expect(overview.textContent).toContain("Score 75");
    expect(overview.textContent).toContain(
      "Levels are rules about measurement quality, not a calibrated probability.",
    );
  });

  it("describes partial coverage and the partial cap", () => {
    const steps = describeDecision(
      sampleDecision({
        measurement: {
          source: "fetch",
          measure: "words",
          value: 0.39,
          matched: 75,
          total: 193,
          snapshotReason: null,
          band: "partial",
          bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
          points: { side: "csr", value: 40 },
        },
        cap: { kind: "partial", from: 85, to: 50 },
        score: { ssr: 50, csr: 40, ssrPercentage: 56, hybridScore: 0 },
        rule: "balancedHybrid",
        threshold: { min: 41, max: 59 },
      }),
    );

    expect(steps[2].detail).toBe(
      "20–40% → partly client-rendered: CSR +40. Server-side signals read after JavaScript were capped from 85 to 50.",
    );
    expect(steps[4].detail).toBe(
      "SSR share 56% with SSR 50 and CSR 40 fell in the 41–59% hybrid band → Hybrid.",
    );
  });

  it("describes the neutral comparison band without comparison points", () => {
    const steps = describeDecision(
      sampleDecision({
        measurement: {
          source: "fetch",
          measure: "words",
          value: 0.55,
          matched: 106,
          total: 193,
          snapshotReason: null,
          band: "neutral",
          bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
          points: null,
        },
      }),
    );

    expect(steps[2].detail).toBe("40–70% → inconclusive, no points either way.");
  });

  it("describes the SSR band and its comparison points", () => {
    const steps = describeDecision(
      sampleDecision({
        measurement: {
          source: "fetch",
          measure: "words",
          value: 0.8,
          matched: 154,
          total: 193,
          snapshotReason: null,
          band: "ssr",
          bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
          points: { side: "ssr", value: 30 },
        },
      }),
    );

    expect(steps[2].detail).toBe(
      "Over 70% → server-rendered evidence: SSR +30.",
    );
  });

  it("describes short text when no comparison flag fired", () => {
    const steps = describeDecision(
      sampleDecision({
        measurement: {
          source: "fetch",
          measure: "words",
          value: 0.5,
          matched: 8,
          total: 16,
          snapshotReason: null,
          band: "short",
          bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
          points: null,
        },
      }),
    );

    expect(steps[2].detail).toBe("Too little text for the comparison to count.");
  });

  it.each([
    [
      "title",
      "1,200 of 5,400 characters were on the page when the HTML finished parsing. The second HTML copy had a different title, so it was treated as a different page.",
    ],
    [
      "no-shared-words",
      "1,200 of 5,400 characters were on the page when the HTML finished parsing. The second HTML copy shared no words with the page on screen, so it was treated as a different document.",
    ],
    [
      "refused",
      "1,200 of 5,400 characters were on the page when the HTML finished parsing. The site refused a second copy of its HTML.",
    ],
  ])("explains parser-snapshot reason %s", (snapshotReason, detail) => {
    const steps = describeDecision(
      sampleDecision({
        measurement: {
          source: "parser-snapshot",
          measure: "length",
          value: 0.22,
          matched: 1200,
          total: 5400,
          snapshotReason,
          band: "partial",
          bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
          points: { side: "csr", value: 40 },
        },
      }),
    );

    expect(steps[1].detail).toBe(detail);
  });

  it("explains missing comparison, the downgrade, and its confidence cap", () => {
    const steps = describeDecision(
      sampleDecision({
        measurement: null,
        score: { ssr: 85, csr: 20, ssrPercentage: 81, hybridScore: 0 },
        rule: "ssr",
        threshold: 75,
        downgraded: true,
        confidenceCap: 60,
      }),
    );

    expect(steps[1].detail).toBe(
      "The page HTML could not be fetched again, so nothing was measured.",
    );
    expect(steps[2].detail).toBe(
      "No content-comparison rule could be applied.",
    );
    expect(steps[4].detail).toBe(
      "SSR share 81% ≥ 75% → Server-Side Rendered (SSR). Without a comparison, the definitive verdict was downgraded to Likely and confidence was capped at 60%.",
    );
  });

  it("states that strong hybrid markers win regardless of measurement", () => {
    const steps = describeDecision(
      sampleDecision({
        score: { ssr: 85, csr: 20, ssrPercentage: 81, hybridScore: 35 },
        rule: "strongHybrid",
        threshold: 30,
      }),
    );

    expect(steps[4].detail).toBe(
      "Hybrid score ≥ 30 (island/partial-hydration markers) → Hybrid, regardless of the measurement.",
    );
  });

  it("returns only the gate step when the quality check failed", () => {
    expect(
      describeDecision(
        sampleDecision({
          gate: {
            passed: false,
            reason: "too-little-text",
            visibleChars: 120,
          },
        }),
      ),
    ).toEqual([
      {
        id: "gate",
        label: "Page check",
        detail:
          "Only 120 visible characters were available, so the page could not be assessed.",
      },
    ]);
  });
});

describe("renderVerdict", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the verdict, the badge and the confidence", () => {
    const node = renderVerdict(result());
    const dial = node.querySelector(".dial");

    expect(node.dataset.kind).toBe("ssr");
    expect(node.querySelector(".verdict-label").textContent).toBe("Server-Side Rendered (SSR)");
    expect(node.querySelector(".verdict-kind").textContent).toBe("SSR");
    expect(node.querySelector(".dial-value").textContent).toBe("92");
    expect(dial.style.getPropertyValue("--value")).toBe("92");
    expect(dial.getAttribute("aria-label")).toBe("92% confidence");
    expect(dial.getAttribute("tabindex")).toBeNull();
    expect(dial.getAttribute("aria-describedby")).toBeNull();
  });

  it("shows the qualitative confidence level with an accessible label and styling data", () => {
    const node = renderVerdict(result({ confidence: 75, confidenceLevel: "medium" }));
    const dial = node.querySelector(".dial");

    expect(node.querySelector(".dial-value").textContent).toBe("Medium");
    expect(dial.dataset.level).toBe("medium");
    expect(dial.getAttribute("tabindex")).toBe("0");
    expect(dial.getAttribute("aria-label")).toBe(
      "Medium confidence. How clearly the page text could be measured.",
    );
    const tooltipId = dial.getAttribute("aria-describedby");
    const tooltip = [...node.querySelectorAll('[role="tooltip"]')].find(
      (element) => element.id === tooltipId,
    );
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toBe("How clearly the page text could be measured.");
    expect(dial.style.getPropertyValue("--value")).toBe("100");
  });

  it("shows the 193-word skeleton as medium / near-threshold", () => {
    const skeletonResult = result({
      confidenceLevel: "medium",
      confidenceLevelReason: "near-threshold",
      decision: sampleDecision({
        measurement: {
          ...sampleDecision().measurement,
          total: 193,
          value: 0.11,
        },
        confidenceLevel: "medium",
        confidenceLevelReason: "near-threshold",
        confidenceScore: 75,
        confidenceLevels: { minWords: 50, clearCsr: 0.1, clearSsr: 0.8 },
      }),
    });
    const hero = renderVerdict(skeletonResult);
    const overview = renderOverview(skeletonResult);

    expect(hero.querySelector(".dial-value").textContent).toBe("Medium");
    expect(overview.textContent).toContain("Medium — 11% is near the 20% threshold.");
  });

  it("formats history with a level and falls back to the numeric confidence", () => {
    expect(historyConfidenceText({ confidenceLevel: "high", confidence: 95 })).toBe(
      "High · ",
    );
    expect(historyConfidenceText({ confidence: 75 })).toBe("75% · ");
    expect(historyConfidenceText({ assessable: false, confidence: 0 })).toBe("");
    expect(confidenceLevelLabel("low")).toBe("Low");
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

  it("renders the decision path when legacy top signals are disabled", () => {
    const container = document.createElement("div");
    container.appendChild(
      renderOverview(result({ decision: sampleDecision() }), { topSignals: false }),
    );

    const whyCard = [...container.querySelectorAll(".card")].find(
      (card) => card.querySelector(".card-title")?.textContent === "Why this verdict",
    );
    expect(whyCard).toBeDefined();
    expect(whyCard.textContent).toContain("Passed: 4,210 characters of visible text.");
    expect(whyCard.textContent).toContain(
      "22 of 193 visible words (11%) were in the HTML the server sent.",
    );
    expect(whyCard.textContent).not.toContain(
      "The served HTML already contained the page",
    );
  });

  it("omits the legacy top signals and decision card for old results when disabled", () => {
    const container = document.createElement("div");
    container.appendChild(renderOverview(result(), { topSignals: false }));

    expect(container.textContent).not.toContain("The served HTML already contained the page");
    expect(
      [...container.querySelectorAll(".card-title")].some(
        (title) => title.textContent === "Why this verdict",
      ),
    ).toBe(false);
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

  it("renders an idle server view button and wires its handler", () => {
    const onOpen = vi.fn();
    const card = renderServerViewCard({ status: "idle", onOpen });
    const button = card.querySelector("button");

    expect(button.textContent).toBe("See server view");
    expect(button.disabled).toBe(false);
    button.click();
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("renders a disabled opening state and an accessible error", () => {
    const loading = renderServerViewCard({ status: "loading" });
    const button = loading.querySelector("button");

    expect(button.textContent).toBe("Opening…");
    expect(button.disabled).toBe(true);

    const failed = renderServerViewCard({
      status: "error",
      errorMessage: "The page changed.",
    });
    expect(failed.querySelector(".server-view-error").getAttribute("aria-live")).toBe("polite");
    expect(failed.textContent).toContain("Couldn't open the server view (The page changed.)");
  });

  it("includes the server view card in an overview only when requested", () => {
    const plain = document.createElement("div");
    plain.appendChild(renderOverview(result()));
    expect(plain.querySelector(".server-view-card")).toBeNull();

    const withServerView = document.createElement("div");
    withServerView.appendChild(
      renderOverview(result(), { serverView: { status: "idle", onOpen: vi.fn() } }),
    );
    expect(withServerView.querySelector(".server-view-card")).not.toBeNull();
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
