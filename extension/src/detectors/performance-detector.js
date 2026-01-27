/**
 * Performance Detector Module
 * Analyzes performance timing metrics
 */

/**
 * Analyze performance metrics for SSR/CSR indicators
 *
 * Key insight: CSR apps have FAST DOMContentLoaded because initial HTML is minimal.
 * The content is then loaded via JavaScript, resulting in slow FCP.
 * SSR apps have content in the initial HTML, so FCP is fast relative to DOM ready.
 *
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
    const fcpTime = firstContentfulPaint ? firstContentfulPaint.startTime : null;

    // Key CSR indicator: Fast DOM ready + slow FCP
    // This means the initial HTML loaded quickly (because it's minimal),
    // but content took a while to appear (because it was loaded via JavaScript)
    if (domContentLoadedTime < config.performance.fastDOMReady &&
        fcpTime && fcpTime > config.performance.slowFCP) {
      csrScore += config.scoring.fastDomSlowFcp;
      indicators.push("fast DOM ready but slow FCP (CSR pattern)");
    }
    // Fast FCP with reasonable DOM time suggests SSR (content was in initial HTML)
    else if (fcpTime && fcpTime < config.performance.fastFCP) {
      ssrScore += config.scoring.fastFCP;
      indicators.push("fast first contentful paint (SSR)");
    }

    // Very slow DOM ready can indicate heavy server processing (SSR) or slow network
    // This is less reliable, so we use lower weight
    if (domContentLoadedTime > config.performance.slowDOMReady) {
      // Slow DOM + slow FCP = might be slow SSR or network issues
      // Slow DOM + fast FCP = SSR (server took time, but content was ready)
      if (fcpTime && fcpTime < config.performance.fastFCP) {
        ssrScore += 10;
        indicators.push("slow DOM but fast paint (SSR)");
      }
    }

    detailedInfo.timing = {
      domContentLoaded: Math.round(domContentLoadedTime),
      firstContentfulPaint: fcpTime ? Math.round(fcpTime) : null
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
