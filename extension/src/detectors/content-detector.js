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
  const signals = [];
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
    signals.push({
      id: "content.rich",
      label: "Rich document structure",
      impact: "ssr",
      weight: config.scoring.richContent,
      detail: `${bodyText.length.toLocaleString()} characters of text across ${childrenCount} top-level blocks and real semantic elements.`,
    });
  } else if (bodyText.length < config.content.minimalTextLength) {
    csrScore += config.scoring.minimalContent;
    indicators.push("minimal text content (CSR)");
    signals.push({
      id: "content.minimal",
      label: "Almost no text in the document",
      impact: "csr",
      weight: config.scoring.minimalContent,
      detail: `Only ${bodyText.length} characters of visible text — an app shell rather than a document.`,
    });
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
    signals.push({
      id: "content.loading",
      label: "Loading placeholders, little content",
      impact: "csr",
      weight: config.scoring.loadingStates,
      detail: "Spinner/skeleton markup is present while the page still has almost no text.",
    });
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
    signals.push({
      id: "content.scriptRatio.high",
      label: "High script-to-element ratio",
      impact: "csr",
      weight: config.scoring.highScriptRatio,
      detail: `${scriptElements} script tags against ${allElements} elements — above the ${Math.round(config.scriptRatio.high * 100)}% threshold.`,
    });
  } else if (scriptRatio < config.scriptRatio.low) {
    ssrScore += config.scoring.lowScriptRatio;
    indicators.push("low script-to-content ratio (SSR)");
    signals.push({
      id: "content.scriptRatio.low",
      label: "Low script-to-element ratio",
      impact: "ssr",
      weight: config.scoring.lowScriptRatio,
      detail: `${scriptElements} script tags against ${allElements} elements — below the ${Math.round(config.scriptRatio.low * 100)}% threshold.`,
    });
  }

  return {
    ssrScore,
    csrScore,
    indicators,
    signals,
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
