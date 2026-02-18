/**
 * Hydration Detector
 * Detects React/Vue hydration mismatch errors extracted by the probe
 */

const HydrationDetector = {
  detect: function() {
    const probeData = this.getProbeData();
    
    if (!probeData) {
      return {
        errorCount: 0,
        errors: [],
        score: 100
      };
    }

    const errorCount = probeData.hydrationErrors.length;
    
    // Calculate health score (100 = perfect, 0 = severe issues)
    // -5 points per error, minimum 0
    const score = Math.max(0, 100 - (errorCount * 5));

    return {
      errorCount,
      errors: probeData.hydrationErrors.slice(0, 5), // Top 5 errors
      score
    };
  },

  getProbeData: function() {
    // Try to trigger data refresh from probe
    try {
      window.dispatchEvent(new CustomEvent('ssr-detector-request-data'));
    } catch (e) {}

    const dataElement = document.getElementById('ssr-detector-probe-data');
    if (!dataElement) return null;

    try {
      return JSON.parse(dataElement.textContent);
    } catch (e) {
      return null;
    }
  }
};

if (typeof window !== 'undefined') {
  window.HydrationDetector = HydrationDetector;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HydrationDetector;
}
