/**
 * Performance Detector Module
 * Analyzes performance timing metrics
 */

/**
 * Analyze performance metrics for SSR/CSR indicators
 * @returns {Object} Detection results with score and indicators
 */
function analyzePerformance() {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  let ssrScore = 0;
  let csrScore = 0;
  const detailedInfo = {};

  const performanceEntries = performance.getEntriesByType('navigation');

  if (performanceEntries.length > 0) {
    const navTiming = performanceEntries[0];
    const domContentLoadedTime = navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart;
    const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0];

    // Fast initial render suggests SSR
    if (domContentLoadedTime < config.performance.fastDOMReady) {
      ssrScore += config.scoring.fastDOMReady;
      indicators.push("very fast DOM ready (SSR)");
    } else if (domContentLoadedTime > config.performance.slowDOMReady) {
      csrScore += config.scoring.slowDOMReady;
      indicators.push("slow DOM ready (CSR)");
    }

    // FCP timing analysis
    if (firstContentfulPaint && firstContentfulPaint.startTime < config.performance.fastFCP) {
      ssrScore += config.scoring.fastFCP;
      indicators.push("fast first contentful paint (SSR)");
    }

    detailedInfo.timing = {
      domContentLoaded: Math.round(domContentLoadedTime),
      firstContentfulPaint: firstContentfulPaint ? Math.round(firstContentfulPaint.startTime) : null
    };
  }

  return {
    ssrScore,
    csrScore,
    indicators,
    details: detailedInfo
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.analyzePerformance = analyzePerformance;
}
