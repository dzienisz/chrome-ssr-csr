/**
 * Ground-truth fixtures for the offline detection harness.
 *
 * The live harness (validate-detection.mjs) grades the detector against 22
 * real sites, which makes it honest and completely unrunnable in CI: it needs
 * the open internet, and the sites it grades rewrite themselves without
 * telling anyone. These fixtures are the complement — hand-written pages whose
 * rendering strategy and delivery headers are known by construction, so a
 * regression shows up as a failed assertion rather than a changed statistic.
 *
 * Each fixture declares:
 *   bucket   — the SSR/CSR/HYBRID verdict the detector must reach
 *   delivery — the delivery mode the response headers must produce
 *   expect   — optional extra assertions over the analysis result
 */

const LOREM = [
  "Server-side rendering means the HTML that reaches the browser already",
  "contains the text a reader came for. The browser paints it before a single",
  "byte of application JavaScript has been parsed, which is why it matters",
  "for search crawlers, for slow devices, and for anyone on a poor network.",
  "Client-side rendering inverts that: the server sends a near-empty shell",
  "and the browser assembles the document from data it fetches afterwards.",
].join(" ");

/** Build a paragraph block big enough to clear the detector's text floors. */
function paragraphs(count, prefix = "") {
  return Array.from(
    { length: count },
    (_, i) => `<p>${prefix}${i + 1}. ${LOREM}</p>`,
  ).join("\n      ");
}

export const FIXTURES = [
  {
    name: "ssr-classic",
    note: "Plain server-rendered document, no framework, no client JavaScript",
    bucket: "SSR",
    delivery: "dynamic",
    headers: {
      "cache-control": "private, no-store",
      server: "nginx/1.25.3",
    },
    expect: (r) => [
      [r.detailedInfo.contentComparison.ratio > 0.9, "raw HTML should match the rendered DOM"],
      [r.detailedInfo.domDiff.serverSharePct >= 95, "server should own nearly all the text"],
      [r.renderOrigin.id === "server", `render origin should be the server, got ${r.renderOrigin.id}`],
    ],
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>The Daily Record — Rendering strategies</title>
    <meta name="description" content="A long-form article about how web pages are rendered and why it matters.">
    <meta property="og:title" content="Rendering strategies explained">
  </head>
  <body>
    <header><h1>The Daily Record</h1><nav><a href="/">Home</a> <a href="/tech">Tech</a></nav></header>
    <main>
      <article>
        <h2>How pages are rendered</h2>
        ${paragraphs(6)}
      </article>
    </main>
    <footer><p>© The Daily Record. All rights reserved. Contact the newsroom for corrections.</p></footer>
  </body>
</html>`,
  },

  {
    name: "ssg-hugo",
    note: "Static site generator output served as a cacheable file",
    bucket: "SSR",
    delivery: "static",
    headers: {
      "cache-control": "public, max-age=3600",
      etag: '"7f3a1c9"',
      "last-modified": "Tue, 02 Sep 2026 10:00:00 GMT",
      server: "GitHub.com",
      "x-github-request-id": "AAAA:BBBB:CCCC",
    },
    expect: (r) => [
      [r.detailedInfo.generators?.includes("hugo"), "Hugo should be identified as the generator"],
      [r.renderOrigin.id === "build", `render origin should be build time, got ${r.renderOrigin.id}`],
      [r.detailedInfo.delivery.cdn === "GitHub Pages", `expected GitHub Pages, got ${r.detailedInfo.delivery.cdn}`],
    ],
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Notes — a static site</title>
    <meta name="generator" content="Hugo 0.128.0">
    <meta name="description" content="Static notes built ahead of time and served from a CDN.">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Blog","name":"Notes"}</script>
  </head>
  <body>
    <header><h1>Notes</h1></header>
    <main>
      <article><h2>Build-time rendering</h2>${paragraphs(5)}</article>
    </main>
    <footer><p>Built with a static site generator. No server runs at request time.</p></footer>
  </body>
</html>`,
  },

  {
    name: "ssr-next-edge",
    note: "Next.js App Router payload served from a warm edge cache",
    bucket: "SSR",
    delivery: "edge-cached",
    headers: {
      "x-vercel-cache": "HIT",
      "x-vercel-id": "fra1::abcde-1234567890",
      age: "312",
      "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=59",
    },
    expect: (r) => [
      [r.detailedInfo.frameworks?.includes("nextjs"), "Next.js should be detected from the RSC payload"],
      [r.renderOrigin.id === "edge", `render origin should be the edge cache, got ${r.renderOrigin.id}`],
      [r.detailedInfo.delivery.cacheState === "HIT", "cache state should be HIT"],
      [r.detailedInfo.delivery.age === 312, "age header should be parsed"],
    ],
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Acme — Ship faster</title>
    <meta name="description" content="Acme helps teams ship their web applications faster than ever.">
  </head>
  <body>
    <div id="__next">
      <header><h1>Acme</h1><nav><a href="/pricing">Pricing</a> <a href="/docs">Docs</a></nav></header>
      <main>
        <section><h2>Ship faster</h2>${paragraphs(5)}</section>
      </main>
      <footer><p>© Acme Inc. Every page on this site is rendered on the server.</p></footer>
    </div>
    <script>self.__next_f=self.__next_f||[];self.__next_f.push([1,"1:HL[\\"/a.css\\"]\\n"]);</script>
    <script src="/_next/static/chunks/main-app.js"></script>
  </body>
</html>`,
  },

  {
    name: "csr-spa",
    note: "Empty React-style shell filled in entirely by script",
    bucket: "CSR",
    delivery: "dynamic",
    headers: {
      "cache-control": "no-store",
      "x-nf-request-id": "01JABCDEF",
    },
    expect: (r) => [
      [r.detailedInfo.contentComparison.ratio < 0.1, "raw HTML should hold almost none of the text"],
      [r.detailedInfo.ssrScore <= 10, "decisive-CSR override should cap the SSR score"],
      [r.renderOrigin.id === "browser", `render origin should be the browser, got ${r.renderOrigin.id}`],
      [
        r.detailedInfo.domDiff.biggestClientRegion?.key === "#root",
        `#root should be the biggest client-filled region, got ${r.detailedInfo.domDiff.biggestClientRegion?.key}`,
      ],
    ],
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Boardly</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="/app.bundle.js"></script>
    <script>
      document.getElementById('root').innerHTML = \`
        <header><h1>Boardly</h1></header>
        <main><section id="feed">${paragraphs(6, "Card ")}</section></main>
        <footer><p>Rendered entirely in your browser.</p></footer>\`;
    </script>
  </body>
</html>`,
  },

  {
    name: "csr-noscript",
    note: "SPA shell that tells visitors JavaScript is required",
    bucket: "CSR",
    delivery: "edge-cached",
    headers: {
      "cf-ray": "8a1b2c3d4e5f",
      "cf-cache-status": "HIT",
      age: "45",
      server: "cloudflare",
    },
    expect: (r) => [
      [
        r.indicators.some((i) => i.includes("JavaScript required")),
        "the noscript fallback should be reported",
      ],
      [r.detailedInfo.delivery.cdn === "Cloudflare", `expected Cloudflare, got ${r.detailedInfo.delivery.cdn}`],
      [r.renderOrigin.id === "browser", `render origin should be the browser, got ${r.renderOrigin.id}`],
    ],
    html: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Studio</title></head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="app"></div>
    <script>
      document.getElementById('app').innerHTML = \`
        <main><h1>Studio</h1>${paragraphs(5, "Panel ")}</main>\`;
    </script>
  </body>
</html>`,
  },

  {
    name: "hybrid-islands",
    note: "Astro-style static page with three hydrated islands",
    bucket: "HYBRID",
    delivery: "static",
    headers: {
      "cache-control": "public, max-age=600",
      etag: '"islands-1"',
      "last-modified": "Mon, 01 Sep 2026 08:00:00 GMT",
    },
    expect: (r) => [
      [r.detailedInfo.hybrid.astroIslands === 3, "three Astro islands should be counted"],
      [r.detailedInfo.hybridScore >= 30, "islands should produce a strong hybrid score"],
    ],
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Islands — documentation</title>
    <meta name="description" content="A documentation site built with an islands architecture.">
  </head>
  <body>
    <header><h1>Islands</h1></header>
    <main>
      <article>${paragraphs(5)}</article>
      <astro-island data-astro-island uid="a1"><button>Search</button></astro-island>
      <astro-island data-astro-island uid="a2"><button>Theme</button></astro-island>
      <astro-island data-astro-island uid="a3"><button>Feedback</button></astro-island>
    </main>
    <footer><p>Static HTML with a little interactivity sprinkled in.</p></footer>
  </body>
</html>`,
  },

  {
    name: "ssr-enhanced",
    note: "Server-rendered markup enhanced in place (Turbo, Livewire, htmx, Qwik)",
    bucket: "SSR",
    delivery: "dynamic",
    headers: {
      "cache-control": "no-store",
      "x-powered-by": "PHP/8.3.2",
      server: "nginx/1.25.3",
    },
    expect: (r) => {
      const frameworks = r.detailedInfo.frameworks || [];
      return [
        // Attribute selectors with a colon in the name — wire:id, q:container —
        // cannot be exercised under jsdom, whose selector engine never matches
        // them. This fixture is the only place they are actually verified.
        [frameworks.includes("livewire"), `Livewire should be detected, got ${frameworks}`],
        [frameworks.includes("qwik"), `Qwik should be detected, got ${frameworks}`],
        [frameworks.includes("turbo"), `Turbo should be detected, got ${frameworks}`],
        [frameworks.includes("htmx"), `htmx should be detected, got ${frameworks}`],
        [r.detailedInfo.delivery.runtime === "PHP", "PHP should be the reported runtime"],
      ];
    },
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Workshop — order #4182</title>
    <meta name="description" content="Order 4182, rendered by the server and enhanced in the browser.">
  </head>
  <body>
    <header><h1>Workshop</h1></header>
    <main q:container="paused">
      <turbo-frame id="order">
        <h2>Order #4182</h2>
        ${paragraphs(4)}
      </turbo-frame>
      <div wire:id="a1b2c3" wire:snapshot="{}">
        <p>Live counter component rendered on the server and kept in sync over the wire.</p>
      </div>
      <button hx-get="/orders/4182/history" hx-trigger="click">Load history</button>
    </main>
    <footer><p>Every page here is rendered by the application server.</p></footer>
  </body>
</html>`,
  },

  {
    name: "isr-prerender",
    note: "Incrementally regenerated page reported as a prerender",
    bucket: "SSR",
    delivery: "prerendered",
    headers: {
      "x-nextjs-prerender": "1",
      "x-nextjs-cache": "HIT",
      "x-vercel-id": "cdg1::xyz",
      "cache-control": "s-maxage=31536000, stale-while-revalidate",
    },
    expect: (r) => [
      [r.renderOrigin.id === "build", `render origin should be build time, got ${r.renderOrigin.id}`],
      [r.detailedInfo.delivery.mode === "prerendered", "delivery mode should be prerendered"],
    ],
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Catalogue — product 42</title>
    <meta name="description" content="Product 42 in the catalogue, regenerated on a schedule.">
  </head>
  <body>
    <div id="__next">
      <main><h1>Product 42</h1>${paragraphs(5)}</main>
      <footer><p>Regenerated in the background, served instantly.</p></footer>
    </div>
  </body>
</html>`,
  },
];
