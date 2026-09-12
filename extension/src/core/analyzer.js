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
          : // The delivery label is a noun phrase ("Uncacheable response",
            // "Served from CDN cache"), so it gets its own clause rather than
            // being spliced into the middle of a sentence.
            `${delivery.modeLabel}${where} — but the content you see is assembled by JavaScript on this device.`,
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

  // Say only what the headers prove. A cache hit proves a cache answered this
  // visit — not that the HTML was rendered exactly once; a miss proves the
  // request reached the origin — not that the origin generated anything for
  // it, since a static file behind a cold cache produces the same miss. Only a
  // prerender header names generation time outright.
  switch (mode) {
    case "prerendered":
      return {
        id: "build",
        label: "Rendered ahead of the request",
        detail: `The response is marked as a prerender: the HTML existed before this visit and was served as a static artifact${where}.`,
      };
    case "static":
      return {
        id: "build",
        label: "Served as a static file",
        detail: `The document arrives with a validator and no cache negotiation, the way a file on disk is served${where}.`,
      };
    case "edge-cached":
      return {
        id: "edge",
        label: "Served from a cache",
        detail: `A cache${where} answered this request, so the origin did no work for this visit. When the cached copy was produced is not something the headers say.`,
      };
    case "origin":
      return {
        id: "server",
        label: "Answered by the origin",
        detail: `The request reached the origin server${where} rather than being answered by a cache.`,
      };
    case "dynamic":
      return {
        id: "server",
        label: "Not reusable by caches",
        detail: `Cache headers keep shared caches from reusing this document${where}, so every visitor reaches the origin.`,
      };
    default:
      return {
        id: "server",
        label: "Rendered on the server",
        detail:
          "The content arrived as finished HTML. The response headers say nothing conclusive about when or where it was produced.",
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
      const cappedFrom = ssrScore;
      ssrScore = Math.min(ssrScore, config.scoring.decisiveCsrSsrCap);
      const removed = cappedFrom - ssrScore;
      indicators.push('raw HTML nearly empty vs rendered - SSR signals capped (CSR)');
      // A negative SSR weight, not a positive CSR one. The branch takes points
      // away from the SSR side; it adds nothing to the CSR side, and labelling
      // the removal "CSR +80" would claim evidence that does not exist. With
      // the sign, the SSR signals still total the score the verdict used —
      // which is the whole point of showing it at all.
      signals.push({
        id: "comparison.decisiveCsr",
        label: "Server-side signals capped",
        impact: "ssr",
        weight: -removed,
        detail:
          `The served HTML held under 10% of the visible text, so the SSR signals above — read from the post-JavaScript DOM — were cut from ${cappedFrom} to ${ssrScore} rather than allowed to outvote that.`,
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
    // before the supporting detail. By magnitude, not by value: a signal that
    // removed 80 points is one of the most important facts about the verdict,
    // and ordering by raw weight would bury it below every zero-weight note.
    // Purely informational signals still sort last.
    //
    // No tiebreak on purpose: Array.prototype.sort has been required to be
    // stable since ES2019, so equal weights keep the order the modules were
    // aggregated in above — comparison, then the scoring detectors, then
    // delivery and the region diff. That grouping is meaningful; sorting the
    // zero-weight signals alphabetically by id would scatter it.
    const orderedSignals = signals
      .slice()
      .sort((a, b) => Math.abs(b.weight || 0) - Math.abs(a.weight || 0));

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
