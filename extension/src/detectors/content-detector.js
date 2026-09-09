/**
 * Content Detector Module
 * Analyzes HTML content structure and text
 */

/**
 * Analyze HTML content for SSR/CSR indicators
 * @returns {Object} Detection results with score and indicators
 */
function analyzeContent() {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  let ssrScore = 0;
  let csrScore = 0;

  const bodyHTML = window.getDetectionBodyHTML();
  const childrenCount = Array.from(document.body.children).filter(
    (el) => el.id !== "ssr-detector-probe-data",
  ).length;
  const bodyText = document.body.innerText.trim();

  // Check for rich initial content
  const hasRichInitialContent =
    childrenCount > config.content.minChildren &&
    bodyText.length > config.content.minTextLength &&
    document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, article, section")
      .length > config.content.minSemanticElements;

  if (hasRichInitialContent) {
    ssrScore += config.scoring.richContent;
    indicators.push("rich initial content structure (SSR)");
  } else if (bodyText.length < config.content.minimalTextLength) {
    csrScore += config.scoring.minimalContent;
    indicators.push("minimal text content (CSR)");
  }

  // Check for loading states
  const loadingIndicators = bodyHTML.toLowerCase();
  const hasLoadingStates =
    loadingIndicators.includes("loading") ||
    loadingIndicators.includes("spinner") ||
    loadingIndicators.includes("skeleton") ||
    document.querySelector(".loading, .spinner, .skeleton") !== null;

  if (
    hasLoadingStates &&
    bodyText.length < config.content.minLoadingStateText
  ) {
    csrScore += config.scoring.loadingStates;
    indicators.push("loading states with minimal content (CSR)");
  }

  // Content-to-script ratio analysis
  const allElements =
    document.querySelectorAll("*").length -
    document.querySelectorAll(
      "#ssr-detector-probe-data, #ssr-detector-probe-data *",
    ).length;
  const scriptElements = document.querySelectorAll("script").length;
  const scriptRatio = scriptElements / allElements;

  if (scriptRatio > config.scriptRatio.high) {
    csrScore += config.scoring.highScriptRatio;
    indicators.push("high script-to-content ratio (CSR)");
  } else if (scriptRatio < config.scriptRatio.low) {
    ssrScore += config.scoring.lowScriptRatio;
    indicators.push("low script-to-content ratio (SSR)");
  }

  return {
    ssrScore,
    csrScore,
    indicators,
    details: {
      contentLength: bodyText.length,
      childrenCount: childrenCount,
      scriptRatio: Math.round(scriptRatio * 100) / 100,
    },
  };
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.analyzeContent = analyzeContent;
}
