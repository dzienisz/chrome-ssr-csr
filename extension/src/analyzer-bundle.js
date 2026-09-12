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


/**
 * src/detectors/comparison-detector.js
 */

/**
 * Raw HTML Comparison Module
 * Fetches raw HTML and compares to rendered DOM to detect CSR vs SSR
 */

/**
 * Extract user-visible text from a body element.
 * Strips script/style/noscript/template so inline JS/CSS never counts as
 * content. Works on a detached clone (textContent semantics), so the raw
 * and rendered sides are measured identically.
 * @param {HTMLElement|null} body - Body element (live or from a parsed document)
 * @returns {string} Normalized visible text
 */
function extractVisibleText(body) {
  if (!body) return "";
  const clone = body.cloneNode(true);
  clone
    .querySelectorAll(
      "script, style, noscript, template, #ssr-detector-probe-data",
    )
    .forEach((el) => el.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

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
      credentials: "same-origin",
      headers: { Accept: "text/html" },
    });

    if (!response.ok) {
      return null;
    }

    const rawHTML = await response.text();

    // Response headers of the same document the user is on. Same-origin, so
    // every header is readable. delivery-detector turns them into a
    // build-time / edge-cached / per-request classification — the "where was
    // this rendered" half of the question the verdict alone cannot answer.
    const responseHeaders = {};
    try {
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });
    } catch (e) {
      // Headers iteration is not expected to throw; ignore if it does.
    }

    // Parse raw HTML
    const parser = new DOMParser();
    const rawDoc = parser.parseFromString(rawHTML, "text/html");
    const rawBodyText = extractVisibleText(rawDoc.body);

    // Get current rendered DOM text, measured the same way
    const renderedText = extractVisibleText(document.body);

    // Calculate content lengths
    const rawLength = rawBodyText.length;
    const renderedLength = renderedText.length;

    // Calculate content ratio
    const contentRatio = rawLength / Math.max(renderedLength, 1);

    // Determine if CSR or SSR based on ratio.
    // Both branches require enough real text to judge (symmetric guards).
    const minLength = config.contentComparison.minRenderedLength;
    const isLikelyCSR =
      contentRatio < config.contentComparison.csrRatio &&
      renderedLength > minLength;
    const isLikelySSR =
      contentRatio > config.contentComparison.ssrRatio && rawLength > minLength;

    // Server sent almost none of the visible text: near-conclusive CSR
    const isDecisiveCSR =
      contentRatio < config.contentComparison.decisiveCsrRatio &&
      renderedLength > minLength;

    return {
      rawLength,
      renderedLength,
      contentRatio: Math.round(contentRatio * 100) / 100,
      isLikelyCSR,
      isLikelySSR,
      isDecisiveCSR,
      responseStatus: response.status,
      responseHeaders,
      // Parsed raw document, so other detectors can check pre-JS markers.
      // Not serializable — must not be copied into analyzer output.
      rawDocument: rawDoc,
      // Raw source for markers no CSS selector can reach (script contents,
      // processing instructions). Same rule: never copy into the output.
      rawHTML,
    };
  } catch (e) {
    // Fetch failed (CORS, network error, etc.) - can't determine
    console.debug("CSR/SSR Detector: Raw HTML fetch failed", e.message);
    return null;
  }
}

function getDetectionBodyHTML() {
  const body = document.body;
  if (!body) return "";
  if (!body.querySelector("#ssr-detector-probe-data")) return body.innerHTML;
  const clone = body.cloneNode(true);
  clone
    .querySelectorAll("#ssr-detector-probe-data")
    .forEach((el) => el.remove());
  return clone.innerHTML;
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.getDetectionBodyHTML = getDetectionBodyHTML;
  window.extractVisibleText = extractVisibleText;
  window.compareInitialVsRendered = compareInitialVsRendered;
}


/**
 * src/detectors/delivery-detector.js
 */

/**
 * Delivery Detector Module
 *
 * Answers the half of the question the SSR/CSR verdict cannot: *where* the
 * HTML was produced. "SSR" covers a page rendered once at build time and
 * served from an S3 bucket, a page rendered by an origin server on every
 * request, and everything in between — and those have completely different
 * performance and caching implications.
 *
 * Evidence comes from the response headers of the raw-HTML fetch (same
 * origin, so every header is readable) plus the Server-Timing entries of the
 * real document navigation.
 *
 * Deliberately contributes ZERO to the SSR/CSR score. A CSR single-page app
 * served from a CDN is still a CSR app; delivery mode describes transport,
 * not rendering, and mixing the two is how detectors start lying.
 */

/**
 * Cache headers worth reading, most specific first. The first one present
 * decides the headline cache state; the rest are reported alongside it.
 */
const CACHE_HEADERS = [
  "x-vercel-cache",
  "x-nextjs-cache",
  "cf-cache-status",
  "x-cache",
  "x-drupal-cache",
  "x-litespeed-cache",
  "x-proxy-cache",
  "cache-status",
];

/** Cache states, normalized across the dozen vendor spellings. */
const CACHE_HIT = "HIT";
const CACHE_MISS = "MISS";
const CACHE_STALE = "STALE";
const CACHE_BYPASS = "BYPASS";
const CACHE_PRERENDER = "PRERENDER";

/**
 * Which state wins when tiers disagree, strongest evidence first. "Strongest"
 * means closest to "the browser did not wait for the origin".
 */
const CACHE_PRECEDENCE = [
  CACHE_PRERENDER,
  CACHE_HIT,
  CACHE_STALE,
  CACHE_MISS,
  CACHE_BYPASS,
];

/**
 * CDNs and hosts, in priority order — the first match wins, so specific
 * vendors come before the generic `server:` sniffs at the end.
 * @type {Array<{name: string, test: (h: Object) => boolean}>}
 */
const HOST_SIGNATURES = [
  { name: "Vercel", test: (h) => "x-vercel-id" in h || "x-vercel-cache" in h },
  { name: "Netlify", test: (h) => "x-nf-request-id" in h || /netlify/i.test(h.server || "") },
  { name: "Cloudflare", test: (h) => "cf-ray" in h || /cloudflare/i.test(h.server || "") },
  { name: "Fastly", test: (h) => "x-served-by" in h && /cache-/.test(h["x-served-by"] || "") },
  { name: "CloudFront", test: (h) => "x-amz-cf-id" in h || /cloudfront/i.test(h["x-cache"] || "") },
  { name: "Akamai", test: (h) => "x-akamai-transformed" in h || "akamai-grn" in h },
  { name: "GitHub Pages", test: (h) => /github\.com/i.test(h.server || "") && "x-github-request-id" in h },
  { name: "Amazon S3", test: (h) => /amazons3/i.test(h.server || "") || "x-amz-request-id" in h },
  { name: "Firebase Hosting", test: (h) => "x-fh-requestid" in h },
  { name: "Fly.io", test: (h) => "fly-request-id" in h },
  { name: "Render", test: (h) => "x-render-origin-server" in h || /render/i.test(h["rndr-id"] || "") },
  { name: "Shopify", test: (h) => "x-shopify-stage" in h || "x-shopid" in h },
  { name: "Google Frontend", test: (h) => /gse|google frontend/i.test(h.server || "") },
  { name: "Bunny CDN", test: (h) => "cdn-requestid" in h || /bunnycdn/i.test(h.server || "") },
  { name: "KeyCDN", test: (h) => /keycdn/i.test(h.server || "") },
  { name: "Sucuri", test: (h) => /sucuri/i.test(h.server || "") },
  { name: "Varnish", test: (h) => /varnish/i.test(h.via || h["x-varnish"] || "") || "x-varnish" in h },
];

/** Origin/runtime hints from `server:` and `x-powered-by:`. */
const RUNTIME_SIGNATURES = [
  { name: "Next.js", test: (h) => /next\.js/i.test(h["x-powered-by"] || "") || "x-nextjs-cache" in h },
  { name: "Nuxt", test: (h) => /nuxt/i.test(h["x-powered-by"] || "") },
  { name: "Express", test: (h) => /express/i.test(h["x-powered-by"] || "") },
  { name: "PHP", test: (h) => /php/i.test(h["x-powered-by"] || "") },
  { name: "ASP.NET", test: (h) => /asp\.net/i.test(h["x-powered-by"] || "") || "x-aspnet-version" in h },
  { name: "WordPress", test: (h) => /wp-json/i.test(h.link || "") || "x-litespeed-cache" in h },
  { name: "Drupal", test: (h) => "x-drupal-cache" in h || "x-generator" in h && /drupal/i.test(h["x-generator"]) },
  { name: "Rails", test: (h) => /phusion|passenger|puma/i.test(h.server || "") || "x-runtime" in h },
  { name: "Django", test: (h) => /wsgiserver|gunicorn/i.test(h.server || "") },
  { name: "Kestrel", test: (h) => /kestrel/i.test(h.server || "") },
  { name: "nginx", test: (h) => /nginx|openresty/i.test(h.server || "") },
  { name: "Apache", test: (h) => /apache/i.test(h.server || "") },
  { name: "Caddy", test: (h) => /caddy/i.test(h.server || "") },
  { name: "LiteSpeed", test: (h) => /litespeed/i.test(h.server || "") },
];

/**
 * Normalize one cache-state token to a CACHE_* constant.
 * @param {string} token
 * @returns {string|null}
 */
function normalizeCacheToken(token) {
  const v = String(token).toUpperCase();
  if (v.includes("PRERENDER")) return CACHE_PRERENDER;
  if (v.includes("STALE") || v.includes("REVALIDATED") || v.includes("UPDATING")) return CACHE_STALE;
  if (v.includes("BYPASS") || v.includes("DYNAMIC") || v.includes("NONE") || v.includes("EXPIRED")) return CACHE_BYPASS;
  if (v.includes("HIT")) return CACHE_HIT;
  if (v.includes("MISS")) return CACHE_MISS;
  return null;
}

/**
 * Normalize a vendor cache header value to one of the CACHE_* constants.
 *
 * A request that crosses more than one cache tier gets one token per tier,
 * ordered origin-first: Fastly returns `X-Cache: MISS, HIT` when the shield
 * missed and the edge served. The token that decides what the *browser*
 * experienced is therefore the last one — searching the whole string for
 * keywords instead would read `HIT, MISS` as a hit, and `HIT, STALE` as
 * stale, both of which describe a tier the user never talked to.
 *
 * @param {string} value
 * @returns {string|null}
 */
function normalizeCacheState(value) {
  if (!value) return null;

  const tokens = String(value)
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return null;

  // Walk back from the edge: the nearest tier that says anything recognizable
  // wins, so an unlabelled trailing token cannot erase a known state.
  for (let i = tokens.length - 1; i >= 0; i--) {
    const state = normalizeCacheToken(tokens[i]);
    if (state) return state;
  }
  return null;
}

/**
 * Parse the RFC 9211 `Cache-Status` header, which modern CDNs emit alongside
 * (or instead of) their proprietary ones: `Cache-Status: ExampleCDN; hit`.
 * @param {string} value
 * @returns {string|null}
 */
function parseCacheStatusHeader(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (/;\s*hit/.test(v)) return CACHE_HIT;
  if (/;\s*fwd=stale|stale/.test(v)) return CACHE_STALE;
  if (/;\s*fwd=bypass|fwd=method|fwd=uri-miss/.test(v)) return CACHE_BYPASS;
  if (/;\s*fwd=/.test(v)) return CACHE_MISS;
  return null;
}

/**
 * Parse a `cache-control` value into the directives that matter here.
 * @param {string} value
 * @returns {{maxAge: number|null, sMaxAge: number|null, noStore: boolean,
 *            private: boolean, immutable: boolean, revalidate: number|null}}
 */
function parseCacheControl(value) {
  const out = {
    maxAge: null,
    sMaxAge: null,
    noStore: false,
    private: false,
    immutable: false,
    revalidate: null,
  };
  if (!value) return out;
  const v = String(value).toLowerCase();
  const num = (re) => {
    const m = v.match(re);
    return m ? parseInt(m[1], 10) : null;
  };
  out.maxAge = num(/(?:^|[,\s])max-age=(\d+)/);
  out.sMaxAge = num(/s-maxage=(\d+)/);
  out.revalidate = num(/stale-while-revalidate=(\d+)/);
  out.noStore = /no-store/.test(v);
  out.private = /\bprivate\b/.test(v);
  out.immutable = /immutable/.test(v);
  return out;
}

/**
 * Server-Timing from the *document* navigation (not the detector's own
 * fetch), which is where origins report render/cache durations.
 * @returns {Array<{name: string, duration: number, description: string}>}
 */
function readServerTiming() {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    if (!nav || !Array.isArray(nav.serverTiming)) return [];
    return nav.serverTiming.slice(0, 12).map((entry) => ({
      name: String(entry.name || "").slice(0, 40),
      duration: Math.round(entry.duration || 0),
      description: String(entry.description || "").slice(0, 60),
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Time to first byte of the document navigation, rebased on activationStart
 * the same way performance-detector rebases paint timings.
 * @returns {number|null}
 */
function readTtfb() {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    if (!nav) return null;
    const activationStart = nav.activationStart || 0;
    const ttfb = (nav.responseStart || 0) - activationStart;
    if (!isFinite(ttfb) || ttfb <= 0) return null;
    return Math.round(ttfb);
  } catch (e) {
    return null;
  }
}

/**
 * Classify how the document reached the browser.
 *
 * @param {Object|null} headers - Lowercased response headers of the raw fetch
 * @returns {Object} Detection results — always score-neutral
 */
function detectDelivery(headers) {
  // Always empty — see the module comment: transport is reported, never voted
  // on, and `indicators` is the channel that moves the confidence score.
  const indicators = [];
  const signals = [];
  const evidence = [];

  const h = headers || {};
  const has = Object.keys(h).length > 0;

  const cdn = has ? (HOST_SIGNATURES.find((s) => s.test(h)) || {}).name || null : null;
  const runtime = has ? (RUNTIME_SIGNATURES.find((s) => s.test(h)) || {}).name || null : null;

  // Every cache tier that reported a state, in the order below. A site behind
  // two of them (Cloudflare in front of Vercel is routine) can legitimately
  // answer HIT at one tier and MISS at another, and reporting only the first
  // match hides half of what happened.
  const cacheLayers = [];
  for (const header of CACHE_HEADERS) {
    const raw = h[header];
    if (!raw) continue;
    const state =
      header === "cache-status" ? parseCacheStatusHeader(raw) : normalizeCacheState(raw);
    if (state) cacheLayers.push({ header, state });
  }

  // The headline state is the strongest thing any tier reported, not the
  // first one in header order. Cloudflare in front of Vercel answering
  // `cf-cache-status: HIT` with a stale `x-vercel-cache: MISS` attached means
  // the browser got a cached response and the origin did no work — reading
  // the Vercel header first would file that under "answered by the origin",
  // which is the opposite of what happened. Either way round, one tier
  // serving from cache is enough: a hit anywhere means no origin render for
  // this visit.
  const vendorCache =
    CACHE_PRECEDENCE.find((state) => cacheLayers.some((layer) => layer.state === state)) || null;

  const cacheControl = parseCacheControl(h["cache-control"]);
  const age = h.age != null ? parseInt(h.age, 10) : null;
  const prerendered =
    h["x-nextjs-prerender"] === "1" ||
    vendorCache === CACHE_PRERENDER ||
    /prerender/i.test(h["x-nextjs-cache"] || "");

  // --- Mode classification. Order matters: the most specific evidence wins.
  let mode = "unknown";
  let modeLabel = "Unknown delivery";
  let modeDetail = "No cache or CDN headers were returned for this document.";

  if (prerendered) {
    mode = "prerendered";
    modeLabel = "Prerendered at build time";
    modeDetail = "The HTML was rendered ahead of the request and served as a static artifact.";
    evidence.push("prerender header present");
  } else if (vendorCache === CACHE_HIT || vendorCache === CACHE_STALE) {
    mode = "edge-cached";
    modeLabel = vendorCache === CACHE_STALE ? "Served stale from cache" : "Served from CDN cache";
    modeDetail =
      "A cache between the origin and the browser answered this request, so no server render happened for it.";
    evidence.push(`cache ${vendorCache.toLowerCase()}`);
  } else if (vendorCache === CACHE_MISS || vendorCache === CACHE_BYPASS) {
    mode = "origin";
    modeLabel = "Answered by the origin server";
    modeDetail = "The cache did not answer this request, so it travelled all the way to the origin.";
    evidence.push(`cache ${vendorCache.toLowerCase()}`);
  } else if (cacheControl.noStore || cacheControl.private) {
    mode = "dynamic";
    modeLabel = "Uncacheable response";
    modeDetail = "Cache-Control forbids shared caches from storing this document, so every visitor reaches the origin.";
    evidence.push("cache-control forbids caching");
  } else if (age != null && age > 0) {
    mode = "edge-cached";
    modeLabel = "Served from cache";
    modeDetail = `An intermediary has been holding this response for ${age}s.`;
    evidence.push(`age: ${age}s`);
  } else if (cacheControl.sMaxAge != null && cacheControl.sMaxAge > 0) {
    mode = "edge-cached";
    modeLabel = "Cacheable at the edge";
    modeDetail = `The origin allows shared caches to reuse this document for ${cacheControl.sMaxAge}s (ISR-style revalidation).`;
    evidence.push(`s-maxage: ${cacheControl.sMaxAge}s`);
  } else if (cacheControl.maxAge === 0) {
    // Checked *after* s-maxage on purpose: `public, max-age=0, s-maxage=86400`
    // is the canonical ISR header pair, and it means "browsers revalidate,
    // shared caches hold it for a day" — the opposite of uncacheable. Reading
    // the max-age=0 first would file every ISR page under "dynamic".
    mode = "dynamic";
    modeLabel = "Revalidated on every visit";
    modeDetail = "Cache-Control tells caches to revalidate before reusing this document.";
    evidence.push("max-age=0");
  } else if (/cookie/i.test(h.vary || "")) {
    mode = "dynamic";
    modeLabel = "Dynamic, per-visitor response";
    modeDetail = "The response varies by cookie, so it is produced for this visitor rather than reused.";
    evidence.push("vary: cookie");
  } else if (h["last-modified"] && h.etag) {
    mode = "static";
    modeLabel = "Static file";
    modeDetail = "The document is served like a file on disk: a Last-Modified date and a validator, no cache negotiation.";
    evidence.push("last-modified + etag");
  }

  if (cdn) evidence.push(`CDN: ${cdn}`);
  if (runtime) evidence.push(`runtime: ${runtime}`);
  if (age != null && !evidence.some((e) => e.startsWith("age:"))) evidence.push(`age: ${age}s`);

  const serverTiming = readServerTiming();
  const ttfb = readTtfb();

  const delivery = {
    mode,
    modeLabel,
    modeDetail,
    cdn,
    runtime,
    server: h.server ? String(h.server).slice(0, 60) : null,
    poweredBy: h["x-powered-by"] ? String(h["x-powered-by"]).slice(0, 60) : null,
    cacheState: vendorCache,
    cacheLayers,
    age,
    cacheControl: h["cache-control"] ? String(h["cache-control"]).slice(0, 120) : null,
    sMaxAge: cacheControl.sMaxAge,
    staleWhileRevalidate: cacheControl.revalidate,
    compression: h["content-encoding"] || null,
    varies: h.vary ? String(h.vary).slice(0, 120) : null,
    lastModified: h["last-modified"] || null,
    ttfb,
    serverTiming,
    evidence,
    available: has,
  };

  if (!has) {
    return {
      ssrScore: 0,
      csrScore: 0,
      indicators,
      signals,
      details: { delivery },
    };
  }

  signals.push({
    id: "delivery.mode",
    label: modeLabel,
    impact: "info",
    weight: 0,
    detail: modeDetail,
  });

  if (cdn) {
    signals.push({
      id: "delivery.cdn",
      label: `Served through ${cdn}`,
      impact: "info",
      weight: 0,
      detail:
        cacheLayers.length > 1
          ? `Cache tiers reported ${cacheLayers.map((l) => `${l.state} (${l.header})`).join(", ")}.`
          : vendorCache
            ? `Cache state reported as ${vendorCache}.`
            : "Edge network identified from response headers.",
    });
  }

  if (runtime) {
    signals.push({
      id: "delivery.runtime",
      label: `Origin runtime: ${runtime}`,
      impact: "info",
      weight: 0,
      detail: "Identified from Server / X-Powered-By response headers.",
    });
  }

  if (ttfb != null) {
    signals.push({
      id: "delivery.ttfb",
      label: `TTFB ${ttfb}ms`,
      impact: "info",
      weight: 0,
      detail:
        ttfb < 200
          ? "Fast first byte — typical of a cache hit or a static file."
          : ttfb < 800
            ? "Moderate first byte — typical of an origin render."
            : "Slow first byte — the origin spent real time producing this document.",
    });
  }

  return {
    ssrScore: 0,
    csrScore: 0,
    indicators,
    signals,
    details: { delivery },
  };
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.detectDelivery = detectDelivery;
  window.parseCacheControl = parseCacheControl;
  window.normalizeCacheState = normalizeCacheState;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { detectDelivery, parseCacheControl, normalizeCacheState };
}


/**
 * src/detectors/dom-diff-detector.js
 */

/**
 * DOM Diff Detector Module
 *
 * The verdict says *what* the page is. This says *which parts of it* the
 * server actually sent. It lines up the regions of the pre-JS document
 * against the same regions in the live DOM and reports, per region, how much
 * visible text arrived from the server and how much JavaScript added.
 *
 * That turns an opaque "CSR, 88%" into something actionable: the header and
 * footer came from the server, `#feed` was empty until JS filled it with
 * 12,400 characters.
 *
 * Score-neutral by design. Region attribution is an explanation of the
 * comparison signal, not a second vote on it — the overall ratio is already
 * scored once in comparison-detector, and scoring it twice would double-count
 * the single strongest input to the verdict.
 */

/** Elements never worth reporting as a region of their own. */
const REGION_SKIP = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "LINK",
  "META",
  "BR",
  "HR",
]);

/**
 * Tags that are prose, not structure. A <main> holding six paragraphs is one
 * region; splitting it into six paragraph rows is how a useful report turns
 * into a wall of noise.
 */
const CONTENT_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "DT",
  "DD",
  "SPAN",
  "A",
  "TD",
  "TH",
  "TR",
  "BLOCKQUOTE",
  "FIGCAPTION",
  "PRE",
  "CODE",
  "LABEL",
  "BUTTON",
]);

/** Maximum depth walked from <body> when collecting regions. */
const MAX_REGION_DEPTH = 4;

/** Regions below this rendered text length are noise, not structure. */
const MIN_REGION_CHARS = 40;

/**
 * Escape an id for use in a selector. Ids legitimately contain characters
 * that are syntax in CSS (`#__next`, `:r0:`, `foo.bar`), and an unescaped one
 * turns querySelector into a thrown SyntaxError rather than a miss.
 *
 * @param {string} value
 * @returns {string}
 */
function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return String(value).replace(/([^\w-])/g, "\\$1");
}

/**
 * A stable-ish key for matching an element between two parses of the same
 * page. Ids are used when present (they survive hydration); otherwise the
 * tag plus its position among same-tag siblings, which survives hydration in
 * every framework that reuses the server markup.
 *
 * @param {Element} el
 * @returns {string}
 */
function regionKey(el) {
  const parts = [];
  let node = el;
  let depth = 0;
  while (node && node.nodeType === 1 && node.tagName !== "BODY" && depth < 12) {
    if (node.id) {
      parts.unshift(`#${cssEscape(node.id)}`);
      break;
    }
    const tag = node.tagName.toLowerCase();
    let index = 1;
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === node.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    parts.unshift(index > 1 ? `${tag}:nth-of-type(${index})` : tag);
    node = node.parentElement;
    depth++;
  }
  return parts.join(" > ") || "body";
}

/**
 * A short human label for a region — the landmark role or heading a developer
 * would use to find it, falling back to the selector.
 *
 * @param {Element} el
 * @param {string} key
 * @returns {string}
 */
function regionLabel(el, key) {
  const tag = el.tagName.toLowerCase();
  const landmark = {
    header: "Header",
    nav: "Navigation",
    main: "Main content",
    article: "Article",
    aside: "Sidebar",
    footer: "Footer",
    form: "Form",
    table: "Table",
  }[tag];
  if (landmark) return landmark;
  const role = el.getAttribute && el.getAttribute("role");
  if (role === "main") return "Main content";
  if (role === "banner") return "Header";
  if (role === "navigation") return "Navigation";
  if (role === "contentinfo") return "Footer";
  return key;
}

/**
 * Per-analysis memo, so a region's text is measured once, not once per depth.
 *
 * Reset at the start of every analysis. The keys are live DOM elements that
 * stay reachable after a run ends, so nothing here is ever collected on its
 * own — and the popup's re-run button and the panel's re-run-on-navigation
 * both analyze the same document twice. Without the reset, the second run
 * reports the first run's text lengths and every number downstream of them
 * (region origins, serverSharePct, the diff signals) describes a DOM that has
 * already changed.
 */
let textLengthCache = new WeakMap();

/**
 * Visible text length of an element, counting the same characters
 * comparison-detector counts for whole documents (script/style/noscript/
 * template excluded) so the two numbers are directly comparable.
 *
 * Walks text nodes instead of cloning the subtree: this runs once per region
 * on both sides of the diff, and cloning a page-sized subtree per region is
 * quadratic on exactly the content-heavy pages worth analyzing.
 *
 * @param {Element|null} el
 * @returns {number}
 */
function visibleTextLength(el) {
  if (!el) return 0;
  const cached = textLengthCache.get(el);
  if (cached !== undefined) return cached;

  let text = "";
  const doc = el.ownerDocument || document;
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      let parent = node.parentElement;
      while (parent) {
        if (REGION_SKIP.has(parent.tagName) || parent.id === "ssr-detector-probe-data") {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent === el) break;
        parent = parent.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    text += node.nodeValue || "";
    node = walker.nextNode();
  }

  const length = text.replace(/\s+/g, " ").trim().length;
  textLengthCache.set(el, length);
  return length;
}

/**
 * Structural children of an element: what a developer would call the parts of
 * this region, with script/style noise and this extension's probe removed.
 *
 * @param {Element} el
 * @returns {Array<Element>}
 */
function structuralChildren(el) {
  return Array.from(el.children).filter(
    (child) =>
      !REGION_SKIP.has(child.tagName) && child.id !== "ssr-detector-probe-data",
  );
}

/**
 * Look up the counterpart of a rendered element in the pre-JavaScript
 * document. A key can be a selector the raw document rejects (ids are chosen
 * by the page, not by us), so a failure here means "not present", never an
 * exception.
 *
 * @param {HTMLElement|null} rawBody
 * @param {string} key
 * @returns {Element|null}
 */
function findInRaw(rawBody, key) {
  if (!rawBody) return null;
  try {
    return rawBody.querySelector(key);
  } catch (e) {
    return null;
  }
}

/**
 * Walk the rendered document alongside the served one and report the regions
 * where the two differ.
 *
 * The descent rule is the whole trick. A container the server filled in
 * completely is not itself interesting — its parts are, so the walk goes
 * inside it and reports the header, the article and the footer separately. A
 * container that JavaScript filled IS the interesting boundary: `#root` going
 * from empty to twelve thousand characters is the finding, and splitting it
 * into the components React happened to mount would bury it.
 *
 * @param {HTMLElement|null} renderedBody
 * @param {HTMLElement|null} rawBody
 * @returns {Array<Object>} Region records
 */
function collectRegions(renderedBody, rawBody) {
  const regions = [];
  if (!renderedBody) return regions;

  const walk = (element, depth) => {
    for (const child of structuralChildren(element)) {
      const renderedChars = visibleTextLength(child);

      // Too small to be a region of its own: look inside it instead.
      if (renderedChars < MIN_REGION_CHARS) {
        if (depth < MAX_REGION_DEPTH) walk(child, depth + 1);
        continue;
      }

      const key = regionKey(child);
      const rawElement = findInRaw(rawBody, key);
      const rawChars = visibleTextLength(rawElement);
      const ratio = renderedChars > 0 ? rawChars / renderedChars : 1;

      let origin;
      if (!rawElement) origin = "client";
      else if (ratio >= 0.7) origin = "server";
      else if (ratio <= 0.2) origin = "client";
      else origin = "mixed";

      const children = structuralChildren(child);
      // A wrapper whose only child holds all its text adds nothing — unless
      // that child is prose, in which case the wrapper is the landmark worth
      // naming (a <footer> around one <p> is "Footer", not "footer > p").
      const isPassThrough =
        children.length === 1 &&
        !CONTENT_TAGS.has(children[0].tagName) &&
        visibleTextLength(children[0]) >= renderedChars - 5;
      const worthSplitting =
        origin !== "client" &&
        children.filter(
          (kid) =>
            !CONTENT_TAGS.has(kid.tagName) && visibleTextLength(kid) >= MIN_REGION_CHARS,
        ).length >= 2;

      if (depth < MAX_REGION_DEPTH && (isPassThrough || worthSplitting)) {
        walk(child, depth + 1);
        continue;
      }

      regions.push({
        key,
        label: regionLabel(child, key),
        rawChars,
        renderedChars,
        addedChars: Math.max(0, renderedChars - rawChars),
        origin,
        existedInRawHtml: Boolean(rawElement),
      });
    }
  };

  walk(renderedBody, 1);
  return regions;
}

/**
 * Count elements in a document body, excluding this extension's own probe.
 * @param {HTMLElement|null} body
 * @returns {number}
 */
function countElements(body) {
  if (!body) return 0;
  const total = body.querySelectorAll("*").length;
  const probe = body.querySelectorAll(
    "#ssr-detector-probe-data, #ssr-detector-probe-data *",
  ).length;
  return total - probe;
}

/**
 * Attribute the rendered page's content to the server or to client JavaScript,
 * region by region.
 *
 * @param {Document|null} rawDocument - Parsed pre-JS document
 * @returns {Object} Score-neutral detection results
 */
function detectDomDiff(rawDocument) {
  // Intentionally always empty: `indicators` is the scored channel that feeds
  // the confidence bonus. This module explains the verdict, it does not vote,
  // so everything it has to say goes into `signals`.
  const indicators = [];
  const signals = [];

  textLengthCache = new WeakMap();

  if (!rawDocument || !rawDocument.body || !document.body) {
    return {
      ssrScore: 0,
      csrScore: 0,
      indicators,
      signals,
      details: { domDiff: { available: false, regions: [] } },
    };
  }

  const regions = collectRegions(document.body, rawDocument.body);

  let serverChars = 0;
  let clientChars = 0;
  for (const region of regions) {
    serverChars += Math.min(region.rawChars, region.renderedChars);
    clientChars += region.addedChars;
  }

  regions.sort((a, b) => b.renderedChars - a.renderedChars);

  const totalChars = serverChars + clientChars;
  const serverSharePct = totalChars > 0 ? Math.round((serverChars / totalChars) * 100) : 100;

  const rawElements = countElements(rawDocument.body);
  const renderedElements = countElements(document.body);
  const elementsAddedByJs = Math.max(0, renderedElements - rawElements);

  const serverRegions = regions.filter((r) => r.origin === "server");
  const clientRegions = regions.filter((r) => r.origin === "client");
  const mixedRegions = regions.filter((r) => r.origin === "mixed");

  const domDiff = {
    available: true,
    serverChars,
    clientChars,
    serverSharePct,
    rawElements,
    renderedElements,
    elementsAddedByJs,
    regionCount: regions.length,
    serverRegionCount: serverRegions.length,
    clientRegionCount: clientRegions.length,
    mixedRegionCount: mixedRegions.length,
    regions: regions.slice(0, 25),
    biggestClientRegion: clientRegions.length
      ? clientRegions.reduce((a, b) => (b.addedChars > a.addedChars ? b : a))
      : null,
  };

  if (regions.length > 0) {
    signals.push({
      id: "diff.serverShare",
      label: `Server supplied ${serverSharePct}% of the visible text`,
      impact: "info",
      weight: 0,
      detail: `${serverChars.toLocaleString()} characters arrived in the HTML; JavaScript added ${clientChars.toLocaleString()}.`,
    });
  }

  if (elementsAddedByJs > 0) {
    signals.push({
      id: "diff.elements",
      label: `JavaScript added ${elementsAddedByJs.toLocaleString()} elements`,
      impact: "info",
      weight: 0,
      detail: `${rawElements.toLocaleString()} elements in the initial HTML, ${renderedElements.toLocaleString()} after scripts ran.`,
    });
  }

  if (domDiff.biggestClientRegion && domDiff.biggestClientRegion.addedChars > 200) {
    const region = domDiff.biggestClientRegion;
    signals.push({
      id: "diff.clientRegion",
      label: `${region.label} is filled in by JavaScript`,
      impact: "info",
      weight: 0,
      detail: `${region.key} gained ${region.addedChars.toLocaleString()} characters after the initial HTML.`,
    });
  }

  // Server-rendered regions sitting next to client-filled ones is the
  // structural fingerprint of an islands / partial-hydration layout. Reported,
  // not scored — hybrid-detector owns that vote.
  if (serverRegions.length > 0 && clientRegions.length > 0) {
    signals.push({
      id: "diff.mixedLayout",
      label: "Server and client regions side by side",
      impact: "info",
      weight: 0,
      detail: `${serverRegions.length} region(s) came fully from the server, ${clientRegions.length} were produced in the browser.`,
    });
  }

  return { ssrScore: 0, csrScore: 0, indicators, signals, details: { domDiff } };
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.detectDomDiff = detectDomDiff;
  window.collectDomRegions = collectRegions;
  window.domRegionKey = regionKey;
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
  const signals = [];
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
      signals.push({
        id: "csr.spaRoot",
        label: "Single-page-app mount point",
        impact: "csr",
        weight: config.scoring.spaRootPattern,
        detail: `#${root.id} carries framework root markers — the whole page hangs off one container.`,
      });
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
      signals.push({
        id: "csr.noscript",
        label: "\u201cJavaScript required\u201d fallback",
        impact: "csr",
        weight: config.scoring.noscriptFallback,
        detail: "The page ships a <noscript> notice telling visitors the site needs JavaScript.",
      });
      break;
    }
  }

  // Check for empty initial HTML indicators
  // Look for common CSR patterns in the HTML structure
  const bodyClasses = document.body.className.toLowerCase();

  // Many CSR apps add classes dynamically after load
  if (bodyClasses.includes('js-loaded') ||
      bodyClasses.includes('app-loaded') ||
      bodyClasses.includes('hydrated')) {
    csrScore += 10;
    indicators.push("dynamic body class detected (CSR)");
    signals.push({
      id: "csr.bodyClass",
      label: "Body class set after boot",
      impact: "csr",
      weight: 10,
      detail: "A js-loaded / app-loaded / hydrated class was added to <body> by script.",
    });
  }

  return {
    ssrScore: 0,
    csrScore,
    indicators,
    signals,
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
  const signals = [];
  let hybridScore = 0;
  const details = {};

  // Detect Astro islands architecture
  const astroIslands = document.querySelectorAll(
    "[data-astro-island], astro-island",
  );
  if (astroIslands.length > 0) {
    hybridScore += 30;
    indicators.push(
      `Astro islands architecture (${astroIslands.length} islands)`,
    );
    signals.push({
      id: "hybrid.astroIslands",
      label: `Astro islands (${astroIslands.length})`,
      impact: "hybrid",
      weight: 30,
      detail: "Static HTML with independently hydrated interactive components dropped into it.",
    });
    details.astroIslands = astroIslands.length;
  }

  // Detect multiple hydration targets (common in partial hydration)
  const hydrationTargets = document.querySelectorAll(
    "[data-hydrate], [data-island], [data-client], [client\\:load], [client\\:idle], [client\\:visible]",
  );
  if (hydrationTargets.length > 1) {
    hybridScore += 25;
    indicators.push(
      `Partial hydration pattern (${hydrationTargets.length} targets)`,
    );
    signals.push({
      id: "hybrid.partialHydration",
      label: `Partial hydration (${hydrationTargets.length} targets)`,
      impact: "hybrid",
      weight: 25,
      detail: "Only marked regions get JavaScript; the rest of the page stays static server markup.",
    });
    details.hydrationTargets = hydrationTargets.length;
  }

  // Detect React Server Components patterns
  const hasServerComponents =
    document.querySelector("[data-rsc], [data-server-component]") !== null;
  if (hasServerComponents) {
    hybridScore += 20;
    indicators.push("React Server Components detected");
    signals.push({
      id: "hybrid.rsc",
      label: "React Server Components",
      impact: "hybrid",
      weight: 20,
      detail: "Components rendered on the server stream into a client tree that never ships their code.",
    });
    details.hasRSC = true;
  }

  // Detect streaming markers (Suspense boundaries)
  const suspenseBoundaries = document.querySelectorAll(
    "template[data-suspense], [data-suspense-boundary]",
  );
  const bodyHTML = window.getDetectionBodyHTML();
  const streamingComments =
    bodyHTML.includes("<!--$-->") || bodyHTML.includes("<!--/$-->");
  if (suspenseBoundaries.length > 0 || streamingComments) {
    hybridScore += 15;
    indicators.push("Streaming SSR with Suspense boundaries");
    signals.push({
      id: "hybrid.streaming",
      label: "Streaming SSR with Suspense",
      impact: "hybrid",
      weight: 15,
      detail: "The server flushed the shell first and filled the slow parts in as they resolved.",
    });
    details.hasStreaming = true;
  }

  // Detect progressive enhancement patterns
  const enhancementMarkers = document.querySelectorAll(
    "[data-enhance], [data-progressive], [data-turbo], [data-turbolinks]",
  );
  if (enhancementMarkers.length > 0) {
    hybridScore += 15;
    indicators.push("Progressive enhancement pattern");
    signals.push({
      id: "hybrid.progressive",
      label: "Progressive enhancement",
      impact: "hybrid",
      weight: 15,
      detail: "Server markup is enhanced in place (Turbo/Stimulus-style) instead of replaced by a client app.",
    });
    details.progressiveEnhancement = true;
  }

  // Detect Qwik's resumability (hybrid by design)
  const qwikContainer = document.querySelector("[q\\:container]");
  if (qwikContainer) {
    hybridScore += 25;
    indicators.push("Qwik resumability (hybrid architecture)");
    signals.push({
      id: "hybrid.qwik",
      label: "Qwik resumability",
      impact: "hybrid",
      weight: 25,
      detail: "State is serialized into the HTML so the client resumes rather than re-executing the app.",
    });
    details.qwikResumability = true;
  }

  // Check for mixed content patterns (rich SSR content + client interactivity)
  const hasRichContent =
    document.querySelectorAll('article, main, [role="main"]').length > 0 &&
    document.body.innerText.trim().length > 500;
  const hasClientInteractivity =
    document.querySelectorAll(
      '[onclick], [onchange], button[type="submit"], form[action], [data-action]',
    ).length > 3;

  if (hasRichContent && hasClientInteractivity) {
    hybridScore += 10;
    indicators.push("Mixed SSR content with client interactivity");
    signals.push({
      id: "hybrid.mixed",
      label: "Server content plus client interactivity",
      impact: "hybrid",
      weight: 10,
      detail: "A real document body alongside enough interactive controls to need a client runtime.",
    });
  }

  return {
    hybridScore,
    indicators,
    signals,
    details,
  };
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.detectHybridPatterns = detectHybridPatterns;
}


/**
 * src/detectors/platform-detector.js
 */

/**
 * Modern Platform Detector Module
 *
 * Signals from web-platform features that postdate the original scoring model
 * (2026): the Speculation Rules API, cross-document view transitions and
 * declarative partial updates. All three say something about a page's
 * rendering architecture that no framework marker does.
 *
 * Every signal is credited from the RAW HTML only. Speculation rules and
 * partial-update templates injected by JS after boot describe what the client
 * did, not what the server sent — the same rule framework-detector applies to
 * hydration markers.
 */

/**
 * @param {Document|null} rawDocument - Parsed raw (pre-JS) HTML document
 * @param {string|null} rawHTML - Raw HTML source for the same fetch
 * @returns {Object} Detection results with score and indicators
 */
function detectPlatformSignals(rawDocument, rawHTML) {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  const signals = [];
  let ssrScore = 0;
  let csrScore = 0;
  const details = {};

  const rawSource = rawHTML ||
    (rawDocument && rawDocument.documentElement
      ? rawDocument.documentElement.outerHTML
      : '');

  // Script bodies are excluded from every structural check below. A bundle
  // that merely contains the string "@view-transition { navigation: auto }"
  // (CSS-in-JS is full of them) is not a page using cross-document
  // transitions, and these branches move the SSR score.
  const rawMarkup = rawSource.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const rawStyles = rawDocument
    ? Array.from(rawDocument.querySelectorAll('style'))
        .map(el => el.textContent || '')
        .join('\n')
    : rawMarkup;

  // --- Speculation Rules: prerendering/prefetching whole documents only
  // makes sense when navigations *are* document loads, i.e. an MPA.
  if (rawDocument) {
    const specRules = rawDocument.querySelectorAll('script[type="speculationrules"]');
    if (specRules.length > 0) {
      ssrScore += config.scoring.speculationRules;
      indicators.push(`speculation rules in raw HTML (${specRules.length}) - multi-page architecture (SSR)`);
      signals.push({
        id: 'platform.speculationRules',
        label: `Speculation rules (${specRules.length})`,
        impact: 'ssr',
        weight: config.scoring.speculationRules,
        detail: 'The page asks the browser to prefetch or prerender whole documents, which only makes sense when navigation loads documents.'
      });
      details.speculationRules = specRules.length;
    }
  }

  // --- Cross-document view transitions: an MPA that animates between real
  // navigations. Only the at-rule form with navigation:auto is cross-document;
  // document.startViewTransition() (the SPA form) leaves no static marker.
  const crossDocVT = /@view-transition\s*\{[^}]*navigation\s*:\s*(auto|same-origin)/i.test(rawStyles);
  if (crossDocVT) {
    ssrScore += config.scoring.crossDocViewTransition;
    indicators.push('@view-transition navigation rule - cross-document transitions (SSR/MPA)');
    signals.push({
      id: 'platform.viewTransition',
      label: 'Cross-document view transitions',
      impact: 'ssr',
      weight: config.scoring.crossDocViewTransition,
      detail: 'An @view-transition rule animates between real navigations — a multi-page app that feels like an SPA.'
    });
    details.crossDocumentViewTransitions = true;
  }

  // --- Declarative partial updates: out-of-order HTML streaming with no JS
  // at all. DOMParser turns the processing instructions into bogus comments,
  // so the raw source is the only reliable place to look for them.
  const hasPartialMarkers = /<\?(start|end|marker)[\s?>]/.test(rawMarkup);
  // Structural check: a template[for] element, not the text of one.
  const hasTemplateFor = rawDocument
    ? rawDocument.querySelector('template[for]') !== null
    : /<template[^>]*\sfor\s*=/.test(rawMarkup);
  if (hasPartialMarkers && hasTemplateFor) {
    ssrScore += config.scoring.declarativePartialUpdate;
    indicators.push('declarative partial updates - JS-free streaming SSR');
    signals.push({
      id: 'platform.partialUpdates',
      label: 'Declarative partial updates',
      impact: 'ssr',
      weight: config.scoring.declarativePartialUpdate,
      detail: 'The server streams out-of-order HTML fragments that the browser patches in without any JavaScript.'
    });
    details.declarativePartialUpdates = true;
  }

  // --- Navigation context. Not scored here: performance-detector needs it to
  // decide whether the timing signals are trustworthy at all, and it is worth
  // reporting either way.
  const navContext = window.getNavigationContext();
  if (navContext.wasPrerendered) {
    indicators.push('page was prerendered before activation - timing signals adjusted');
    signals.push({
      id: 'platform.prerendered',
      label: 'Activated from a prerender',
      impact: 'info',
      weight: 0,
      detail: `The browser had already built this document ${navContext.activationStart}ms before you navigated to it.`
    });
  } else if (navContext.wasPrefetched) {
    indicators.push('navigation served from a prefetch - timing signals adjusted');
    signals.push({
      id: 'platform.prefetched',
      label: 'Served from a prefetch',
      impact: 'info',
      weight: 0,
      detail: 'The document bytes were fetched before you navigated, so its network timings are not this visit\u2019s.'
    });
  }
  details.navigationContext = navContext;

  return { ssrScore, csrScore, indicators, signals, details };
}

/**
 * How this document arrived, so timing-based signals can be corrected or
 * discarded. A prerendered document starts its clock long before the user
 * sees it (activationStart), and a prefetched one has a near-zero TTFB it
 * never actually paid — both distort the SSR/CSR timing heuristics.
 *
 * @returns {{wasPrerendered: boolean, wasPrefetched: boolean,
 *            activationStart: number, deliveryType: string,
 *            timingIsReliable: boolean}}
 */
function getNavigationContext() {
  const fallback = {
    wasPrerendered: false,
    wasPrefetched: false,
    activationStart: 0,
    deliveryType: '',
    timingIsReliable: true
  };

  try {
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (!navTiming) return fallback;

    // activationStart is 0 for normal navigations, > 0 once a prerendered
    // document is activated. document.prerendering only covers the window
    // where prerendering is still in flight.
    const activationStart = navTiming.activationStart || 0;
    const deliveryType = navTiming.deliveryType || '';
    const wasPrerendered = activationStart > 0 || document.prerendering === true;
    const wasPrefetched = deliveryType === 'navigational-prefetch';

    return {
      wasPrerendered,
      wasPrefetched,
      activationStart: Math.round(activationStart),
      deliveryType,
      timingIsReliable: !wasPrerendered && !wasPrefetched
    };
  } catch (e) {
    return fallback;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.detectPlatformSignals = detectPlatformSignals;
  window.getNavigationContext = getNavigationContext;
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


/**
 * src/detectors/framework-detector.js
 */

/**
 * Framework Detector Module
 * Detects JavaScript frameworks and their hydration patterns
 */

/**
 * Concatenate the inline script contents of a document, skipping this
 * extension's own bundles. The analyzer normally runs as a content script and
 * never lands in the DOM, but the validation harness injects it as a script
 * tag — without this guard it would detect the framework names in its own
 * config as if they were the page's.
 *
 * @param {Document|null} doc
 * @returns {string}
 */
function collectScriptSource(doc) {
  if (!doc) return "";
  try {
    const parts = [];
    doc.querySelectorAll("script").forEach((script) => {
      // The src and id attributes count as script source. Several frameworks
      // are only identifiable by the path they load their runtime from
      // (_framework/blazor, qwikloader) or by the id they hang their
      // hydration payload on (__FRSH_STATE, vike_pageContext) — the JSON
      // inside that tag says nothing about who wrote it.
      const src = script.getAttribute("src");
      if (src) parts.push(src);
      const id = script.getAttribute("id");
      if (id) parts.push(id);

      const text = script.textContent || "";
      if (!text) return;
      if (
        text.includes("__SSR_CSR_ANALYZER_LOADED__") ||
        text.includes("__SSR_CSR_TELEMETRY_LOADED__")
      )
        return;
      parts.push(text);
    });
    return parts.join("\n");
  } catch (e) {
    return "";
  }
}

/**
 * Detect frameworks and their rendering patterns
 * @param {Document|null} rawDocument - Parsed raw (pre-JS) HTML document, when
 *   the comparison fetch succeeded. Framework markers only count as hydration
 *   (SSR) evidence if they exist here; markers only in the rendered DOM are
 *   what a client-rendered app looks like after boot.
 * @returns {Object} Detection results with score and indicators
 */
function detectFrameworks(rawDocument) {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  const signals = [];
  let ssrScore = 0;
  let csrScore = 0;
  const detailedInfo = {};

  // Script-content markers: frameworks that ship no identifiable element.
  // Scoped to script contents rather than the whole serialized document, so a
  // docs page that merely *writes about* __next_f is not a Next.js app — and
  // so this detector never matches its own bundle when it is injected as a
  // script tag rather than as a content script.
  const renderedSource = collectScriptSource(document);
  const rawSource = collectScriptSource(rawDocument);

  const contentPatterns = config.frameworkContentPatterns || {};
  const contentMarkers = {};
  const rawContentMarkers = {};
  for (const [framework, patterns] of Object.entries(contentPatterns)) {
    contentMarkers[framework] = patterns.some((pat) =>
      renderedSource.includes(pat),
    );
    rawContentMarkers[framework] = patterns.some((pat) =>
      rawSource.includes(pat),
    );
  }

  // Detect framework hydration markers
  const frameworkMarkers = {};
  const rawFrameworkMarkers = {};
  for (const [framework, selector] of Object.entries(config.frameworks)) {
    try {
      if (framework === "react") {
        // Special handling for React
        frameworkMarkers[framework] =
          document.querySelector(selector) !== null ||
          document.getElementById("root")?._reactRootContainer !== undefined;
      } else {
        frameworkMarkers[framework] = document.querySelector(selector) !== null;
      }
      rawFrameworkMarkers[framework] = rawDocument
        ? rawDocument.querySelector(selector) !== null
        : false;
    } catch (e) {
      frameworkMarkers[framework] = false;
      rawFrameworkMarkers[framework] = false;
    }
  }

  // Merge selector hits with script-content hits, on both sides
  for (const framework of Object.keys(contentPatterns)) {
    frameworkMarkers[framework] =
      frameworkMarkers[framework] || contentMarkers[framework];
    rawFrameworkMarkers[framework] =
      rawFrameworkMarkers[framework] || rawContentMarkers[framework];
  }

  const foundFrameworks = Object.entries(frameworkMarkers)
    .filter(([_, found]) => found)
    .map(([framework, _]) => framework);

  if (foundFrameworks.length > 0) {
    detailedInfo.frameworks = foundFrameworks;

    const hydratedFrameworks = foundFrameworks.filter(
      (f) => rawFrameworkMarkers[f],
    );
    if (hydratedFrameworks.length > 0) {
      ssrScore += config.scoring.frameworkMarkers;
      indicators.push(
        `${hydratedFrameworks.join(", ")} hydration markers in raw HTML (SSR)`,
      );
      signals.push({
        id: "framework.hydrated",
        label: `${hydratedFrameworks.join(", ")} hydration markers in the served HTML`,
        impact: "ssr",
        weight: config.scoring.frameworkMarkers,
        detail:
          "The framework's markers are already in the bytes the server sent, so the browser hydrated existing markup rather than building it.",
      });
    } else {
      indicators.push(
        `${foundFrameworks.join(", ")} markers only in rendered DOM (not SSR evidence)`,
      );
      signals.push({
        id: "framework.renderedOnly",
        label: `${foundFrameworks.join(", ")} markers appear only after scripts run`,
        impact: "csr",
        weight: 0,
        detail:
          "The framework is there, but nothing it emits was in the served HTML — the signature of a client-rendered app.",
      });
    }
  }

  // Detect static site generators
  const staticGeneratorMarkers = {};
  for (const [generator, selector] of Object.entries(config.staticGenerators)) {
    try {
      staticGeneratorMarkers[generator] =
        document.querySelector(selector) !== null;
    } catch (e) {
      staticGeneratorMarkers[generator] = false;
    }
  }

  const foundGenerators = Object.entries(staticGeneratorMarkers)
    .filter(([_, found]) => found)
    .map(([generator, _]) => generator);

  if (foundGenerators.length > 0) {
    ssrScore += config.scoring.staticGenerator;
    indicators.push(
      `${foundGenerators.join(", ")} static site generator detected (SSR)`,
    );
    signals.push({
      id: "framework.staticGenerator",
      label: `Built by ${foundGenerators.join(", ")}`,
      impact: "ssr",
      weight: config.scoring.staticGenerator,
      detail: "A static site generator produced this HTML ahead of the request.",
    });
    detailedInfo.generators = foundGenerators;
  }

  // Check for serialized data (strong SSR indicator)
  const bodyHTML = window.getDetectionBodyHTML();
  const hasInlineData =
    config.serializedDataPatterns.some((pattern) =>
      bodyHTML.includes(pattern),
    ) || /window\.__[\w_]+__\s*=/.test(bodyHTML);

  if (hasInlineData) {
    ssrScore += config.scoring.serializedData;
    indicators.push("serialized data detected (SSR)");
    signals.push({
      id: "framework.serializedData",
      label: "Server state embedded in the page",
      impact: "ssr",
      weight: config.scoring.serializedData,
      detail:
        "A serialized data payload (__NEXT_DATA__, __INITIAL_STATE__, an RSC stream) ships with the document so the client can resume from it.",
    });
  }

  // Analyze script patterns
  const scripts = document.querySelectorAll("script[src]");
  let frameworkScriptCount = 0;
  let hasLazyChunks = false;
  let hasHydrationScripts = false;

  scripts.forEach((script) => {
    const src = script.src.toLowerCase();

    if (
      src.includes("react") ||
      src.includes("vue") ||
      src.includes("angular") ||
      src.includes("svelte") ||
      src.includes("solid")
    ) {
      frameworkScriptCount++;
    }

    if (
      src.includes("chunk") ||
      src.includes("_next/static") ||
      src.includes("_nuxt/")
    ) {
      hasLazyChunks = true;
    }

    if (src.includes("hydrat") || src.includes("client")) {
      hasHydrationScripts = true;
    }
  });

  if (frameworkScriptCount > 0) {
    if (hasLazyChunks || hasHydrationScripts) {
      ssrScore += config.scoring.ssrHydrationScripts;
      indicators.push("SSR hydration scripts detected");
      signals.push({
        id: "framework.hydrationScripts",
        label: "Hydration/chunked framework bundles",
        impact: "ssr",
        weight: config.scoring.ssrHydrationScripts,
        detail: "Script names follow the code-split hydration layout meta-frameworks emit.",
      });
    } else {
      csrScore += config.scoring.csrFrameworkScripts;
      indicators.push("CSR framework scripts detected");
      signals.push({
        id: "framework.csrScripts",
        label: "Framework loaded as a plain bundle",
        impact: "csr",
        weight: config.scoring.csrFrameworkScripts,
        detail: "A framework runtime is loaded with none of the hydration plumbing a server-rendered build produces.",
      });
    }
  }

  // Check for client-side routing
  const hasClientRouting = config.routerSelectors.some((selector) => {
    try {
      return document.querySelector(selector) !== null;
    } catch (e) {
      return false;
    }
  });

  if (hasClientRouting) {
    csrScore += config.scoring.clientRouting;
    indicators.push("client-side routing detected (CSR)");
    signals.push({
      id: "framework.clientRouting",
      label: "Client-side router outlet",
      impact: "csr",
      weight: config.scoring.clientRouting,
      detail: "A router outlet element is present, so navigation swaps views in the browser instead of loading documents.",
    });
  }

  return {
    ssrScore,
    csrScore,
    indicators,
    signals,
    details: detailedInfo,
  };
}

// Export for use in other modules
if (typeof window !== "undefined") {
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
  const signals = [];
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
    signals.push({
      id: "meta.framework",
      label: "Meta tags name a server framework",
      impact: "ssr",
      weight: config.scoring.ssrFrameworkMeta,
      detail: "A generator/framework meta tag points at a server-rendering stack.",
    });
  }

  if (hasRichMeta) {
    ssrScore += config.scoring.richMeta;
    indicators.push("rich meta tags present (SSR)");
    signals.push({
      id: "meta.rich",
      label: "Complete social/SEO metadata",
      impact: "ssr",
      weight: config.scoring.richMeta,
      detail: "Description and Open Graph/Twitter tags are filled in — crawlers get a usable document.",
    });
  }

  // Check for structured data (JSON-LD)
  const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (structuredDataScripts.length > 0) {
    ssrScore += config.scoring.structuredData;
    indicators.push("structured data present (SSR)");
    signals.push({
      id: "meta.structuredData",
      label: `JSON-LD structured data (${structuredDataScripts.length})`,
      impact: "ssr",
      weight: config.scoring.structuredData,
      detail: "Schema.org blocks are in the document, which search engines read without running scripts.",
    });
  }

  return {
    ssrScore,
    csrScore: 0,
    indicators,
    signals,
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
  const signals = [];
  let ssrScore = 0;
  let csrScore = 0;
  const detailedInfo = {};

  const performanceEntries = performance.getEntriesByType('navigation');

  if (performanceEntries.length > 0) {
    const navTiming = performanceEntries[0];
    const domContentLoadedTime = navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart;
    const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0];

    // A prerendered document's timings are measured from when the prerender
    // started, not from when the user navigated: paint often lands *before*
    // activation, so raw FCP reads as impossibly fast. Rebase on
    // activationStart, the way the Paint Timing spec prescribes.
    const navContext = typeof window.getNavigationContext === 'function'
      ? window.getNavigationContext()
      : { activationStart: 0, deliveryType: '', timingIsReliable: true };
    const rawFcp = firstContentfulPaint ? firstContentfulPaint.startTime : null;
    const fcpTime = rawFcp != null
      ? Math.max(0, rawFcp - navContext.activationStart)
      : null;

    // A prefetched navigation paid its network cost earlier, so both the
    // "fast DOM" and "fast FCP" branches below would fire on architecture
    // that has nothing to do with where the HTML was rendered. Skip the
    // timing heuristics entirely rather than score them wrong.
    if (!navContext.timingIsReliable) {
      indicators.push('speculative navigation - timing signals skipped');
      signals.push({
        id: 'performance.speculative',
        label: 'Timing signals skipped',
        impact: 'info',
        weight: 0,
        detail: 'This document was prerendered or prefetched, so its timings describe the speculation, not this visit.'
      });
      detailedInfo.timing = {
        domContentLoaded: Math.round(domContentLoadedTime),
        firstContentfulPaint: fcpTime != null ? Math.round(fcpTime) : null,
        adjustedForActivation: navContext.activationStart > 0,
        deliveryType: navContext.deliveryType
      };
      return { ssrScore, csrScore, indicators, signals, details: detailedInfo };
    }

    // Key CSR indicator: Fast DOM ready + slow FCP
    // This means the initial HTML loaded quickly (because it's minimal),
    // but content took a while to appear (because it was loaded via JavaScript)
    if (domContentLoadedTime < config.performance.fastDOMReady &&
        fcpTime && fcpTime > config.performance.slowFCP) {
      csrScore += config.scoring.fastDomSlowFcp;
      indicators.push("fast DOM ready but slow FCP (CSR pattern)");
      signals.push({
        id: 'performance.fastDomSlowFcp',
        label: 'Empty document parsed fast, painted late',
        impact: 'csr',
        weight: config.scoring.fastDomSlowFcp,
        detail: `DOM ready in ${Math.round(domContentLoadedTime)}ms but nothing painted until ${Math.round(fcpTime)}ms — the browser had to build the page.`
      });
    }
    // Fast FCP with reasonable DOM time suggests SSR (content was in initial HTML)
    else if (fcpTime && fcpTime < config.performance.fastFCP) {
      ssrScore += config.scoring.fastFCP;
      indicators.push("fast first contentful paint (SSR)");
      signals.push({
        id: 'performance.fastFcp',
        label: `First paint at ${Math.round(fcpTime)}ms`,
        impact: 'ssr',
        weight: config.scoring.fastFCP,
        detail: 'Content appeared almost immediately, which means it was in the HTML rather than assembled by script.'
      });
    }

    // Very slow DOM ready can indicate heavy server processing (SSR) or slow network
    // This is less reliable, so we use lower weight
    if (domContentLoadedTime > config.performance.slowDOMReady) {
      // Slow DOM + slow FCP = might be slow SSR or network issues
      // Slow DOM + fast FCP = SSR (server took time, but content was ready)
      if (fcpTime && fcpTime < config.performance.fastFCP) {
        ssrScore += 10;
        indicators.push("slow DOM but fast paint (SSR)");
        signals.push({
          id: 'performance.slowDomFastPaint',
          label: 'Server took time, content was ready',
          impact: 'ssr',
          weight: 10,
          detail: `DOM ready took ${Math.round(domContentLoadedTime)}ms but paint landed at ${Math.round(fcpTime)}ms.`
        });
      }
    }

    detailedInfo.timing = {
      domContentLoaded: Math.round(domContentLoadedTime),
      firstContentfulPaint: fcpTime != null ? Math.round(fcpTime) : null,
      adjustedForActivation: navContext.activationStart > 0,
      deliveryType: navContext.deliveryType
    };
  }

  return {
    ssrScore,
    csrScore,
    indicators,
    signals,
    details: detailedInfo
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.analyzePerformance = analyzePerformance;
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
  const hybridBand = config.thresholds.hybrid;
  if (isStrongHybrid ||
      (hasBothSignals && ssrPercentage >= hybridBand.min && ssrPercentage <= hybridBand.max)) {
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
 * Collect a module's structured signals, tolerating modules that do not emit
 * any. Every signal carries the weight it contributed, so the UI can show the
 * arithmetic behind a verdict instead of a bare percentage.
 *
 * @param {Array} target - Accumulator
 * @param {Object|null} moduleResult - A detector's return value
 */
function collectSignals(target, moduleResult) {
  if (moduleResult && Array.isArray(moduleResult.signals)) {
    target.push(...moduleResult.signals);
  }
}

/**
 * Name where the HTML was produced, combining the rendering verdict with the
 * transport evidence. "SSR" alone cannot tell a page rendered once at build
 * time from one rendered per request — this can.
 *
 * @param {string} renderType - Classification from the scoring module
 * @param {Object|null} delivery - delivery-detector output
 * @param {Object|null} diff - dom-diff-detector output
 * @returns {{id: string, label: string, detail: string}}
 */
function describeRenderOrigin(renderType, delivery, diff) {
  const mode = delivery && delivery.available ? delivery.mode : "unknown";
  const where = delivery && delivery.cdn ? ` via ${delivery.cdn}` : "";
  const serverShare = diff && diff.available ? diff.serverSharePct : null;

  if (/csr|client/i.test(renderType)) {
    return {
      id: "browser",
      label: "Built in the browser",
      detail:
        mode === "unknown"
          ? "The server sent a shell and JavaScript assembled the page on this device."
          : // The delivery label is a noun phrase ("Uncacheable response",
            // "Served from CDN cache"), so it gets its own clause rather than
            // being spliced into the middle of a sentence.
            `${delivery.modeLabel}${where} — but the content you see is assembled by JavaScript on this device.`,
    };
  }

  if (/hybrid|mixed/i.test(renderType)) {
    // "Hybrid" covers two opposite shapes, and calling both of them a server
    // shell with client regions contradicts the split bar right above it.
    // Islands pages ship all their text and hydrate parts of it; the other
    // kind ships a shell and fills most of it in.
    if (serverShare != null && serverShare >= 85) {
      return {
        id: "islands",
        label: "Server-rendered with client islands",
        detail:
          "The visible text arrived as HTML; individual regions are hydrated or resumed in the browser for interactivity.",
      };
    }
    if (serverShare != null && serverShare <= 30) {
      return {
        id: "mixed",
        label: "Mostly built in the browser",
        detail: `Only ${serverShare}% of the visible text came from the server; the rest is assembled after the scripts run.`,
      };
    }
    return {
      id: "mixed",
      label: "Server shell, client regions",
      detail:
        "Part of the page arrived as finished HTML; the rest is produced in the browser after the scripts run.",
    };
  }

  // Say only what the headers prove. A cache hit proves a cache answered this
  // visit — not that the HTML was rendered exactly once; a miss proves the
  // request reached the origin — not that the origin generated anything for
  // it, since a static file behind a cold cache produces the same miss. Only a
  // prerender header names generation time outright.
  switch (mode) {
    case "prerendered":
      return {
        id: "build",
        label: "Rendered ahead of the request",
        detail: `The response is marked as a prerender: the HTML existed before this visit and was served as a static artifact${where}.`,
      };
    case "static":
      return {
        id: "build",
        label: "Served as a static file",
        detail: `The document arrives with a validator and no cache negotiation, the way a file on disk is served${where}.`,
      };
    case "edge-cached":
      return {
        id: "edge",
        label: "Served from a cache",
        detail: `A cache${where} answered this request, so the origin did no work for this visit. When the cached copy was produced is not something the headers say.`,
      };
    case "origin":
      return {
        id: "server",
        label: "Answered by the origin",
        detail: `The request reached the origin server${where} rather than being answered by a cache.`,
      };
    case "dynamic":
      return {
        id: "server",
        label: "Not reusable by caches",
        detail: `Cache headers keep shared caches from reusing this document${where}, so every visitor reaches the origin.`,
      };
    default:
      return {
        id: "server",
        label: "Rendered on the server",
        detail:
          "The content arrived as finished HTML. The response headers say nothing conclusive about when or where it was produced.",
      };
  }
}

/**
 * Main analysis function - coordinates all detectors
 * Now async to support raw HTML comparison
 * @returns {Promise<Object>} Detection results (no telemetry)
 */
async function pageAnalyzer() {
  const config = window.DETECTOR_CONFIG;
  const startedAt = typeof performance !== "undefined" ? performance.now() : 0;

  try {
    // Fetch and compare raw HTML vs rendered DOM first (async - most important
    // for accuracy, and detectors below need the parsed raw document)
    const comparisonResults = await window.compareInitialVsRendered();
    const rawDocument = comparisonResults?.rawDocument || null;
    const rawHTML = comparisonResults?.rawHTML || null;

    // Collect results from all detector modules (sync)
    const contentResults = window.analyzeContent();
    const frameworkResults = window.detectFrameworks(rawDocument);
    const metaResults = window.analyzeMeta();
    const performanceResults = window.analyzePerformance();
    const csrPatternResults = window.detectCSRPatterns();
    const hybridResults = window.detectHybridPatterns();
    const platformResults = window.detectPlatformSignals(rawDocument, rawHTML);

    // Explanatory modules. Both are deliberately score-neutral: they describe
    // the verdict rather than voting on it.
    const neutral = { ssrScore: 0, csrScore: 0, indicators: [], signals: [], details: {} };
    const deliveryResults =
      typeof window.detectDelivery === "function"
        ? window.detectDelivery(comparisonResults?.responseHeaders || null)
        : neutral;
    const diffResults =
      typeof window.detectDomDiff === "function"
        ? window.detectDomDiff(rawDocument)
        : neutral;

    // Combine all scores
    let ssrScore = 0;
    let csrScore = 0;
    let hybridScore = hybridResults.hybridScore;
    const indicators = [];
    const signals = [];
    const detailedInfo = {};

    // Add hybrid detection results
    indicators.push(...hybridResults.indicators);
    collectSignals(signals, hybridResults);
    Object.assign(detailedInfo, { hybrid: hybridResults.details });

    // Add raw HTML comparison results (highest priority signal)
    if (comparisonResults) {
      if (comparisonResults.isLikelyCSR) {
        csrScore += config.scoring.rawVsRenderedMismatch;
        indicators.push(`raw HTML much smaller than rendered (${comparisonResults.contentRatio}x ratio) - CSR`);
        signals.push({
          id: "comparison.mismatch",
          label: "The server sent a fraction of what you see",
          impact: "csr",
          weight: config.scoring.rawVsRenderedMismatch,
          detail: `${comparisonResults.rawLength.toLocaleString()} characters of text arrived in the HTML; ${comparisonResults.renderedLength.toLocaleString()} are on screen.`,
        });
      } else if (comparisonResults.isLikelySSR) {
        ssrScore += config.scoring.rawVsRenderedMatch;
        indicators.push(`raw HTML matches rendered content (${comparisonResults.contentRatio}x ratio) - SSR`);
        signals.push({
          id: "comparison.match",
          label: "The served HTML already contained the page",
          impact: "ssr",
          weight: config.scoring.rawVsRenderedMatch,
          detail: `${comparisonResults.rawLength.toLocaleString()} of ${comparisonResults.renderedLength.toLocaleString()} visible characters were in the initial response.`,
        });
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
    collectSignals(signals, csrPatternResults);
    Object.assign(detailedInfo, csrPatternResults.details);

    // Add content analysis results
    ssrScore += contentResults.ssrScore;
    csrScore += contentResults.csrScore;
    indicators.push(...contentResults.indicators);
    collectSignals(signals, contentResults);
    Object.assign(detailedInfo, contentResults.details);

    // Add framework analysis results
    ssrScore += frameworkResults.ssrScore;
    csrScore += frameworkResults.csrScore;
    indicators.push(...frameworkResults.indicators);
    collectSignals(signals, frameworkResults);
    Object.assign(detailedInfo, frameworkResults.details);

    // Add meta analysis results
    ssrScore += metaResults.ssrScore;
    csrScore += metaResults.csrScore;
    indicators.push(...metaResults.indicators);
    collectSignals(signals, metaResults);
    Object.assign(detailedInfo, metaResults.details);

    // Add performance analysis results
    ssrScore += performanceResults.ssrScore;
    csrScore += performanceResults.csrScore;
    indicators.push(...performanceResults.indicators);
    collectSignals(signals, performanceResults);
    Object.assign(detailedInfo, performanceResults.details);

    // Add modern platform signals (speculation rules, view transitions,
    // declarative partial updates)
    ssrScore += platformResults.ssrScore;
    csrScore += platformResults.csrScore;
    indicators.push(...platformResults.indicators);
    collectSignals(signals, platformResults);
    Object.assign(detailedInfo, platformResults.details);

    // Explanatory modules contribute no score and no indicators — only
    // signals and their own detail blocks.
    collectSignals(signals, deliveryResults);
    collectSignals(signals, diffResults);
    Object.assign(detailedInfo, deliveryResults.details);
    Object.assign(detailedInfo, diffResults.details);

    // Decisive CSR: the server sent almost none of the visible text. Every
    // SSR signal above reads the post-JS DOM, where a booted CSR app looks
    // like an SSR page — cap their combined contribution.
    if (comparisonResults?.isDecisiveCSR) {
      const cappedFrom = ssrScore;
      ssrScore = Math.min(ssrScore, config.scoring.decisiveCsrSsrCap);
      const removed = cappedFrom - ssrScore;
      indicators.push('raw HTML nearly empty vs rendered - SSR signals capped (CSR)');
      // A negative SSR weight, not a positive CSR one. The branch takes points
      // away from the SSR side; it adds nothing to the CSR side, and labelling
      // the removal "CSR +80" would claim evidence that does not exist. With
      // the sign, the SSR signals still total the score the verdict used —
      // which is the whole point of showing it at all.
      signals.push({
        id: "comparison.decisiveCsr",
        label: "Server-side signals capped",
        impact: "ssr",
        weight: -removed,
        detail:
          `The served HTML held under 10% of the visible text, so the SSR signals above — read from the post-JavaScript DOM — were cut from ${cappedFrom} to ${ssrScore} rather than allowed to outvote that.`,
      });
    }

    if (!comparisonResults) {
      indicators.push('raw HTML comparison unavailable - reduced confidence');
      signals.push({
        id: "comparison.unavailable",
        label: "Could not re-fetch the page HTML",
        impact: "info",
        weight: 0,
        detail:
          "Without the pre-JavaScript HTML, every remaining signal is read from the live DOM, so the verdict is capped and reported as “likely”.",
      });
    }

    // Calculate final classification
    const classification = window.calculateClassification(ssrScore, csrScore, hybridScore, indicators);
    let renderType = classification.renderType;
    let confidence = classification.confidence;

    // Comparison unavailable: the highest-priority signal is missing and the
    // remaining signals are rendered-DOM based, so cap confidence and avoid
    // definitive verdicts.
    if (!comparisonResults) {
      confidence = Math.min(confidence, config.confidence.maxConfidenceNoComparison);
      if (renderType === 'Server-Side Rendered (SSR)') {
        renderType = 'Likely SSR with Hydration';
      } else if (renderType === 'Client-Side Rendered (CSR)') {
        renderType = 'Likely CSR/SPA';
      }
    }

    const renderOrigin = describeRenderOrigin(
      renderType,
      deliveryResults.details && deliveryResults.details.delivery,
      diffResults.details && diffResults.details.domDiff,
    );

    // Strongest first, so a reader sees the evidence that decided the verdict
    // before the supporting detail. By magnitude, not by value: a signal that
    // removed 80 points is one of the most important facts about the verdict,
    // and ordering by raw weight would bury it below every zero-weight note.
    // Purely informational signals still sort last.
    //
    // No tiebreak on purpose: Array.prototype.sort has been required to be
    // stable since ES2019, so equal weights keep the order the modules were
    // aggregated in above — comparison, then the scoring detectors, then
    // delivery and the region diff. That grouping is meaningful; sorting the
    // zero-weight signals alphabetically by id would scatter it.
    const orderedSignals = signals
      .slice()
      .sort((a, b) => Math.abs(b.weight || 0) - Math.abs(a.weight || 0));

    return {
      renderType,
      confidence,
      indicators: indicators.length > 0 ? indicators : ["basic analysis"],
      signals: orderedSignals,
      renderOrigin,
      timestamp: new Date().toISOString(),
      analysisMs:
        typeof performance !== "undefined"
          ? Math.round(performance.now() - startedAt)
          : null,
      schemaVersion: 2,
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
      signals: [],
      renderOrigin: null,
      schemaVersion: 2,
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
  window.describeRenderOrigin = describeRenderOrigin;
}



} // End of injection guard
