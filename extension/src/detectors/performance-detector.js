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
  const signals = [];
  let ssrScore = 0;
  let csrScore = 0;
  const detailedInfo = {};

  const performanceEntries = performance.getEntriesByType('navigation');

  if (performanceEntries.length > 0) {
    const navTiming = performanceEntries[0];
    const domContentLoadedTime = navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart;
    const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0];

    // A prerendered document's timings are measured from when the prerender
    // started, not from when the user navigated: paint often lands *before*
    // activation, so raw FCP reads as impossibly fast. Rebase on
    // activationStart, the way the Paint Timing spec prescribes.
    const navContext = typeof window.getNavigationContext === 'function'
      ? window.getNavigationContext()
      : { activationStart: 0, deliveryType: '', timingIsReliable: true };
    const rawFcp = firstContentfulPaint ? firstContentfulPaint.startTime : null;
    const fcpTime = rawFcp != null
      ? Math.max(0, rawFcp - navContext.activationStart)
      : null;

    // A prefetched navigation paid its network cost earlier, so both the
    // "fast DOM" and "fast FCP" branches below would fire on architecture
    // that has nothing to do with where the HTML was rendered. Skip the
    // timing heuristics entirely rather than score them wrong.
    if (!navContext.timingIsReliable) {
      indicators.push('speculative navigation - timing signals skipped');
      signals.push({
        id: 'performance.speculative',
        label: 'Timing signals skipped',
        impact: 'info',
        weight: 0,
        detail: 'This document was prerendered or prefetched, so its timings describe the speculation, not this visit.'
      });
      detailedInfo.timing = {
        domContentLoaded: Math.round(domContentLoadedTime),
        firstContentfulPaint: fcpTime != null ? Math.round(fcpTime) : null,
        adjustedForActivation: navContext.activationStart > 0,
        deliveryType: navContext.deliveryType
      };
      return { ssrScore, csrScore, indicators, signals, details: detailedInfo };
    }

    // Key CSR indicator: Fast DOM ready + slow FCP
    // This means the initial HTML loaded quickly (because it's minimal),
    // but content took a while to appear (because it was loaded via JavaScript)
    if (domContentLoadedTime < config.performance.fastDOMReady &&
        fcpTime && fcpTime > config.performance.slowFCP) {
      csrScore += config.scoring.fastDomSlowFcp;
      indicators.push("fast DOM ready but slow FCP (CSR pattern)");
      signals.push({
        id: 'performance.fastDomSlowFcp',
        label: 'Empty document parsed fast, painted late',
        impact: 'csr',
        weight: config.scoring.fastDomSlowFcp,
        detail: `DOM ready in ${Math.round(domContentLoadedTime)}ms but nothing painted until ${Math.round(fcpTime)}ms — the browser had to build the page.`
      });
    }
    // Fast FCP with reasonable DOM time suggests SSR (content was in initial HTML)
    else if (fcpTime && fcpTime < config.performance.fastFCP) {
      ssrScore += config.scoring.fastFCP;
      indicators.push("fast first contentful paint (SSR)");
      signals.push({
        id: 'performance.fastFcp',
        label: `First paint at ${Math.round(fcpTime)}ms`,
        impact: 'ssr',
        weight: config.scoring.fastFCP,
        detail: 'Content appeared almost immediately, which means it was in the HTML rather than assembled by script.'
      });
    }

    // Very slow DOM ready can indicate heavy server processing (SSR) or slow network
    // This is less reliable, so we use lower weight
    if (domContentLoadedTime > config.performance.slowDOMReady) {
      // Slow DOM + slow FCP = might be slow SSR or network issues
      // Slow DOM + fast FCP = SSR (server took time, but content was ready)
      if (fcpTime && fcpTime < config.performance.fastFCP) {
        ssrScore += 10;
        indicators.push("slow DOM but fast paint (SSR)");
        signals.push({
          id: 'performance.slowDomFastPaint',
          label: 'Server took time, content was ready',
          impact: 'ssr',
          weight: 10,
          detail: `DOM ready took ${Math.round(domContentLoadedTime)}ms but paint landed at ${Math.round(fcpTime)}ms.`
        });
      }
    }

    detailedInfo.timing = {
      domContentLoaded: Math.round(domContentLoadedTime),
      firstContentfulPaint: fcpTime != null ? Math.round(fcpTime) : null,
      adjustedForActivation: navContext.activationStart > 0,
      deliveryType: navContext.deliveryType
    };
  }

  return {
    ssrScore,
    csrScore,
    indicators,
    signals,
    details: detailedInfo
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.analyzePerformance = analyzePerformance;
}
