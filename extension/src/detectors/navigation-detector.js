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
        clientRoutes: 0,
        avgLatency: null
      };
    }

    const navigations = probeData.navigations || [];
    const clientRoutes = navigations.length;

    // Estimate latency if possible (difference between repeated nav events)
    // This is rough without PerformanceObserver integration for Soft Navigations
    const avgLatency = null; 

    return {
      isSPA: clientRoutes > 0 || this.detectSPA(),
      clientRoutes,
      avgLatency,
      routes: navigations.slice(-5) // Last 5 routes
    };
  },

  // Fallback static analysis if no history events yet
  detectSPA: function() {
    // Check for common routers
    if (window.next && window.next.router) return true;
    if (document.querySelector('[data-reactroot], #root, #app')) {
        // If we found React/Vue roots AND we have high CSR score, likely SPA
        // But let's look for specific Router globals
        // React Router v6 doesn't expose global
    }
    return false;
  }
};

if (typeof window !== 'undefined') {
  window.NavigationDetector = NavigationDetector;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigationDetector;
}
