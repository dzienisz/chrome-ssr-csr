/**
 * Hydration Detector
 * Detects React/Vue hydration mismatch errors extracted by the probe
 */

const HydrationDetector = {
  detect: function () {
    const probeData = this.getProbeData();

    if (!probeData) {
      return {
        errorCount: 0,
        score: 100,
      };
    }

    const errorCount =
      Number.isSafeInteger(probeData.hydrationErrorCount) &&
      probeData.hydrationErrorCount >= 0
        ? probeData.hydrationErrorCount
        : Array.isArray(probeData.hydrationErrors)
          ? probeData.hydrationErrors.length
          : 0;

    // Calculate health score (100 = perfect, 0 = severe issues)
    // -5 points per error, minimum 0
    const score = Math.max(0, 100 - errorCount * 5);

    return {
      errorCount,
      score,
    };
  },

  getProbeData: function () {
    // Try to trigger data refresh from probe
    try {
      window.dispatchEvent(new CustomEvent("ssr-detector-request-data"));
    } catch (e) {}

    const dataElement = document.getElementById("ssr-detector-probe-data");
    if (!dataElement) return null;

    try {
      const snapshot = dataElement.getAttribute("data-ssr-detector-snapshot");
      return JSON.parse(snapshot ?? dataElement.textContent);
    } catch (e) {
      return null;
    }
  },
};

if (typeof window !== "undefined") {
  window.HydrationDetector = HydrationDetector;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = HydrationDetector;
}
