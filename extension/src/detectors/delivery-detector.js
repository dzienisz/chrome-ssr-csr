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

/** Cache states, normalized across the dozen vendor spellings. */
const CACHE_HIT = "HIT";
const CACHE_MISS = "MISS";
const CACHE_STALE = "STALE";
const CACHE_BYPASS = "BYPASS";
const CACHE_PRERENDER = "PRERENDER";

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
 * Normalize a vendor cache header value to one of the CACHE_* constants.
 * @param {string} value
 * @returns {string|null}
 */
function normalizeCacheState(value) {
  if (!value) return null;
  const v = String(value).toUpperCase();
  if (v.includes("PRERENDER")) return CACHE_PRERENDER;
  if (v.includes("STALE") || v.includes("REVALIDATED") || v.includes("UPDATING")) return CACHE_STALE;
  if (v.includes("BYPASS") || v.includes("DYNAMIC") || v.includes("NONE") || v.includes("EXPIRED")) return CACHE_BYPASS;
  if (v.includes("HIT")) return CACHE_HIT;
  if (v.includes("MISS")) return CACHE_MISS;
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

  // Cache state: proprietary headers first (most specific), then RFC 9211.
  const vendorCache =
    normalizeCacheState(h["x-vercel-cache"]) ||
    normalizeCacheState(h["x-nextjs-cache"]) ||
    normalizeCacheState(h["cf-cache-status"]) ||
    normalizeCacheState(h["x-cache"]) ||
    normalizeCacheState(h["x-drupal-cache"]) ||
    normalizeCacheState(h["x-litespeed-cache"]) ||
    normalizeCacheState(h["x-proxy-cache"]) ||
    parseCacheStatusHeader(h["cache-status"]);

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
      detail: vendorCache ? `Cache state reported as ${vendorCache}.` : "Edge network identified from response headers.",
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
