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
