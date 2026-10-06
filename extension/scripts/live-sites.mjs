/**
 * Ground-truth sites shared by validate-detection.mjs and audit-jev.mjs.
 */
// expected: acceptable buckets, first = ideal.
// Ground-truth notes reflect the plans/002 spike findings — squoosh.app and
// photopea.com ship real text in their initial HTML (prerendered shells), so
// SSR-bucket verdicts for them are defensible, not detector bugs.
export const SITES = [
  // --- Pure server-rendered / static ---
  { url: 'https://en.wikipedia.org/wiki/Server-side_scripting', expected: ['SSR'], note: 'MediaWiki, pure SSR' },
  { url: 'https://news.ycombinator.com', expected: ['SSR'], note: 'pure server HTML, no framework' },
  { url: 'https://sfbay.craigslist.org', expected: ['SSR'], note: 'server HTML' },
  { url: 'https://gohugo.io', expected: ['SSR'], note: 'Hugo static site' },
  { url: 'https://jekyllrb.com', expected: ['SSR'], note: 'Jekyll static site' },
  { url: 'https://wordpress.org', expected: ['SSR'], note: 'WordPress SSR' },
  { url: 'https://developer.mozilla.org/en-US/docs/Web/HTML', expected: ['SSR'], note: 'MDN, SSR + light hydration' },

  // --- SSR frameworks with hydration ---
  { url: 'https://nextjs.org', expected: ['SSR'], note: 'Next.js RSC/SSR' },
  { url: 'https://vercel.com', expected: ['SSR'], note: 'Next.js SSR' },
  { url: 'https://nuxt.com', expected: ['SSR'], note: 'Nuxt SSR' },
  { url: 'https://remix.run', expected: ['SSR'], note: 'Remix SSR' },
  { url: 'https://github.com/vercel/next.js', expected: ['SSR', 'HYBRID'], note: 'Rails SSR + dynamic islands' },

  // --- Prerendered app shells (SSG delivery, app-like behavior) ---
  { url: 'https://squoosh.app', expected: ['SSR', 'CSR'], note: 'Preact PWA with build-time prerendered shell' },
  { url: 'https://www.photopea.com', expected: ['SSR', 'CSR'], note: 'JS app but real text in initial HTML' },

  // --- Islands / partial hydration ---
  { url: 'https://astro.build', expected: ['HYBRID', 'SSR'], note: 'Astro islands' },
  { url: 'https://qwik.dev', expected: ['HYBRID', 'SSR'], note: 'Qwik resumable' },

  // --- Pure CSR SPAs (empty or script-only initial HTML) ---
  { url: 'https://excalidraw.com', expected: ['CSR'], note: 'React SPA, 10 chars of real raw text' },
  { url: 'https://app.diagrams.net', expected: ['CSR'], note: 'draw.io SPA, low-text app shell' },
  { url: 'https://play.grafana.org', expected: ['CSR'], note: 'Grafana React SPA, 100 chars real raw text' },
  { url: 'https://www.windy.com', expected: ['CSR'], note: 'Svelte CSR app, 41 chars raw text' },
  { url: 'https://mastodon.social/explore', expected: ['CSR'], note: 'React SPA, 0 chars real raw text' },
  { url: 'https://claude.ai', expected: ['CSR'], note: 'React SPA, script-only raw HTML' },
];
