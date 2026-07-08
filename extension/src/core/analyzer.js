/**
 * Main Analyzer Module
 * Orchestrates all detection modules and produces final results
 */

/**
 * Main analysis function - coordinates all detectors
 * Now async to support raw HTML comparison
 * @returns {Promise<Object>} Detection results (no telemetry)
 */
async function pageAnalyzer() {
  const config = window.DETECTOR_CONFIG;

  try {
    // Fetch and compare raw HTML vs rendered DOM first (async - most important
    // for accuracy, and detectors below need the parsed raw document)
    const comparisonResults = await window.compareInitialVsRendered();
    const rawDocument = comparisonResults?.rawDocument || null;

    // Collect results from all detector modules (sync)
    const contentResults = window.analyzeContent();
    const frameworkResults = window.detectFrameworks(rawDocument);
    const metaResults = window.analyzeMeta();
    const performanceResults = window.analyzePerformance();
    const csrPatternResults = window.detectCSRPatterns();
    const hybridResults = window.detectHybridPatterns();

    // Combine all scores
    let ssrScore = 0;
    let csrScore = 0;
    let hybridScore = hybridResults.hybridScore;
    const indicators = [];
    const detailedInfo = {};

    // Add hybrid detection results
    indicators.push(...hybridResults.indicators);
    Object.assign(detailedInfo, { hybrid: hybridResults.details });

    // Add raw HTML comparison results (highest priority signal)
    if (comparisonResults) {
      if (comparisonResults.isLikelyCSR) {
        csrScore += config.scoring.rawVsRenderedMismatch;
        indicators.push(`raw HTML much smaller than rendered (${comparisonResults.contentRatio}x ratio) - CSR`);
      } else if (comparisonResults.isLikelySSR) {
        ssrScore += config.scoring.rawVsRenderedMatch;
        indicators.push(`raw HTML matches rendered content (${comparisonResults.contentRatio}x ratio) - SSR`);
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
    Object.assign(detailedInfo, csrPatternResults.details);

    // Add content analysis results
    ssrScore += contentResults.ssrScore;
    csrScore += contentResults.csrScore;
    indicators.push(...contentResults.indicators);
    Object.assign(detailedInfo, contentResults.details);

    // Add framework analysis results
    ssrScore += frameworkResults.ssrScore;
    csrScore += frameworkResults.csrScore;
    indicators.push(...frameworkResults.indicators);
    Object.assign(detailedInfo, frameworkResults.details);

    // Add meta analysis results
    ssrScore += metaResults.ssrScore;
    csrScore += metaResults.csrScore;
    indicators.push(...metaResults.indicators);
    Object.assign(detailedInfo, metaResults.details);

    // Add performance analysis results
    ssrScore += performanceResults.ssrScore;
    csrScore += performanceResults.csrScore;
    indicators.push(...performanceResults.indicators);
    Object.assign(detailedInfo, performanceResults.details);

    // Decisive CSR: the server sent almost none of the visible text. Every
    // SSR signal above reads the post-JS DOM, where a booted CSR app looks
    // like an SSR page — cap their combined contribution.
    if (comparisonResults?.isDecisiveCSR) {
      ssrScore = Math.min(ssrScore, config.scoring.decisiveCsrSsrCap);
      indicators.push('raw HTML nearly empty vs rendered - SSR signals capped (CSR)');
    }

    if (!comparisonResults) {
      indicators.push('raw HTML comparison unavailable - reduced confidence');
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

    return {
      renderType,
      confidence,
      indicators: indicators.length > 0 ? indicators : ["basic analysis"],
      timestamp: new Date().toISOString(),
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
}
