// Prevent duplicate injection
if (typeof window.__SSR_CSR_ANALYZER_LOADED__ === 'undefined') {
  window.__SSR_CSR_ANALYZER_LOADED__ = true;

/**
 * src/core/config.js
 */

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
    // React ecosystem
    react: '[data-reactroot], [data-reactid], [data-react-checksum]',
    nextjs: '#__next, #__NEXT_DATA__',
    gatsby: '#___gatsby',
    remix: '[data-remix-run]',
    // Vue ecosystem
    vue: '[data-v-app], [data-v]',
    nuxt: '#__nuxt, #__NUXT__',
    // Svelte ecosystem
    svelte: '[class*="svelte-"]',
    sveltekit: '#svelte',
    // Angular
    angular: '[ng-version], [_nghost], [_ngcontent]',
    // Other frameworks
    astro: '[data-astro-cid], [data-astro-island]',
    qwik: '[q\\:container]',
    solidjs: '[data-solid], [data-hk]',
    preact: '[data-preact]',
    lit: '[data-lit]',
    // Lightweight/AJAX libraries
    htmx: '[hx-get], [hx-post], [hx-trigger]',
    alpinejs: '[x-data], [x-init]',
    // CMS platforms
    wordpress: 'link[href*="wp-content"], script[src*="wp-includes"]',
    shopify: 'script[src*="cdn.shopify.com"], link[href*="cdn.shopify.com"]',
    webflow: 'html[data-wf-site], script[src*="webflow"]',
    wix: 'meta[name="generator"][content*="Wix"]',
    squarespace: 'script[src*="squarespace"]'
  },

  // Static site generator detection
  staticGenerators: {
    jekyll: 'meta[name="generator"][content*="Jekyll"]',
    hugo: 'meta[name="generator"][content*="Hugo"]',
    eleventy: 'meta[name="generator"][content*="Eleventy"]',
    hexo: 'meta[name="generator"][content*="Hexo"]',
    pelican: 'meta[name="generator"][content*="Pelican"]',
    docusaurus: 'meta[name="generator"][content*="Docusaurus"]',
    vuepress: 'meta[name="generator"][content*="VuePress"]',
    mkdocs: 'meta[name="generator"][content*="MkDocs"]',
    gitbook: 'meta[name="generator"][content*="GitBook"]'
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
 * src/detectors/comparison-detector.js
 */

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
 * src/detectors/csr-pattern-detector.js
 */

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
 * src/detectors/hybrid-detector.js
 */

/**
 * Hybrid Pattern Detector Module
 * Detects patterns specific to hybrid/islands architecture
 */

/**
 * Detect hybrid rendering patterns (islands, partial hydration, RSC)
 * @returns {Object} Detection results with hybrid indicators
 */
function detectHybridPatterns() {
  const indicators = [];
  let hybridScore = 0;
  const details = {};

  // Detect Astro islands architecture
  const astroIslands = document.querySelectorAll('[data-astro-island], astro-island');
  if (astroIslands.length > 0) {
    hybridScore += 30;
    indicators.push(`Astro islands architecture (${astroIslands.length} islands)`);
    details.astroIslands = astroIslands.length;
  }

  // Detect multiple hydration targets (common in partial hydration)
  const hydrationTargets = document.querySelectorAll(
    '[data-hydrate], [data-island], [data-client], [client\\:load], [client\\:idle], [client\\:visible]'
  );
  if (hydrationTargets.length > 1) {
    hybridScore += 25;
    indicators.push(`Partial hydration pattern (${hydrationTargets.length} targets)`);
    details.hydrationTargets = hydrationTargets.length;
  }

  // Detect React Server Components patterns
  const rscPayload = document.querySelector('script#__NEXT_DATA__[type="application/json"]');
  const hasServerComponents = document.querySelector('[data-rsc], [data-server-component]') !== null;
  if (hasServerComponents) {
    hybridScore += 20;
    indicators.push("React Server Components detected");
    details.hasRSC = true;
  }

  // Detect streaming markers (Suspense boundaries)
  const suspenseBoundaries = document.querySelectorAll('template[data-suspense], [data-suspense-boundary]');
  const streamingComments = document.body.innerHTML.includes('<!--$-->') ||
                            document.body.innerHTML.includes('<!--/$-->');
  if (suspenseBoundaries.length > 0 || streamingComments) {
    hybridScore += 15;
    indicators.push("Streaming SSR with Suspense boundaries");
    details.hasStreaming = true;
  }

  // Detect progressive enhancement patterns
  const enhancementMarkers = document.querySelectorAll(
    '[data-enhance], [data-progressive], [data-turbo], [data-turbolinks]'
  );
  if (enhancementMarkers.length > 0) {
    hybridScore += 15;
    indicators.push("Progressive enhancement pattern");
    details.progressiveEnhancement = true;
  }

  // Detect Qwik's resumability (hybrid by design)
  const qwikContainer = document.querySelector('[q\\:container]');
  if (qwikContainer) {
    hybridScore += 25;
    indicators.push("Qwik resumability (hybrid architecture)");
    details.qwikResumability = true;
  }

  // Check for mixed content patterns (rich SSR content + client interactivity)
  const hasRichContent = document.querySelectorAll('article, main, [role="main"]').length > 0 &&
                         document.body.innerText.trim().length > 500;
  const hasClientInteractivity = document.querySelectorAll(
    '[onclick], [onchange], button[type="submit"], form[action], [data-action]'
  ).length > 3;

  if (hasRichContent && hasClientInteractivity) {
    hybridScore += 10;
    indicators.push("Mixed SSR content with client interactivity");
  }

  return {
    hybridScore,
    indicators,
    details
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.detectHybridPatterns = detectHybridPatterns;
}


/**
 * src/detectors/content-detector.js
 */

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
 * src/detectors/framework-detector.js
 */

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
 * src/detectors/meta-detector.js
 */

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
 * src/detectors/performance-detector.js
 */

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
 * src/detectors/performance-collector.js
 */

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
      
      // Timeout after 2 seconds (quick analysis)
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 2000);
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
      
      // Collect for 1 second (quick analysis)
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 1000);
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
      
      // Timeout after 2 seconds (user might not interact)
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 2000);
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
      
      // Collect for 1 second (quick analysis)
      setTimeout(() => {
        observer.disconnect();
        resolve(tbt);
      }, 1000);
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


/**
 * src/detectors/page-type-detector.js
 */

/**
 * Page Type Detector
 * Detects the type of page being analyzed
 */

/**
 * Detect if page is an e-commerce/shopping page
 */
function isEcommercePage() {
  // Check for common e-commerce indicators
  const ecommerceSelectors = [
    '[class*="cart"]',
    '[id*="cart"]',
    '[class*="checkout"]',
    '[id*="checkout"]',
    '[class*="product"]',
    '[id*="product"]',
    '[class*="shop"]',
    '[itemtype*="Product"]',
    'button[class*="add-to-cart"]',
    'button[class*="buy"]',
    '.price',
    '[class*="price"]'
  ];
  
  for (const selector of ecommerceSelectors) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  
  // Check URL patterns
  const url = window.location.href.toLowerCase();
  const ecommercePatterns = ['/shop', '/store', '/product', '/cart', '/checkout', '/buy'];
  return ecommercePatterns.some(pattern => url.includes(pattern));
}

/**
 * Detect if page has authentication (login/signup)
 */
function isAuthPage() {
  // Check for login/signup forms
  const authSelectors = [
    'form[action*="login"]',
    'form[action*="signin"]',
    'form[action*="signup"]',
    'form[action*="register"]',
    'input[type="password"]',
    '[class*="login"]',
    '[class*="signin"]',
    '[class*="signup"]',
    '[id*="login"]',
    '[id*="signin"]'
  ];
  
  for (const selector of authSelectors) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  
  // Check URL patterns
  const url = window.location.href.toLowerCase();
  const authPatterns = ['/login', '/signin', '/signup', '/register', '/auth'];
  return authPatterns.some(pattern => url.includes(pattern));
}

/**
 * Detect if page is a blog/article
 */
function isBlogPage() {
  // Check for blog/article indicators
  const blogSelectors = [
    'article',
    '[itemtype*="Article"]',
    '[itemtype*="BlogPosting"]',
    '.post',
    '.article',
    '[class*="blog"]',
    '[class*="post"]',
    'time[datetime]',
    '.author',
    '[rel="author"]'
  ];
  
  let blogIndicators = 0;
  for (const selector of blogSelectors) {
    if (document.querySelector(selector)) {
      blogIndicators++;
    }
  }
  
  // Check URL patterns
  const url = window.location.href.toLowerCase();
  const blogPatterns = ['/blog', '/post', '/article', '/news', '/story'];
  const hasUrlPattern = blogPatterns.some(pattern => url.includes(pattern));
  
  // Require at least 2 indicators or URL pattern
  return blogIndicators >= 2 || hasUrlPattern;
}

/**
 * Detect if page is documentation
 */
function isDocsPage() {
  // Check for docs indicators
  const docsSelectors = [
    '[class*="docs"]',
    '[id*="docs"]',
    '[class*="documentation"]',
    'nav[class*="sidebar"]',
    '.toc',
    '[class*="table-of-contents"]',
    'code',
    'pre'
  ];
  
  let docsIndicators = 0;
  for (const selector of docsSelectors) {
    if (document.querySelector(selector)) {
      docsIndicators++;
    }
  }
  
  // Check URL patterns
  const url = window.location.href.toLowerCase();
  const docsPatterns = ['/docs', '/documentation', '/api', '/guide', '/tutorial', '/reference'];
  const hasUrlPattern = docsPatterns.some(pattern => url.includes(pattern));
  
  // Require at least 3 indicators or URL pattern
  return docsIndicators >= 3 || hasUrlPattern;
}

/**
 * Detect if page is a homepage
 */
function isHomepage() {
  const url = window.location.href;
  const urlObj = new URL(url);
  
  // Check if URL is root or just domain
  const isRoot = urlObj.pathname === '/' || urlObj.pathname === '';
  
  // Check for common homepage indicators
  const hasHero = document.querySelector('[class*="hero"], [id*="hero"], .jumbotron');
  const hasCTA = document.querySelector('[class*="cta"], button[class*="get-started"]');
  
  return isRoot && (hasHero || hasCTA);
}

/**
 * Detect if page is a dashboard/app
 */
function isAppPage() {
  // Check for app/dashboard indicators
  const appSelectors = [
    '[class*="dashboard"]',
    '[id*="dashboard"]',
    '[class*="app"]',
    '[role="application"]',
    'nav[class*="sidebar"]',
    '[class*="sidebar"]',
    '.app-container',
    '[data-testid*="app"]'
  ];
  
  let appIndicators = 0;
  for (const selector of appSelectors) {
    if (document.querySelector(selector)) {
      appIndicators++;
    }
  }
  
  // Check URL patterns
  const url = window.location.href.toLowerCase();
  const appPatterns = ['/app', '/dashboard', '/admin', '/console', '/panel'];
  const hasUrlPattern = appPatterns.some(pattern => url.includes(pattern));
  
  // Check for many interactive elements (typical of apps)
  const buttonCount = document.querySelectorAll('button').length;
  const inputCount = document.querySelectorAll('input').length;
  const isInteractive = buttonCount > 10 || inputCount > 5;
  
  return appIndicators >= 2 || hasUrlPattern || isInteractive;
}

/**
 * Detect page type
 * Returns the most specific type found
 */
function detectPageType() {
  console.log('[PageType] Detecting page type...');
  
  // Check in order of specificity
  if (isEcommercePage()) {
    console.log('[PageType] Detected: ecommerce');
    return 'ecommerce';
  }
  
  if (isAuthPage()) {
    console.log('[PageType] Detected: auth');
    return 'auth';
  }
  
  if (isBlogPage()) {
    console.log('[PageType] Detected: blog');
    return 'blog';
  }
  
  if (isDocsPage()) {
    console.log('[PageType] Detected: docs');
    return 'docs';
  }
  
  if (isAppPage()) {
    console.log('[PageType] Detected: app');
    return 'app';
  }
  
  if (isHomepage()) {
    console.log('[PageType] Detected: homepage');
    return 'homepage';
  }
  
  console.log('[PageType] Detected: other');
  return 'other';
}

/**
 * Get additional page characteristics
 */
function getPageCharacteristics() {
  return {
    hasVideo: document.querySelector('video') !== null,
    imageCount: document.querySelectorAll('img').length,
    hasForm: document.querySelector('form') !== null,
    formCount: document.querySelectorAll('form').length,
    hasAnalytics: detectAnalytics(),
    languageCode: document.documentElement.lang || 'unknown',
    isResponsive: document.querySelector('meta[name="viewport"]') !== null,
    hasPWA: 'serviceWorker' in navigator && document.querySelector('link[rel="manifest"]') !== null
  };
}

/**
 * Detect analytics tools
 */
function detectAnalytics() {
  const analytics = [];
  
  // Google Analytics
  if (window.ga || window.gtag || window.dataLayer) {
    analytics.push('GA');
  }
  
  // Google Tag Manager
  if (window.google_tag_manager) {
    analytics.push('GTM');
  }
  
  // Mixpanel
  if (window.mixpanel) {
    analytics.push('Mixpanel');
  }
  
  // Hotjar
  if (window.hj) {
    analytics.push('Hotjar');
  }
  
  // Segment
  if (window.analytics && window.analytics.track) {
    analytics.push('Segment');
  }
  
  // Amplitude
  if (window.amplitude) {
    analytics.push('Amplitude');
  }
  
  return analytics;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.detectPageType = detectPageType;
  window.getPageCharacteristics = getPageCharacteristics;
}


/**
 * src/detectors/device-detector.js
 */

/**
 * Device & Context Detector
 * Collects device, browser, and connection information
 */

/**
 * Detect device type based on screen width
 */
function getDeviceType() {
  const width = window.innerWidth;
  
  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Get screen information
 */
function getScreenInfo() {
  return {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen.colorDepth,
    orientation: window.screen.orientation?.type || 'unknown'
  };
}

/**
 * Detect if device has touch capability
 */
function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get browser information
 */
function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let engineName = 'Unknown';
  
  // Detect browser
  if (ua.includes('Firefox/')) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Gecko';
  } else if (ua.includes('Edg/')) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Blink';
  } else if (ua.includes('Chrome/')) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Blink';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'WebKit';
  } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
    browserName = 'Opera';
    browserVersion = ua.match(/(?:Opera|OPR)\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Blink';
  }
  
  return {
    name: browserName,
    version: browserVersion,
    engine: engineName,
    userAgent: ua
  };
}

/**
 * Get connection information
 * Uses Network Information API if available
 */
function getConnectionInfo() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) {
    return {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false
    };
  }
  
  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || null, // Mbps
    rtt: connection.rtt || null, // milliseconds
    saveData: connection.saveData || false
  };
}

/**
 * Get timezone and language
 */
function getLocaleInfo() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || 'unknown',
    languages: navigator.languages || []
  };
}

/**
 * Detect if user has reduced motion preference
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Detect if user prefers dark mode
 */
function prefersDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get memory information (if available)
 */
function getMemoryInfo() {
  if (performance.memory) {
    return {
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      usedJSHeapSize: performance.memory.usedJSHeapSize
    };
  }
  return null;
}

/**
 * Get hardware concurrency (CPU cores)
 */
function getHardwareConcurrency() {
  return navigator.hardwareConcurrency || null;
}

/**
 * Collect all device and context information
 */
function collectDeviceInfo() {
  console.log('[Device] Collecting device information...');
  
  const deviceInfo = {
    deviceType: getDeviceType(),
    screen: getScreenInfo(),
    isTouchDevice: isTouchDevice(),
    browser: getBrowserInfo(),
    connection: getConnectionInfo(),
    locale: getLocaleInfo(),
    preferences: {
      reducedMotion: prefersReducedMotion(),
      darkMode: prefersDarkMode()
    },
    hardware: {
      cpuCores: getHardwareConcurrency(),
      memory: getMemoryInfo()
    }
  };
  
  console.log('[Device] Device info collected:', deviceInfo);
  return deviceInfo;
}

/**
 * Get simplified device info for telemetry
 * (removes sensitive/detailed information)
 */
function getDeviceInfoForTelemetry() {
  const fullInfo = collectDeviceInfo();
  
  return {
    deviceType: fullInfo.deviceType,
    screenWidth: fullInfo.screen.width,
    screenHeight: fullInfo.screen.height,
    devicePixelRatio: fullInfo.screen.devicePixelRatio,
    isTouchDevice: fullInfo.isTouchDevice,
    browserName: fullInfo.browser.name,
    browserVersion: fullInfo.browser.version,
    engineName: fullInfo.browser.engine,
    connectionType: fullInfo.connection.type,
    effectiveType: fullInfo.connection.effectiveType,
    downlink: fullInfo.connection.downlink,
    rtt: fullInfo.connection.rtt,
    saveData: fullInfo.connection.saveData,
    timezone: fullInfo.locale.timezone,
    language: fullInfo.locale.language,
    prefersReducedMotion: fullInfo.preferences.reducedMotion,
    prefersDarkMode: fullInfo.preferences.darkMode,
    cpuCores: fullInfo.hardware.cpuCores
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.collectDeviceInfo = collectDeviceInfo;
  window.getDeviceInfoForTelemetry = getDeviceInfoForTelemetry;
}


/**
 * src/core/scoring.js
 */

/**
 * Scoring Module
 * Calculates final scores and classification
 */

/**
 * Calculate final classification based on scores
 * @param {number} ssrScore - Total SSR score
 * @param {number} csrScore - Total CSR score
 * @param {number} hybridScore - Total hybrid score (islands, partial hydration)
 * @param {Array} indicators - All indicators found
 * @returns {Object} Classification with confidence
 */
function calculateClassification(ssrScore, csrScore, hybridScore, indicators) {
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

  // Check for strong hybrid signals first (islands architecture, partial hydration)
  const isStrongHybrid = hybridScore >= 30;
  const hasBothSignals = ssrScore >= 20 && csrScore >= 20;

  // Determine render type and confidence based on thresholds
  if (isStrongHybrid || (hasBothSignals && ssrPercentage >= 35 && ssrPercentage <= 65)) {
    // Strong hybrid indicators or balanced scores with both SSR and CSR signals
    renderType = "Hybrid/Islands Architecture";
    confidence = Math.min(50 + hybridScore + indicatorBonus, config.confidence.maxConfidenceHybrid + 10);
  } else if (ssrPercentage >= config.thresholds.ssr) {
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
    confidence = Math.min(baseConfidence + 10 + (hybridScore / 2), config.confidence.maxConfidenceHybrid);
  }

  return {
    renderType,
    confidence: Math.max(confidence, config.confidence.minConfidence),
    ssrPercentage,
    hybridScore,
    indicatorCount
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.calculateClassification = calculateClassification;
}


/**
 * src/core/analyzer.js
 */

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
    const hybridResults = window.detectHybridPatterns();

    // Fetch and compare raw HTML vs rendered DOM (async - most important for accuracy)
    const comparisonResults = await window.compareInitialVsRendered();

    // Phase 1: Collect Core Web Vitals (async, with timeout to prevent blocking)
    const coreWebVitalsPromise = typeof window.collectCoreWebVitals === 'function' 
      ? Promise.race([
          window.collectCoreWebVitals(),
          new Promise(resolve => setTimeout(() => resolve(null), 500)) // 500ms max
        ])
      : Promise.resolve(null);
    
    const coreWebVitals = await coreWebVitalsPromise;

    // Phase 1: Detect page type (sync)
    const pageType = typeof window.detectPageType === 'function'
      ? window.detectPageType()
      : 'other';

    // Phase 1: Collect device info (sync)
    const deviceInfo = typeof window.getDeviceInfoForTelemetry === 'function'
      ? window.getDeviceInfoForTelemetry()
      : null;

    // Combine all scores
    let ssrScore = 0;
    let csrScore = 0;
    let hybridScore = hybridResults.hybridScore;
    const indicators = [];
    const detailedInfo = {};

    // Add hybrid detection results
    indicators.push(...hybridResults.indicators);
    Object.assign(detailedInfo, { hybrid: hybridResults.details });

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
    const classification = window.calculateClassification(ssrScore, csrScore, hybridScore, indicators);

    return {
      renderType: classification.renderType,
      confidence: classification.confidence,
      indicators: indicators.length > 0 ? indicators : ["basic analysis"],
      
      // Phase 1: Add new data fields
      coreWebVitals,
      pageType,
      deviceInfo,
      
      detailedInfo: {
        ssrScore,
        csrScore,
        ssrPercentage: classification.ssrPercentage,
        hybridScore: classification.hybridScore,
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
        hybridScore: 0,
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



} // End of injection guard
