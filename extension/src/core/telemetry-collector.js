/**
 * Telemetry Collector
 * Orchestrates all telemetry collection after detection is complete.
 * Only loaded when shareData is enabled.
 */

/**
 * Collect all telemetry data
 * @param {Object} detectionResults - Results from pageAnalyzer()
 * @returns {Promise<Object>} Telemetry data
 */
async function collectTelemetryData(detectionResults) {
  const [coreWebVitals, pageType, deviceInfo, techStack, seoAccessibility] =
    await Promise.allSettled([
      typeof window.collectCoreWebVitals === "function"
        ? Promise.race([
            window.collectCoreWebVitals(),
            // Safety net only — must exceed the collector's slowest internal
            // timeout (500ms LCP), or CWV is silently dropped every time
            new Promise((resolve) => setTimeout(() => resolve(null), 2000)),
          ])
        : Promise.resolve(null),
      Promise.resolve(
        typeof window.detectPageType === "function"
          ? window.detectPageType()
          : "other",
      ),
      Promise.resolve(
        typeof window.getDeviceInfoForTelemetry === "function"
          ? window.getDeviceInfoForTelemetry()
          : null,
      ),
      Promise.resolve(
        typeof window.TechStackDetector === "object"
          ? window.TechStackDetector.detect()
          : null,
      ),
      Promise.resolve(
        typeof window.SEODetector === "object"
          ? window.SEODetector.detect()
          : null,
      ),
    ]).then((r) => r.map((x) => x.value ?? null));

  const hydration =
    typeof window.HydrationDetector === "object"
      ? window.HydrationDetector.detect()
      : null;
  const hydrationData =
    hydration &&
    Number.isSafeInteger(hydration.errorCount) &&
    hydration.errorCount >= 0 &&
    Number.isFinite(hydration.score) &&
    hydration.score >= 0 &&
    hydration.score <= 100
      ? { errorCount: hydration.errorCount, score: hydration.score }
      : null;

  const navigationData =
    typeof window.NavigationDetector === "object"
      ? window.NavigationDetector.detect()
      : null;

  return {
    coreWebVitals,
    pageType,
    deviceInfo,
    techStack,
    seoAccessibility,
    hydrationData,
    navigationData,
  };
}

if (typeof window !== "undefined") {
  window.collectTelemetryData = collectTelemetryData;
}
