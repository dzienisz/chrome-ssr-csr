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
    fastDomSlowFcp: 25,        // Fast DOMContentLoaded + slow FCP = CSR
    decisiveCsrSsrCap: 10,     // Max SSR score when raw HTML is near-empty vs rendered
    // Modern platform signals (see platform-detector.js)
    speculationRules: 15,      // <script type="speculationrules"> in raw HTML = MPA
    crossDocViewTransition: 15,// @view-transition{navigation:auto} = MPA that animates
    declarativePartialUpdate: 20 // <?start/?end + <template for> = JS-free streaming SSR
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
    maxConfidenceHybrid: 70,  // Maximum for Hybrid
    maxConfidenceNoComparison: 60 // Maximum when raw HTML comparison unavailable
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
    decisiveCsrRatio: 0.1,  // Below this = near-conclusive CSR (caps SSR signals)
    ssrRatio: 0.7,          // Raw/rendered ratio above this = likely SSR
    minRenderedLength: 200  // Minimum text (either side) to trust the comparison
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
    // #__next / #__NEXT_DATA__ are Pages Router only; the App Router (default
    // since Next 13) emits neither — it streams the RSC payload through
    // self.__next_f, caught by frameworkContentPatterns below.
    nextjs: '#__next, #__NEXT_DATA__',
    gatsby: '#___gatsby',
    // data-remix-run is Remix v1; v2 and React Router 7 emit the
    // data-remix-managed-head / data-remix-stylesheet pair instead.
    remix: '[data-remix-run], [data-remix-managed-head], [data-remix-stylesheet]',
    // Vue ecosystem
    vue: '[data-v-app], [data-v]',
    nuxt: '#__nuxt, #__NUXT__, #__NUXT_DATA__',
    // Svelte ecosystem
    svelte: '[class*="svelte-"]',
    sveltekit: '#svelte, [data-sveltekit-preload-data], [data-sveltekit-preload-code]',
    // Angular — ngh is the hydration annotation emitted by Angular SSR (v16+),
    // ng-server-context lands on <html> when the render came from the server
    angular: '[ng-version], [_nghost], [_ngcontent], [ngh], [ng-server-context]',
    // Other frameworks
    astro: '[data-astro-cid], [data-astro-island], astro-island',
    qwik: '[q\\:container]',
    solidjs: '[data-solid], [data-hk]',
    preact: '[data-preact]',
    lit: '[data-lit]',
    marko: '[data-marko], [data-marko-key]',
    ember: '.ember-application, [id^="ember"][class~="ember-view"]',
    // Server-rendered stacks that enhance markup rather than replace it.
    // All of these put their markers in the HTML the server sends, so the
    // raw-evidence rule in framework-detector credits them correctly.
    turbo: 'turbo-frame, turbo-stream, [data-turbo-frame]',
    livewire: '[wire\\:id], [wire\\:snapshot]',
    inertia: '[data-page][id="app"], #app[data-page]',
    phoenix: '[data-phx-main], [data-phx-session], [phx-click]',
    blazor: '[b-render-mode], [data-blazor]',
    // Lightweight/AJAX libraries
    htmx: '[hx-get], [hx-post], [hx-trigger], [data-hx-get]',
    alpinejs: '[x-data], [x-init]',
    stimulus: '[data-controller][data-action]',
    unpoly: '[up-target], [up-follow], [up-layer]',
    // CMS platforms
    wordpress: 'link[href*="wp-content"], script[src*="wp-includes"]',
    shopify: 'script[src*="cdn.shopify.com"], link[href*="cdn.shopify.com"]',
    webflow: 'html[data-wf-site], script[src*="webflow"]',
    wix: 'meta[name="generator"][content*="Wix"]',
    squarespace: 'script[src*="squarespace"]'
  },

  // Framework markers that live in script contents rather than the DOM.
  // Matched against raw/rendered HTML source, so they also work for
  // frameworks that stopped emitting identifiable elements.
  frameworkContentPatterns: {
    nextjs: ['self.__next_f', '__next_f.push'],
    remix: ['__reactRouterContext', '__remixContext'],
    nuxt: ['window.__NUXT__', '__NUXT_DATA__'],
    gatsby: ['window.___gatsby', 'window.page.staticQueryHashes'],
    solidjs: ['_$HY.'],
    qwik: ['qwikloader'],
    // SvelteKit 2 hydrates through a kit.start() call and a __sveltekit_*
    // globals object; neither leaves an element behind.
    sveltekit: ['__sveltekit_', 'kit.start(', 'data-sveltekit'],
    // Deno Fresh serializes island props into __FRSH_STATE.
    fresh: ['__FRSH_STATE'],
    // Vike (ex vite-plugin-ssr) and TanStack Start both ship their hydration
    // payload as an inline JSON block rather than a marked container.
    vike: ['vike_pageContext', '_vikePageContext'],
    tanstackStart: ['__TSR_', 'tsrScript'],
    // Blazor loads its runtime from a fixed path; matched against script src
    // as well as inline text (see collectScriptSource).
    blazor: ['_framework/blazor']
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
    gitbook: 'meta[name="generator"][content*="GitBook"]',
    astro: 'meta[name="generator"][content*="Astro"]',
    gatsby: 'meta[name="generator"][content*="Gatsby"]',
    vitepress: 'meta[name="generator"][content*="VitePress"]',
    zola: 'meta[name="generator"][content*="Zola"]',
    sphinx: 'meta[name="generator"][content*="Sphinx"]',
    middleman: 'meta[name="generator"][content*="Middleman"]',
    bridgetown: 'meta[name="generator"][content*="Bridgetown"]',
    nikola: 'meta[name="generator"][content*="Nikola"]',
    publii: 'meta[name="generator"][content*="Publii"]',
    quarto: 'meta[name="generator"][content*="Quarto"]',
    antora: 'meta[name="generator"][content*="Antora"]'
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
    'window.__staticRouterHydrationData',
    '__remixContext',
    '__NUXT_DATA__',
    '__sveltekit_',
    '__FRSH_STATE',
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
