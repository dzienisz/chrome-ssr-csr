/**
 * Main Analyzer Module
 * Orchestrates all detection modules and produces final results
 */

/**
 * Collect a module's structured signals, tolerating modules that do not emit
 * any. Every signal carries the weight it contributed, so the UI can show the
 * arithmetic behind a verdict instead of a bare percentage.
 *
 * @param {Array} target - Accumulator
 * @param {Object|null} moduleResult - A detector's return value
 */
function collectSignals(target, moduleResult) {
  if (moduleResult && Array.isArray(moduleResult.signals)) {
    target.push(...moduleResult.signals);
  }
}

/**
 * Name where the HTML was produced, combining the rendering verdict with the
 * transport evidence. "SSR" alone cannot tell a page rendered once at build
 * time from one rendered per request — this can.
 *
 * @param {string} renderType - Classification from the scoring module
 * @param {Object|null} delivery - delivery-detector output
 * @param {Object|null} diff - dom-diff-detector output
 * @returns {{id: string, label: string, detail: string}}
 */
function describeRenderOrigin(renderType, delivery, diff) {
  const mode = delivery && delivery.available ? delivery.mode : "unknown";
  const where = delivery && delivery.cdn ? ` via ${delivery.cdn}` : "";
  const serverShare = diff && diff.available ? diff.serverSharePct : null;

  if (/csr|client/i.test(renderType)) {
    return {
      id: "browser",
      label: "Built in the browser",
      detail:
        mode === "unknown"
          ? "The server sent a shell and JavaScript assembled the page on this device."
          : `The document was delivered ${delivery.modeLabel.toLowerCase()}${where}, but its content is assembled by JavaScript on this device.`,
    };
  }

  if (/hybrid|mixed/i.test(renderType)) {
    // "Hybrid" covers two opposite shapes, and calling both of them a server
    // shell with client regions contradicts the split bar right above it.
    // Islands pages ship all their text and hydrate parts of it; the other
    // kind ships a shell and fills most of it in.
    if (serverShare != null && serverShare >= 85) {
      return {
        id: "islands",
        label: "Server-rendered with client islands",
        detail:
          "The visible text arrived as HTML; individual regions are hydrated or resumed in the browser for interactivity.",
      };
    }
    if (serverShare != null && serverShare <= 30) {
      return {
        id: "mixed",
        label: "Mostly built in the browser",
        detail: `Only ${serverShare}% of the visible text came from the server; the rest is assembled after the scripts run.`,
      };
    }
    return {
      id: "mixed",
      label: "Server shell, client regions",
      detail:
        "Part of the page arrived as finished HTML; the rest is produced in the browser after the scripts run.",
    };
  }

  switch (mode) {
    case "prerendered":
    case "static":
      return {
        id: "build",
        label: "Rendered at build time",
        detail: `The HTML was generated before anyone asked for it and served as a static artifact${where}.`,
      };
    case "edge-cached":
      return {
        id: "edge",
        label: "Rendered once, served from cache",
        detail: `A cache${where} answered this request, so no server render happened for this visit.`,
      };
    case "origin":
    case "dynamic":
      return {
        id: "server",
        label: "Rendered per request",
        detail: `The origin server produced this HTML for this request${where}.`,
      };
    default:
      return {
        id: "server",
        label: "Rendered on the server",
        detail:
          "The content arrived as finished HTML. Cache headers were not conclusive about when it was produced.",
      };
  }
}

/**
 * Main analysis function - coordinates all detectors
 * Now async to support raw HTML comparison
 * @returns {Promise<Object>} Detection results (no telemetry)
 */
async function pageAnalyzer() {
  const config = window.DETECTOR_CONFIG;
  const startedAt = typeof performance !== "undefined" ? performance.now() : 0;

  try {
    // Fetch and compare raw HTML vs rendered DOM first (async - most important
    // for accuracy, and detectors below need the parsed raw document)
    const comparisonResults = await window.compareInitialVsRendered();
    const rawDocument = comparisonResults?.rawDocument || null;
    const rawHTML = comparisonResults?.rawHTML || null;

    // Collect results from all detector modules (sync)
    const contentResults = window.analyzeContent();
    const frameworkResults = window.detectFrameworks(rawDocument);
    const metaResults = window.analyzeMeta();
    const performanceResults = window.analyzePerformance();
    const csrPatternResults = window.detectCSRPatterns();
    const hybridResults = window.detectHybridPatterns();
    const platformResults = window.detectPlatformSignals(rawDocument, rawHTML);

    // Explanatory modules. Both are deliberately score-neutral: they describe
    // the verdict rather than voting on it.
    const neutral = { ssrScore: 0, csrScore: 0, indicators: [], signals: [], details: {} };
    const deliveryResults =
      typeof window.detectDelivery === "function"
        ? window.detectDelivery(comparisonResults?.responseHeaders || null)
        : neutral;
    const diffResults =
      typeof window.detectDomDiff === "function"
        ? window.detectDomDiff(rawDocument)
        : neutral;

    // Combine all scores
    let ssrScore = 0;
    let csrScore = 0;
    let hybridScore = hybridResults.hybridScore;
    const indicators = [];
    const signals = [];
    const detailedInfo = {};

    // Add hybrid detection results
    indicators.push(...hybridResults.indicators);
    collectSignals(signals, hybridResults);
    Object.assign(detailedInfo, { hybrid: hybridResults.details });

    // Add raw HTML comparison results (highest priority signal)
    if (comparisonResults) {
      if (comparisonResults.isLikelyCSR) {
        csrScore += config.scoring.rawVsRenderedMismatch;
        indicators.push(`raw HTML much smaller than rendered (${comparisonResults.contentRatio}x ratio) - CSR`);
        signals.push({
          id: "comparison.mismatch",
          label: "The server sent a fraction of what you see",
          impact: "csr",
          weight: config.scoring.rawVsRenderedMismatch,
          detail: `${comparisonResults.rawLength.toLocaleString()} characters of text arrived in the HTML; ${comparisonResults.renderedLength.toLocaleString()} are on screen.`,
        });
      } else if (comparisonResults.isLikelySSR) {
        ssrScore += config.scoring.rawVsRenderedMatch;
        indicators.push(`raw HTML matches rendered content (${comparisonResults.contentRatio}x ratio) - SSR`);
        signals.push({
          id: "comparison.match",
          label: "The served HTML already contained the page",
          impact: "ssr",
          weight: config.scoring.rawVsRenderedMatch,
          detail: `${comparisonResults.rawLength.toLocaleString()} of ${comparisonResults.renderedLength.toLocaleString()} visible characters were in the initial response.`,
        });
      }
      detailedInfo.contentComparison = {
        rawLength: comparisonResults.rawLength,
        renderedLength: comparisonResults.renderedLength,
        ratio: comparisonResults.contentRatio
      };
    }

    // Add CSR pattern detection results
    ssrScore += csrPatternResults.ssrScore;
    csrScore += csrPatternResults.csrScore;
    indicators.push(...csrPatternResults.indicators);
    collectSignals(signals, csrPatternResults);
    Object.assign(detailedInfo, csrPatternResults.details);

    // Add content analysis results
    ssrScore += contentResults.ssrScore;
    csrScore += contentResults.csrScore;
    indicators.push(...contentResults.indicators);
    collectSignals(signals, contentResults);
    Object.assign(detailedInfo, contentResults.details);

    // Add framework analysis results
    ssrScore += frameworkResults.ssrScore;
    csrScore += frameworkResults.csrScore;
    indicators.push(...frameworkResults.indicators);
    collectSignals(signals, frameworkResults);
    Object.assign(detailedInfo, frameworkResults.details);

    // Add meta analysis results
    ssrScore += metaResults.ssrScore;
    csrScore += metaResults.csrScore;
    indicators.push(...metaResults.indicators);
    collectSignals(signals, metaResults);
    Object.assign(detailedInfo, metaResults.details);

    // Add performance analysis results
    ssrScore += performanceResults.ssrScore;
    csrScore += performanceResults.csrScore;
    indicators.push(...performanceResults.indicators);
    collectSignals(signals, performanceResults);
    Object.assign(detailedInfo, performanceResults.details);

    // Add modern platform signals (speculation rules, view transitions,
    // declarative partial updates)
    ssrScore += platformResults.ssrScore;
    csrScore += platformResults.csrScore;
    indicators.push(...platformResults.indicators);
    collectSignals(signals, platformResults);
    Object.assign(detailedInfo, platformResults.details);

    // Explanatory modules contribute no score and no indicators — only
    // signals and their own detail blocks.
    collectSignals(signals, deliveryResults);
    collectSignals(signals, diffResults);
    Object.assign(detailedInfo, deliveryResults.details);
    Object.assign(detailedInfo, diffResults.details);

    // Decisive CSR: the server sent almost none of the visible text. Every
    // SSR signal above reads the post-JS DOM, where a booted CSR app looks
    // like an SSR page — cap their combined contribution.
    if (comparisonResults?.isDecisiveCSR) {
      ssrScore = Math.min(ssrScore, config.scoring.decisiveCsrSsrCap);
      indicators.push('raw HTML nearly empty vs rendered - SSR signals capped (CSR)');
      signals.push({
        id: "comparison.decisiveCsr",
        label: "Server-side signals capped",
        impact: "csr",
        weight: 0,
        detail:
          "The served HTML held under 10% of the visible text, so signals read from the post-JavaScript DOM were not allowed to outvote that.",
      });
    }

    if (!comparisonResults) {
      indicators.push('raw HTML comparison unavailable - reduced confidence');
      signals.push({
        id: "comparison.unavailable",
        label: "Could not re-fetch the page HTML",
        impact: "info",
        weight: 0,
        detail:
          "Without the pre-JavaScript HTML, every remaining signal is read from the live DOM, so the verdict is capped and reported as “likely”.",
      });
    }

    // Calculate final classification
    const classification = window.calculateClassification(ssrScore, csrScore, hybridScore, indicators);
    let renderType = classification.renderType;
    let confidence = classification.confidence;

    // Comparison unavailable: the highest-priority signal is missing and the
    // remaining signals are rendered-DOM based, so cap confidence and avoid
    // definitive verdicts.
    if (!comparisonResults) {
      confidence = Math.min(confidence, config.confidence.maxConfidenceNoComparison);
      if (renderType === 'Server-Side Rendered (SSR)') {
        renderType = 'Likely SSR with Hydration';
      } else if (renderType === 'Client-Side Rendered (CSR)') {
        renderType = 'Likely CSR/SPA';
      }
    }

    const renderOrigin = describeRenderOrigin(
      renderType,
      deliveryResults.details && deliveryResults.details.delivery,
      diffResults.details && diffResults.details.domDiff,
    );

    // Strongest first, so a reader sees the evidence that decided the verdict
    // before the supporting detail. Purely informational signals sort last.
    const orderedSignals = signals
      .slice()
      .sort((a, b) => (b.weight || 0) - (a.weight || 0));

    return {
      renderType,
      confidence,
      indicators: indicators.length > 0 ? indicators : ["basic analysis"],
      signals: orderedSignals,
      renderOrigin,
      timestamp: new Date().toISOString(),
      analysisMs:
        typeof performance !== "undefined"
          ? Math.round(performance.now() - startedAt)
          : null,
      schemaVersion: 2,
      detailedInfo: {
        ssrScore,
        csrScore,
        ssrPercentage: classification.ssrPercentage,
        hybridScore: classification.hybridScore,
        totalIndicators: classification.indicatorCount,
        ...detailedInfo
      }
    };
  } catch (error) {
    console.error('CSR/SSR Detector: Analysis failed', error);
    return {
      renderType: "Analysis Error",
      confidence: 0,
      indicators: ["analysis failed - " + error.message],
      signals: [],
      renderOrigin: null,
      schemaVersion: 2,
      detailedInfo: {
        ssrScore: 0,
        csrScore: 0,
        ssrPercentage: 50,
        hybridScore: 0,
        totalIndicators: 0,
        error: error.message
      }
    };
  }
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.pageAnalyzer = pageAnalyzer;
  window.describeRenderOrigin = describeRenderOrigin;
}
