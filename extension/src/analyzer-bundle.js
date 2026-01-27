// Prevent duplicate injection
if (typeof window.__SSR_CSR_ANALYZER_LOADED__ === 'undefined') {
  window.__SSR_CSR_ANALYZER_LOADED__ = true;

/**
 * Configuration for SSR/CSR Detection
 * All scoring weights and thresholds in one place
 */

const CONFIG = {
  // Scoring weights for different indicators
  scoring: {
    richContent: 20,           // Reduced from 35 - rendered DOM is misleading
    minimalContent: 30,
    frameworkMarkers: 30,
    serializedData: 25,
    ssrFrameworkMeta: 20,
    richMeta: 15,
    ssrHydrationScripts: 15,
    csrFrameworkScripts: 25,
    staticGenerator: 40,
    fastDOMReady: 25,
    slowDOMReady: 20,
    fastFCP: 15,
    clientRouting: 20,
    loadingStates: 20,
    structuredData: 15,
    highScriptRatio: 15,
    lowScriptRatio: 10,
    // New CSR detection weights
    rawVsRenderedMismatch: 40, // Raw HTML much smaller than rendered = CSR
    rawVsRenderedMatch: 30,    // Raw HTML similar to rendered = SSR
    spaRootPattern: 20,        // #root/#app with data attributes = CSR
    noscriptFallback: 15,      // "JavaScript required" message = CSR
    fastDomSlowFcp: 25         // Fast DOMContentLoaded + slow FCP = CSR
  },

  // Classification thresholds
  thresholds: {
    ssr: 75,              // >= 75% = Pure SSR
    likelySsr: 60,        // 60-74% = Likely SSR with Hydration
    hybrid: {min: 41, max: 59},  // 41-59% = Hybrid
    likelyCsr: 40,        // 26-40% = Likely CSR/SPA
    csr: 25               // <= 25% = Pure CSR
  },

  // Confidence calculation
  confidence: {
    baseMultiplier: 2,    // Multiply score difference by this
    indicatorBonus: 3,    // Bonus per indicator found
    maxIndicatorBonus: 20, // Maximum bonus from indicators
    minConfidence: 30,    // Minimum confidence to report
    maxConfidenceSsr: 95,  // Maximum for SSR/CSR
    maxConfidenceLikely: 85, // Maximum for "Likely" categories
    maxConfidenceHybrid: 70  // Maximum for Hybrid
  },

  // Content analysis thresholds
  content: {
    minChildren: 3,
    minTextLength: 200,
    minSemanticElements: 5,
    minimalTextLength: 50,
    minRichMetaLength: 20,
    minLoadingStateText: 100
  },

  // Performance thresholds (milliseconds)
  performance: {
    fastDOMReady: 30,
    slowDOMReady: 500,
    fastFCP: 800,
    slowFCP: 1000           // FCP above this with fast DOM = CSR indicator
  },

  // Content comparison thresholds (raw HTML vs rendered DOM)
  contentComparison: {
    csrRatio: 0.2,          // Raw/rendered ratio below this = likely CSR
    ssrRatio: 0.7,          // Raw/rendered ratio above this = likely SSR
    minRenderedLength: 200  // Minimum rendered content to compare
  },

  // Script ratio thresholds
  scriptRatio: {
    high: 0.15,
    low: 0.05
  },

  // Framework markers for detection
  frameworks: {
    react: '[data-reactroot], [data-reactid], [data-react-checksum]',
    nextjs: '#__next, #__NEXT_DATA__',
    nuxt: '#__nuxt, #__NUXT__',
    gatsby: '#___gatsby',
    sveltekit: '#svelte',
    astro: '[data-astro-island]',
    remix: '[data-remix-run]',
    qwik: '[q\\:container]',
    solidjs: '[data-solid]'
  },

  // Static site generator detection
  staticGenerators: {
    jekyll: 'meta[name="generator"][content*="Jekyll"]',
    hugo: 'meta[name="generator"][content*="Hugo"]',
    eleventy: 'meta[name="generator"][content*="Eleventy"]',
    hexo: 'meta[name="generator"][content*="Hexo"]'
  },

  // Client-side routing selectors
  routerSelectors: [
    '[data-router]',
    '[router-outlet]',
    '.router-view',
    '[ui-view]',
    '[ng-view]',
    '.route-component'
  ],

  // Serialized data patterns to look for
  serializedDataPatterns: [
    '__NEXT_DATA__',
    'window.__INITIAL_STATE__',
    'window.__APOLLO_STATE__',
    'window.__PRELOADED_STATE__',
    'application/json'
  ]
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.DETECTOR_CONFIG = CONFIG;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

/**
 * Raw HTML Comparison Module
 * Fetches raw HTML and compares to rendered DOM to detect CSR vs SSR
 */

/**
 * Compare initial HTML (before JS) vs rendered DOM (after JS)
 * True SSR will have similar content in both; CSR will have minimal raw HTML
 * @returns {Promise<Object|null>} Comparison results or null if fetch fails
 */
async function compareInitialVsRendered() {
  const config = window.DETECTOR_CONFIG;

  try {
    // Fetch raw HTML (before JS execution)
    const response = await fetch(window.location.href, {
      credentials: 'same-origin',
      headers: { 'Accept': 'text/html' }
    });

    if (!response.ok) {
      return null;
    }

    const rawHTML = await response.text();

    // Parse raw HTML
    const parser = new DOMParser();
    const rawDoc = parser.parseFromString(rawHTML, 'text/html');
    const rawBodyText = rawDoc.body?.innerText?.trim() || '';

    // Get current rendered DOM text
    const renderedText = document.body.innerText.trim();

    // Calculate content lengths
    const rawLength = rawBodyText.length;
    const renderedLength = renderedText.length;

    // Calculate content ratio
    const contentRatio = rawLength / Math.max(renderedLength, 1);

    // Determine if CSR or SSR based on ratio
    const isLikelyCSR = contentRatio < config.contentComparison.csrRatio &&
                        renderedLength > config.contentComparison.minRenderedLength;
    const isLikelySSR = contentRatio > config.contentComparison.ssrRatio;

    return {
      rawLength,
      renderedLength,
      contentRatio: Math.round(contentRatio * 100) / 100,
      isLikelyCSR,
      isLikelySSR
    };
  } catch (e) {
    // Fetch failed (CORS, network error, etc.) - can't determine
    console.debug('CSR/SSR Detector: Raw HTML fetch failed', e.message);
    return null;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.compareInitialVsRendered = compareInitialVsRendered;
}

/**
 * CSR Pattern Detector Module
 * Detects patterns specific to client-side rendered applications
 */

/**
 * Detect CSR-specific patterns in the page
 * @returns {Object} Detection results with score and indicators
 */
function detectCSRPatterns() {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  let csrScore = 0;

  // Check for typical SPA root containers
  const root = document.getElementById('root') || document.getElementById('app');
  if (root) {
    // Check for React/Vue root markers
    const hasReactRoot = root.hasAttribute('data-reactroot') ||
                         root._reactRootContainer !== undefined;
    const hasVueApp = root.hasAttribute('data-v-app') ||
                      root.__vue_app__ !== undefined;

    // SPA frameworks typically inject content into a single root with few initial children
    // After hydration, the root will have content but the marker attributes indicate SPA
    if (hasReactRoot || hasVueApp) {
      csrScore += config.scoring.spaRootPattern;
      indicators.push("SPA root container pattern detected (CSR)");
    }
  }

  // Check for noscript fallback content (common in CSR/SPA apps)
  const noscripts = document.querySelectorAll('noscript');
  for (const noscript of noscripts) {
    const text = noscript.textContent.toLowerCase();
    if (text.includes('javascript') ||
        text.includes('enable js') ||
        text.includes('requires javascript') ||
        text.includes('need to enable')) {
      csrScore += config.scoring.noscriptFallback;
      indicators.push("JavaScript required message found (CSR)");
      break;
    }
  }

  // Check for empty initial HTML indicators
  // Look for common CSR patterns in the HTML structure
  const htmlElement = document.documentElement;
  const bodyClasses = document.body.className.toLowerCase();

  // Many CSR apps add classes dynamically after load
  if (bodyClasses.includes('js-loaded') ||
      bodyClasses.includes('app-loaded') ||
      bodyClasses.includes('hydrated')) {
    csrScore += 10;
    indicators.push("dynamic body class detected (CSR)");
  }

  return {
    ssrScore: 0,
    csrScore,
    indicators,
    details: {
      hasRoot: !!root,
      hasNoscriptWarning: indicators.some(i => i.includes('JavaScript required'))
    }
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.detectCSRPatterns = detectCSRPatterns;
}

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

  const bodyHTML = document.body.innerHTML;
  const bodyText = document.body.innerText.trim();

  // Check for rich initial content
  const hasRichInitialContent =
    document.body.children.length > config.content.minChildren &&
    bodyText.length > config.content.minTextLength &&
    document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, section').length > config.content.minSemanticElements;

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
    loadingIndicators.includes('loading') ||
    loadingIndicators.includes('spinner') ||
    loadingIndicators.includes('skeleton') ||
    document.querySelector('.loading, .spinner, .skeleton') !== null;

  if (hasLoadingStates && bodyText.length < config.content.minLoadingStateText) {
    csrScore += config.scoring.loadingStates;
    indicators.push("loading states with minimal content (CSR)");
  }

  // Content-to-script ratio analysis
  const allElements = document.querySelectorAll('*').length;
  const scriptElements = document.querySelectorAll('script').length;
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
      childrenCount: document.body.children.length,
      scriptRatio: Math.round(scriptRatio * 100) / 100
    }
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.analyzeContent = analyzeContent;
}
/**
 * Framework Detector Module
 * Detects JavaScript frameworks and their hydration patterns
 */

/**
 * Detect frameworks and their rendering patterns
 * @returns {Object} Detection results with score and indicators
 */
function detectFrameworks() {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  let ssrScore = 0;
  let csrScore = 0;
  const detailedInfo = {};

  // Detect framework hydration markers
  const frameworkMarkers = {};
  for (const [framework, selector] of Object.entries(config.frameworks)) {
    try {
      if (framework === 'react') {
        // Special handling for React
        frameworkMarkers[framework] =
          document.querySelector(selector) !== null ||
          document.getElementById('root')?._reactRootContainer !== undefined;
      } else {
        frameworkMarkers[framework] = document.querySelector(selector) !== null;
      }
    } catch (e) {
      frameworkMarkers[framework] = false;
    }
  }

  const foundFrameworks = Object.entries(frameworkMarkers)
    .filter(([_, found]) => found)
    .map(([framework, _]) => framework);

  if (foundFrameworks.length > 0) {
    ssrScore += config.scoring.frameworkMarkers;
    indicators.push(`${foundFrameworks.join(', ')} hydration markers (SSR)`);
    detailedInfo.frameworks = foundFrameworks;
  }

  // Detect static site generators
  const staticGeneratorMarkers = {};
  for (const [generator, selector] of Object.entries(config.staticGenerators)) {
    try {
      staticGeneratorMarkers[generator] = document.querySelector(selector) !== null;
    } catch (e) {
      staticGeneratorMarkers[generator] = false;
    }
  }

  const foundGenerators = Object.entries(staticGeneratorMarkers)
    .filter(([_, found]) => found)
    .map(([generator, _]) => generator);

  if (foundGenerators.length > 0) {
    ssrScore += config.scoring.staticGenerator;
    indicators.push(`${foundGenerators.join(', ')} static site generator detected (SSR)`);
    detailedInfo.generators = foundGenerators;
  }

  // Check for serialized data (strong SSR indicator)
  const bodyHTML = document.body.innerHTML;
  const hasInlineData = config.serializedDataPatterns.some(pattern =>
    bodyHTML.includes(pattern)
  ) || /window\.__[\w_]+__\s*=/.test(bodyHTML);

  if (hasInlineData) {
    ssrScore += config.scoring.serializedData;
    indicators.push("serialized data detected (SSR)");
  }

  // Analyze script patterns
  const scripts = document.querySelectorAll('script[src]');
  let frameworkScriptCount = 0;
  let hasLazyChunks = false;
  let hasHydrationScripts = false;

  scripts.forEach(script => {
    const src = script.src.toLowerCase();

    if (src.includes('react') || src.includes('vue') || src.includes('angular') ||
        src.includes('svelte') || src.includes('solid')) {
      frameworkScriptCount++;
    }

    if (src.includes('chunk') || src.includes('_next/static') || src.includes('_nuxt/')) {
      hasLazyChunks = true;
    }

    if (src.includes('hydrat') || src.includes('client')) {
      hasHydrationScripts = true;
    }
  });

  if (frameworkScriptCount > 0) {
    if (hasLazyChunks || hasHydrationScripts) {
      ssrScore += config.scoring.ssrHydrationScripts;
      indicators.push("SSR hydration scripts detected");
    } else {
      csrScore += config.scoring.csrFrameworkScripts;
      indicators.push("CSR framework scripts detected");
    }
  }

  // Check for client-side routing
  const hasClientRouting = config.routerSelectors.some(selector => {
    try {
      return document.querySelector(selector) !== null;
    } catch (e) {
      return false;
    }
  });

  if (hasClientRouting) {
    csrScore += config.scoring.clientRouting;
    indicators.push("client-side routing detected (CSR)");
  }

  return {
    ssrScore,
    csrScore,
    indicators,
    details: detailedInfo
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.detectFrameworks = detectFrameworks;
}
/**
 * Meta Tags Detector Module
 * Analyzes meta tags and SEO indicators
 */

/**
 * Analyze meta tags for SSR/CSR indicators
 * @returns {Object} Detection results with score and indicators
 */
function analyzeMeta() {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  let ssrScore = 0;

  const metaTags = document.querySelectorAll('meta[name], meta[property], meta[content]');
  let hasRichMeta = false;
  let hasSSRFrameworkMeta = false;

  metaTags.forEach(meta => {
    const name = (meta.getAttribute('name') || meta.getAttribute('property') || '').toLowerCase();
    const content = (meta.getAttribute('content') || '').toLowerCase();

    // Check for SSR framework indicators in meta tags
    if (name.includes('next') || name.includes('nuxt') || name.includes('gatsby') ||
        name.includes('remix') || content.includes('next.js')) {
      hasSSRFrameworkMeta = true;
    }

    // Check for rich meta content (indicates server-side generation)
    if ((name.includes('description') || name.includes('og:') || name.includes('twitter:')) &&
        content.length > config.content.minRichMetaLength) {
      hasRichMeta = true;
    }
  });

  if (hasSSRFrameworkMeta) {
    ssrScore += config.scoring.ssrFrameworkMeta;
    indicators.push("SSR framework meta detected");
  }

  if (hasRichMeta) {
    ssrScore += config.scoring.richMeta;
    indicators.push("rich meta tags present (SSR)");
  }

  // Check for structured data (JSON-LD)
  const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (structuredDataScripts.length > 0) {
    ssrScore += config.scoring.structuredData;
    indicators.push("structured data present (SSR)");
  }

  return {
    ssrScore,
    csrScore: 0,
    indicators,
    details: {
      hasRichMeta,
      hasSSRFrameworkMeta,
      structuredDataCount: structuredDataScripts.length
    }
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.analyzeMeta = analyzeMeta;
}
/**
 * Performance Detector Module
 * Analyzes performance timing metrics
 */

/**
 * Analyze performance metrics for SSR/CSR indicators
 *
 * Key insight: CSR apps have FAST DOMContentLoaded because initial HTML is minimal.
 * The content is then loaded via JavaScript, resulting in slow FCP.
 * SSR apps have content in the initial HTML, so FCP is fast relative to DOM ready.
 *
 * @returns {Object} Detection results with score and indicators
 */
function analyzePerformance() {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  let ssrScore = 0;
  let csrScore = 0;
  const detailedInfo = {};

  const performanceEntries = performance.getEntriesByType('navigation');

  if (performanceEntries.length > 0) {
    const navTiming = performanceEntries[0];
    const domContentLoadedTime = navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart;
    const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0];
    const fcpTime = firstContentfulPaint ? firstContentfulPaint.startTime : null;

    // Key CSR indicator: Fast DOM ready + slow FCP
    // This means the initial HTML loaded quickly (because it's minimal),
    // but content took a while to appear (because it was loaded via JavaScript)
    if (domContentLoadedTime < config.performance.fastDOMReady &&
        fcpTime && fcpTime > config.performance.slowFCP) {
      csrScore += config.scoring.fastDomSlowFcp;
      indicators.push("fast DOM ready but slow FCP (CSR pattern)");
    }
    // Fast FCP with reasonable DOM time suggests SSR (content was in initial HTML)
    else if (fcpTime && fcpTime < config.performance.fastFCP) {
      ssrScore += config.scoring.fastFCP;
      indicators.push("fast first contentful paint (SSR)");
    }

    // Very slow DOM ready can indicate heavy server processing (SSR) or slow network
    // This is less reliable, so we use lower weight
    if (domContentLoadedTime > config.performance.slowDOMReady) {
      // Slow DOM + slow FCP = might be slow SSR or network issues
      // Slow DOM + fast FCP = SSR (server took time, but content was ready)
      if (fcpTime && fcpTime < config.performance.fastFCP) {
        ssrScore += 10;
        indicators.push("slow DOM but fast paint (SSR)");
      }
    }

    detailedInfo.timing = {
      domContentLoaded: Math.round(domContentLoadedTime),
      firstContentfulPaint: fcpTime ? Math.round(fcpTime) : null
    };
  }

  return {
    ssrScore,
    csrScore,
    indicators,
    details: detailedInfo
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.analyzePerformance = analyzePerformance;
}
/**
 * Scoring Module
 * Calculates final scores and classification
 */

/**
 * Calculate final classification based on scores
 * @param {number} ssrScore - Total SSR score
 * @param {number} csrScore - Total CSR score
 * @param {Array} indicators - All indicators found
 * @returns {Object} Classification with confidence
 */
function calculateClassification(ssrScore, csrScore, indicators) {
  const config = window.DETECTOR_CONFIG;

  const totalScore = ssrScore + csrScore;
  const ssrPercentage = totalScore > 0 ? Math.round((ssrScore / totalScore) * 100) : 50;

  let renderType, confidence;

  // Enhanced confidence calculation
  const indicatorCount = indicators.length;
  const baseConfidence = Math.abs(ssrPercentage - 50) * config.confidence.baseMultiplier;
  const indicatorBonus = Math.min(
    indicatorCount * config.confidence.indicatorBonus,
    config.confidence.maxIndicatorBonus
  );

  // Determine render type and confidence based on thresholds
  if (ssrPercentage >= config.thresholds.ssr) {
    renderType = "Server-Side Rendered (SSR)";
    confidence = Math.min(baseConfidence + indicatorBonus, config.confidence.maxConfidenceSsr);
  } else if (ssrPercentage <= config.thresholds.csr) {
    renderType = "Client-Side Rendered (CSR)";
    confidence = Math.min(baseConfidence + indicatorBonus, config.confidence.maxConfidenceSsr);
  } else if (ssrPercentage >= config.thresholds.likelySsr) {
    renderType = "Likely SSR with Hydration";
    confidence = Math.min(baseConfidence + indicatorBonus, config.confidence.maxConfidenceLikely);
  } else if (ssrPercentage <= config.thresholds.likelyCsr) {
    renderType = "Likely CSR/SPA";
    confidence = Math.min(baseConfidence + indicatorBonus, config.confidence.maxConfidenceLikely);
  } else {
    renderType = "Hybrid/Mixed Rendering";
    confidence = Math.min(baseConfidence + 10, config.confidence.maxConfidenceHybrid);
  }

  return {
    renderType,
    confidence: Math.max(confidence, config.confidence.minConfidence),
    ssrPercentage,
    indicatorCount
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.calculateClassification = calculateClassification;
}
/**
 * Main Analyzer Module
 * Orchestrates all detection modules and produces final results
 */

/**
 * Main analysis function - coordinates all detectors
 * Now async to support raw HTML comparison
 * @returns {Promise<Object>} Complete analysis results
 */
async function pageAnalyzer() {
  const config = window.DETECTOR_CONFIG;

  try {
    // Collect results from all detector modules (sync)
    const contentResults = window.analyzeContent();
    const frameworkResults = window.detectFrameworks();
    const metaResults = window.analyzeMeta();
    const performanceResults = window.analyzePerformance();
    const csrPatternResults = window.detectCSRPatterns();

    // Fetch and compare raw HTML vs rendered DOM (async - most important for accuracy)
    const comparisonResults = await window.compareInitialVsRendered();

    // Combine all scores
    let ssrScore = 0;
    let csrScore = 0;
    const indicators = [];
    const detailedInfo = {};

    // Add raw HTML comparison results (highest priority signal)
    if (comparisonResults) {
      if (comparisonResults.isLikelyCSR) {
        csrScore += config.scoring.rawVsRenderedMismatch;
        indicators.push(`raw HTML much smaller than rendered (${comparisonResults.contentRatio}x ratio) - CSR`);
      } else if (comparisonResults.isLikelySSR) {
        ssrScore += config.scoring.rawVsRenderedMatch;
        indicators.push(`raw HTML matches rendered content (${comparisonResults.contentRatio}x ratio) - SSR`);
      }
      detailedInfo.contentComparison = {
        rawLength: comparisonResults.rawLength,
        renderedLength: comparisonResults.renderedLength,
        ratio: comparisonResults.contentRatio
      };
    }

    // Add CSR pattern detection results
    ssrScore += csrPatternResults.ssrScore;
    csrScore += csrPatternResults.csrScore;
    indicators.push(...csrPatternResults.indicators);
    Object.assign(detailedInfo, csrPatternResults.details);

    // Add content analysis results
    ssrScore += contentResults.ssrScore;
    csrScore += contentResults.csrScore;
    indicators.push(...contentResults.indicators);
    Object.assign(detailedInfo, contentResults.details);

    // Add framework analysis results
    ssrScore += frameworkResults.ssrScore;
    csrScore += frameworkResults.csrScore;
    indicators.push(...frameworkResults.indicators);
    Object.assign(detailedInfo, frameworkResults.details);

    // Add meta analysis results
    ssrScore += metaResults.ssrScore;
    csrScore += metaResults.csrScore;
    indicators.push(...metaResults.indicators);
    Object.assign(detailedInfo, metaResults.details);

    // Add performance analysis results
    ssrScore += performanceResults.ssrScore;
    csrScore += performanceResults.csrScore;
    indicators.push(...performanceResults.indicators);
    Object.assign(detailedInfo, performanceResults.details);

    // Calculate final classification
    const classification = window.calculateClassification(ssrScore, csrScore, indicators);

    return {
      renderType: classification.renderType,
      confidence: classification.confidence,
      indicators: indicators.length > 0 ? indicators : ["basic analysis"],
      detailedInfo: {
        ssrScore,
        csrScore,
        ssrPercentage: classification.ssrPercentage,
        totalIndicators: classification.indicatorCount,
        ...detailedInfo
      }
    };
  } catch (error) {
    console.error('CSR/SSR Detector: Analysis failed', error);
    return {
      renderType: "Analysis Error",
      confidence: 0,
      indicators: ["analysis failed - " + error.message],
      detailedInfo: {
        ssrScore: 0,
        csrScore: 0,
        ssrPercentage: 50,
        totalIndicators: 0,
        error: error.message
      }
    };
  }
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.pageAnalyzer = pageAnalyzer;
}
/**
 * Results Renderer Module
 * UI components for displaying analysis results
 */

/**
 * Get color based on render type
 * @param {string} renderType - The render type classification
 * @returns {string} Hex color code
 */
function getTypeColor(renderType) {
  if (renderType.includes('SSR')) return '#059669';
  if (renderType.includes('CSR')) return '#dc2626';
  if (renderType.includes('Hybrid')) return '#d97706';
  return '#6b7280';
}

/**
 * Create confidence bar HTML
 * @param {number} confidence - Confidence percentage
 * @returns {string} HTML string for confidence bar
 */
function getConfidenceBar(confidence) {
  const width = Math.max(confidence, 10);
  const color = confidence >= 70 ? '#059669' : confidence >= 50 ? '#d97706' : '#dc2626';

  // Detect dark mode for background
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const barBg = isDark ? '#374151' : '#f1f5f9';

  return `
    <div style="background: ${barBg}; border-radius: 4px; height: 6px; width: 100%; margin-top: 4px; overflow: hidden;">
      <div style="background: ${color}; height: 100%; width: ${width}%; border-radius: 4px; transition: width 0.3s ease;"></div>
    </div>
  `;
}

/**
 * Create complete results HTML
 * @param {Object} results - Analysis results object
 * @returns {string} HTML string for displaying results
 */
function createResultsHTML(results) {
  const { renderType, confidence, indicators, detailedInfo } = results;

  // Detect dark mode
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const borderColor = isDark ? '#374151' : '#ddd';
  const accentColor = isDark ? '#3b82f6' : '#2563eb';
  const textSecondary = isDark ? '#9ca3af' : '#666';
  const badgeBg = isDark ? '#374151' : '#f1f5f9';
  const badgeText = isDark ? '#f9fafb' : '#1f2937';

  let resultHTML = `
    <div style="border: 1px solid ${borderColor}; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Render Type:</strong>
        <br>
        <span style="font-weight: 600; color: ${getTypeColor(renderType)}">${renderType}</span>
      </div>
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Confidence:</strong>
        <span style="font-weight: 600;">${confidence}%</span>
        ${getConfidenceBar(confidence)}
      </div>
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Analysis Score:</strong>
        <br>
        <span style="font-size: 12px; color: ${textSecondary};">
          SSR: ${detailedInfo.ssrScore} | CSR: ${detailedInfo.csrScore}
          (${detailedInfo.ssrPercentage}% SSR)
        </span>
      </div>
    </div>

    <div style="margin-bottom: 10px;">
      <strong style="color: ${accentColor};">Key Indicators (${detailedInfo.totalIndicators}):</strong>
      <div style="margin-top: 4px; font-size: 13px; line-height: 1.4;">
        ${indicators.map(indicator => `<span style="display: inline-block; background: ${badgeBg}; color: ${badgeText}; padding: 2px 6px; margin: 2px 2px; border-radius: 5px; font-size: 11px;">${indicator}</span>`).join('')}
      </div>
    </div>
  `;

  // Add framework detection if available
  if (detailedInfo.frameworks && detailedInfo.frameworks.length > 0) {
    resultHTML += `
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Detected Frameworks:</strong>
        <span style="font-weight:700;">${detailedInfo.frameworks.join(', ').toUpperCase()}</span>
      </div>
    `;
  }

  // Add static generator information if available
  if (detailedInfo.generators && detailedInfo.generators.length > 0) {
    resultHTML += `
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Static Site Generator:</strong>
        <span style="font-weight:700;">${detailedInfo.generators.join(', ').toUpperCase()}</span>
      </div>
    `;
  }

  // Add timing information if available
  if (detailedInfo.timing) {
    resultHTML += `
      <div style="margin-bottom: 8px;">
        <strong style="color: ${accentColor};">Performance:</strong>
        <div style="font-size: 12px; color: ${textSecondary}; margin-top: 2px;">
          DOM Ready: ${detailedInfo.timing.domContentLoaded}ms
          ${detailedInfo.timing.firstContentfulPaint ?
            ` | FCP: ${detailedInfo.timing.firstContentfulPaint}ms` : ''}
        </div>
      </div>
    `;
  }

  return resultHTML;
}

// Export functions for use in other files
if (typeof window !== 'undefined') {
  window.getTypeColor = getTypeColor;
  window.getConfidenceBar = getConfidenceBar;
  window.createResultsHTML = createResultsHTML;
}

} // End injection guard
