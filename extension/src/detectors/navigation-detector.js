/**
 * Navigation Detector
 * Analyzes client-side navigation behavior (SPA transitions)
 */

const NavigationDetector = {
  detect: function() {
    const probeData = window.HydrationDetector ? window.HydrationDetector.getProbeData() : null;

    if (!probeData) {
      // Fallback detection if probe isn't ready
      return {
        isSPA: this.detectSPA(),
        clientRoutes: 0
      };
    }

    const navigations = probeData.navigations || [];
    const clientRoutes = navigations.length;

    return {
      isSPA: clientRoutes > 0 || this.detectSPA(),
      clientRoutes,
      routes: navigations.slice(-5) // Last 5 routes
    };
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
