/**
 * Navigation Detector
 * Analyzes client-side navigation behavior (SPA transitions)
 */

const NavigationDetector = {
  detect: function() {
    const probeData = window.HydrationDetector ? window.HydrationDetector.getProbeData() : null;
    const softNav = this.detectSoftNavigations();
    const navApi = this.readNavigationApi();

    if (!probeData) {
      // Fallback detection if probe isn't ready
      return {
        isSPA: softNav.count > 0 || navApi.clientEntries > 0 || this.detectSPA(),
        clientRoutes: softNav.count,
        softNavigations: softNav,
        navigationApi: navApi
      };
    }

    const navigations = probeData.navigations || [];
    const clientRoutes = navigations.length;

    return {
      // Browser-verified soft navigations are the strongest evidence: unlike a
      // patched pushState they require a real interaction, a URL change *and*
      // a paint, so a router that only rewrites the URL no longer counts.
      isSPA: softNav.count > 0 || clientRoutes > 0 || navApi.clientEntries > 0 || this.detectSPA(),
      clientRoutes,
      // Timing only: the privacy policy lists page paths as not collected, so
      // the probe's pathnames stay in the page and never reach the payload.
      routes: navigations.slice(-5).map(nav => ({
        type: nav.type,
        time: nav.time,
        source: nav.source
      })),
      softNavigations: softNav,
      navigationApi: navApi
    };
  },

  /**
   * Soft Navigations API — stable in Chrome 151 (July 2026), Chromium-only.
   * Gives per-route paint timing that no amount of history patching can:
   * interaction-contentful-paint is the LCP equivalent for a route change.
   */
  detectSoftNavigations: function() {
    const supported = typeof PerformanceObserver !== 'undefined' &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes('soft-navigation');

    if (!supported) {
      return { supported: false, count: 0, entries: [] };
    }

    try {
      const entries = performance.getEntriesByType('soft-navigation') || [];

      return {
        supported: true,
        count: entries.length,
        entries: entries.slice(-5).map(entry => {
          let icp = null;
          try {
            const largest = typeof entry.getLargestInteractionContentfulPaint === 'function'
              ? entry.getLargestInteractionContentfulPaint()
              : null;
            // Timings are relative to the original hard navigation, so the
            // route's own cost is the delta from where it started.
            if (largest) icp = Math.round(largest.startTime - entry.startTime);
          } catch (e) {}

          // entry.name is the route's full URL and is deliberately dropped:
          // the payload carries timing, never where the user went.
          return {
            startTime: Math.round(entry.startTime),
            paintTime: entry.paintTime ? Math.round(entry.paintTime - entry.startTime) : null,
            interactionContentfulPaint: icp
          };
        })
      };
    } catch (e) {
      return { supported: true, count: 0, entries: [] };
    }
  },

  /**
   * Navigation API — Baseline since Firefox 147. entries() is a static record
   * of same-document history for this page, so it reports client-side routing
   * that happened before the extension ever ran.
   */
  readNavigationApi: function() {
    try {
      if (!window.navigation || typeof window.navigation.entries !== 'function') {
        return { supported: false, clientEntries: 0 };
      }
      // entries() also contains contiguous same-origin entries from real
      // document navigations, so an ordinary MPA visit would otherwise read
      // as client-side routing. Only same-document entries belong to this
      // document's own routing.
      const sameDocument = window.navigation.entries()
        .filter(entry => entry.sameDocument);
      return {
        supported: true,
        // The initial entry is the page load itself; anything beyond it is a
        // client-side route change.
        clientEntries: Math.max(0, sameDocument.length - 1)
      };
    } catch (e) {
      return { supported: false, clientEntries: 0 };
    }
  },

  // Fallback static analysis if no history events yet
  detectSPA: function() {
    // Check for common routers
    if (window.next && window.next.router) return true;
    return false;
  }
};

if (typeof window !== 'undefined') {
  window.NavigationDetector = NavigationDetector;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigationDetector;
}
