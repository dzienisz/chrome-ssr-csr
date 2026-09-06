/**
 * Performance Collector
 * Collects Core Web Vitals and performance metrics
 */

/**
 * Get Largest Contentful Paint (LCP)
 * Target: < 2.5s (Good), < 4.0s (Needs Improvement), >= 4.0s (Poor)
 */
function getLargestContentfulPaint() {
  return new Promise((resolve) => {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        observer.disconnect();
        resolve(lastEntry.renderTime || lastEntry.loadTime);
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      // Buffered entries arrive almost immediately; 500ms is a generous grace
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 500);
    } catch (error) {
      console.error('[Performance] LCP error:', error);
      resolve(null);
    }
  });
}

/**
 * Get Cumulative Layout Shift (CLS)
 * Target: < 0.1 (Good), < 0.25 (Needs Improvement), >= 0.25 (Poor)
 */
function getCumulativeLayoutShift() {
  return new Promise((resolve) => {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });

      // Buffered entries cover the page's history; a short window suffices
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 300);
    } catch (error) {
      console.error('[Performance] CLS error:', error);
      resolve(null);
    }
  });
}

/**
 * Get Interaction to Next Paint (INP)
 * Target: < 200ms (Good), < 500ms (Needs Improvement), >= 500ms (Poor)
 *
 * Replaces FID, which stopped being a Core Web Vital in March 2024. Like the
 * FID collector before it, this can only report interactions the user already
 * made before opening the popup — clicking the extension icon is not a page
 * interaction — so null is a normal result on a freshly loaded page.
 *
 * Google's INP is a high percentile over a session; with the handful of
 * buffered interactions available here, the worst one is the honest summary.
 */
function getInteractionToNextPaint() {
  return new Promise((resolve) => {
    try {
      let worst = null;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // interactionId 0 means the event was not part of a discrete
          // interaction (e.g. a scroll-driven event) and is out of scope.
          if (!entry.interactionId) continue;
          if (worst === null || entry.duration > worst) worst = entry.duration;
        }
      });
      observer.observe({ type: 'event', buffered: true, durationThreshold: 40 });

      // Buffered entries arrive almost immediately
      setTimeout(() => {
        observer.disconnect();
        resolve(worst);
      }, 300);
    } catch (error) {
      console.error('[Performance] INP error:', error);
      resolve(null);
    }
  });
}

/**
 * Get Long Animation Frame stats (Chrome 123+)
 *
 * LoAF supersedes the Long Tasks API used for TBT: it measures whole janky
 * frames rather than single tasks, which is what a booting client-rendered
 * app actually produces. Only aggregate numbers are kept — LoAF entries carry
 * script sourceURLs, and the telemetry payload is anonymized to origin.
 */
function getLongAnimationFrames() {
  return new Promise((resolve) => {
    const supported = typeof PerformanceObserver !== 'undefined' &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes('long-animation-frame');

    if (!supported) {
      resolve(null);
      return;
    }

    try {
      let count = 0;
      let blockingDuration = 0;
      let longestFrame = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          count++;
          blockingDuration += entry.blockingDuration || 0;
          if (entry.duration > longestFrame) longestFrame = entry.duration;
        }
      });
      observer.observe({ type: 'long-animation-frame', buffered: true });

      setTimeout(() => {
        observer.disconnect();
        resolve({
          count,
          blockingDuration: Math.round(blockingDuration),
          longestFrame: Math.round(longestFrame)
        });
      }, 300);
    } catch (error) {
      console.error('[Performance] LoAF error:', error);
      resolve(null);
    }
  });
}

/**
 * Get Time to First Byte (TTFB)
 * Target: < 800ms (Good), < 1800ms (Needs Improvement), >= 1800ms (Poor)
 */
function getTimeToFirstByte() {
  try {
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (navTiming) {
      return navTiming.responseStart - navTiming.requestStart;
    }
    return null;
  } catch (error) {
    console.error('[Performance] TTFB error:', error);
    return null;
  }
}

/**
 * Get Time to Interactive (TTI)
 * Approximation using load event
 */
function getTimeToInteractive() {
  try {
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (navTiming) {
      return navTiming.domInteractive - navTiming.fetchStart;
    }
    return null;
  } catch (error) {
    console.error('[Performance] TTI error:', error);
    return null;
  }
}

/**
 * Get Total Blocking Time (TBT)
 * Sum of blocking time from long tasks
 */
function getTotalBlockingTime() {
  return new Promise((resolve) => {
    try {
      let tbt = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            tbt += entry.duration - 50;
          }
        }
      });
      observer.observe({ type: 'longtask', buffered: true });

      // Buffered entries cover the page's history; a short window suffices
      setTimeout(() => {
        observer.disconnect();
        resolve(tbt);
      }, 300);
    } catch (error) {
      console.error('[Performance] TBT error:', error);
      resolve(null);
    }
  });
}

/**
 * Get page load time
 */
function getPageLoadTime() {
  try {
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (navTiming) {
      return navTiming.loadEventEnd - navTiming.fetchStart;
    }
    return null;
  } catch (error) {
    console.error('[Performance] Load time error:', error);
    return null;
  }
}

/**
 * Get resource count and transfer size
 */
function getResourceMetrics() {
  try {
    const resources = performance.getEntriesByType('resource');
    const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    
    return {
      resourceCount: resources.length,
      totalTransferSize: totalSize,
      cachedResources: resources.filter(r => r.transferSize === 0).length
    };
  } catch (error) {
    console.error('[Performance] Resource metrics error:', error);
    return {
      resourceCount: null,
      totalTransferSize: null,
      cachedResources: null
    };
  }
}

/**
 * Collect all Core Web Vitals
 * This is the main function to call
 */
async function collectCoreWebVitals() {
  const [lcp, cls, inp, tbt, loaf] = await Promise.all([
    getLargestContentfulPaint(),
    getCumulativeLayoutShift(),
    getInteractionToNextPaint(),
    getTotalBlockingTime(),
    getLongAnimationFrames()
  ]);
  
  const ttfb = getTimeToFirstByte();
  const tti = getTimeToInteractive();
  const pageLoadTime = getPageLoadTime();
  const resourceMetrics = getResourceMetrics();
  
  const metrics = {
    lcp: lcp ? Math.round(lcp) : null,
    cls: cls != null ? Math.round(cls * 1000) / 1000 : null,
    inp: inp != null ? Math.round(inp) : null,
    ttfb: ttfb ? Math.round(ttfb) : null,
    tti: tti ? Math.round(tti) : null,
    tbt: tbt ? Math.round(tbt) : null,
    pageLoadTime: pageLoadTime ? Math.round(pageLoadTime) : null,
    resourceCount: resourceMetrics.resourceCount,
    totalTransferSize: resourceMetrics.totalTransferSize,
    cachedResources: resourceMetrics.cachedResources,
    cacheHitRate: resourceMetrics.resourceCount > 0 
      ? Math.round((resourceMetrics.cachedResources / resourceMetrics.resourceCount) * 100) 
      : null,
    loafCount: loaf ? loaf.count : null,
    loafBlockingDuration: loaf ? loaf.blockingDuration : null,
    loafLongestFrame: loaf ? loaf.longestFrame : null
  };

  return metrics;
}

/**
 * Determine if metrics pass Core Web Vitals thresholds
 */
function evaluateCoreWebVitals(metrics) {
  const passes = {
    lcp: metrics.lcp && metrics.lcp < 2500,
    cls: metrics.cls && metrics.cls < 0.1,
    inp: metrics.inp && metrics.inp < 200
  };
  
  const passCount = Object.values(passes).filter(Boolean).length;
  const totalCount = Object.values(passes).filter(v => v !== null).length;
  
  return {
    passes,
    passRate: totalCount > 0 ? Math.round((passCount / totalCount) * 100) : null,
    allPass: passCount === 3
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.collectCoreWebVitals = collectCoreWebVitals;
  window.getLongAnimationFrames = getLongAnimationFrames;
  window.evaluateCoreWebVitals = evaluateCoreWebVitals;
}
