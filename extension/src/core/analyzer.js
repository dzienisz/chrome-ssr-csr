/**
 * Main Analyzer Module
 * Orchestrates all detection modules and produces final results
 */

/**
 * Main analysis function - coordinates all detectors
 * Now async to support raw HTML comparison
 * @returns {Promise<Object>} Complete analysis results
 */
async function pageAnalyzer() {
  const config = window.DETECTOR_CONFIG;

  try {
    // Collect results from all detector modules (sync)
    const contentResults = window.analyzeContent();
    const frameworkResults = window.detectFrameworks();
    const metaResults = window.analyzeMeta();
    const performanceResults = window.analyzePerformance();
    const csrPatternResults = window.detectCSRPatterns();
    const hybridResults = window.detectHybridPatterns();

    // Fetch and compare raw HTML vs rendered DOM (async - most important for accuracy)
    const comparisonResults = await window.compareInitialVsRendered();

    // Phase 1: Collect Core Web Vitals (async, with timeout to prevent blocking)
    const coreWebVitalsPromise = typeof window.collectCoreWebVitals === 'function' 
      ? Promise.race([
          window.collectCoreWebVitals(),
          new Promise(resolve => setTimeout(() => resolve(null), 500)) // 500ms max
        ])
      : Promise.resolve(null);
    
    const coreWebVitals = await coreWebVitalsPromise;

    // Phase 1: Detect page type (sync)
    const pageType = typeof window.detectPageType === 'function'
      ? window.detectPageType()
      : 'other';

    // Phase 1: Collect device info (sync)
    const deviceInfo = typeof window.getDeviceInfoForTelemetry === 'function'
      ? window.getDeviceInfoForTelemetry()
      : null;

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

    // Calculate final classification
    const classification = window.calculateClassification(ssrScore, csrScore, hybridScore, indicators);

    return {
      renderType: classification.renderType,
      confidence: classification.confidence,
      indicators: indicators.length > 0 ? indicators : ["basic analysis"],
      
      // Phase 1: Add new data fields
      coreWebVitals,
      pageType,
      deviceInfo,
      
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
