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
      
      // Timeout after 10 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 10000);
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
      
      // Collect for 5 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 5000);
    } catch (error) {
      console.error('[Performance] CLS error:', error);
      resolve(null);
    }
  });
}

/**
 * Get First Input Delay (FID)
 * Target: < 100ms (Good), < 300ms (Needs Improvement), >= 300ms (Poor)
 */
function getFirstInputDelay() {
  return new Promise((resolve) => {
    try {
      const observer = new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0];
        observer.disconnect();
        resolve(firstInput.processingStart - firstInput.startTime);
      });
      observer.observe({ type: 'first-input', buffered: true });
      
      // Timeout after 10 seconds (user might not interact)
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 10000);
    } catch (error) {
      console.error('[Performance] FID error:', error);
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
      
      // Collect for 5 seconds
      setTimeout(() => {
        observer.disconnect();
        resolve(tbt);
      }, 5000);
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
  console.log('[Performance] Collecting Core Web Vitals...');
  
  const [lcp, cls, fid, tbt] = await Promise.all([
    getLargestContentfulPaint(),
    getCumulativeLayoutShift(),
    getFirstInputDelay(),
    getTotalBlockingTime()
  ]);
  
  const ttfb = getTimeToFirstByte();
  const tti = getTimeToInteractive();
  const pageLoadTime = getPageLoadTime();
  const resourceMetrics = getResourceMetrics();
  
  const metrics = {
    lcp: lcp ? Math.round(lcp) : null,
    cls: cls ? Math.round(cls * 1000) / 1000 : null,
    fid: fid ? Math.round(fid) : null,
    ttfb: ttfb ? Math.round(ttfb) : null,
    tti: tti ? Math.round(tti) : null,
    tbt: tbt ? Math.round(tbt) : null,
    pageLoadTime: pageLoadTime ? Math.round(pageLoadTime) : null,
    resourceCount: resourceMetrics.resourceCount,
    totalTransferSize: resourceMetrics.totalTransferSize,
    cachedResources: resourceMetrics.cachedResources,
    cacheHitRate: resourceMetrics.resourceCount > 0 
      ? Math.round((resourceMetrics.cachedResources / resourceMetrics.resourceCount) * 100) 
      : null
  };
  
  console.log('[Performance] Core Web Vitals collected:', metrics);
  return metrics;
}

/**
 * Determine if metrics pass Core Web Vitals thresholds
 */
function evaluateCoreWebVitals(metrics) {
  const passes = {
    lcp: metrics.lcp && metrics.lcp < 2500,
    cls: metrics.cls && metrics.cls < 0.1,
    fid: metrics.fid && metrics.fid < 100
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
  window.evaluateCoreWebVitals = evaluateCoreWebVitals;
}
