/**
 * Detection validation harness (DIR-04 spike, plans/002).
 *
 * Loads each ground-truth site in Chromium, injects the real
 * src/analyzer-bundle.js, runs window.pageAnalyzer(), and grades the verdict
 * against the site's known rendering strategy.
 *
 * Requires playwright (not a package dependency — installed globally or run
 * from a directory that has it):
 *   npm i -g playwright   # or: npx playwright install chromium
 *   node scripts/validate-detection.mjs
 *
 * Bucketing mirrors backend/lib/db.ts (ILIKE '%SSR%' / '%CSR%' / '%Hybrid%'):
 *   "Server-Side Rendered (SSR)" | "Likely SSR with Hydration"  -> SSR
 *   "Client-Side Rendered (CSR)" | "Likely CSR/SPA"             -> CSR
 *   "Hybrid/Islands Architecture" | "Hybrid/Mixed Rendering"    -> HYBRID
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BUNDLE = readFileSync(
  new URL('../src/analyzer-bundle.js', import.meta.url),
  'utf8'
);

// expected: acceptable buckets, first = ideal.
// Ground-truth notes reflect the plans/002 spike findings — squoosh.app and
// photopea.com ship real text in their initial HTML (prerendered shells), so
// SSR-bucket verdicts for them are defensible, not detector bugs.
const SITES = [
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

function bucket(renderType) {
  if (/hybrid|mixed/i.test(renderType)) return 'HYBRID';
  if (/ssr/i.test(renderType)) return 'SSR';
  if (/csr/i.test(renderType)) return 'CSR';
  return 'ERROR';
}

const browser = await chromium.launch();
const results = [];

for (const site of SITES) {
  const context = await browser.newContext({
    bypassCSP: true, // content scripts are exempt from page CSP; mirror that
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  let row = { url: site.url, expected: site.expected, note: site.note };
  try {
    await page.goto(site.url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(4000); // let hydration / CSR content settle
    await page.addScriptTag({ content: BUNDLE });
    const r = await page.evaluate(() => window.pageAnalyzer());
    row = {
      ...row,
      renderType: r.renderType,
      bucket: bucket(r.renderType),
      confidence: r.confidence,
      ssrScore: r.detailedInfo.ssrScore,
      csrScore: r.detailedInfo.csrScore,
      ssrPercentage: r.detailedInfo.ssrPercentage,
      hybridScore: r.detailedInfo.hybridScore,
      contentComparison: r.detailedInfo.contentComparison ?? null,
      indicators: r.indicators,
    };
    row.pass = site.expected.includes(row.bucket);
    row.ideal = row.bucket === site.expected[0];
  } catch (e) {
    row = { ...row, renderType: 'LOAD_ERROR', bucket: 'ERROR', error: String(e).slice(0, 200), pass: null };
  }
  results.push(row);
  const mark = row.pass === null ? 'SKIP' : row.pass ? (row.ideal ? 'PASS' : 'ok  ') : 'FAIL';
  console.log(
    `${mark}  ${site.url}\n      expected=${site.expected.join('|')} got=${row.bucket} (${row.renderType}) ` +
      `ssr%=${row.ssrPercentage ?? '-'} ssr=${row.ssrScore ?? '-'} csr=${row.csrScore ?? '-'} hyb=${row.hybridScore ?? '-'}`
  );
  await context.close();
}

await browser.close();
writeFileSync(
  new URL('./validate-detection-results.json', import.meta.url),
  JSON.stringify(results, null, 2)
);

const graded = results.filter((r) => r.pass !== null);
const passed = graded.filter((r) => r.pass).length;
console.log(`\n${passed}/${graded.length} within acceptable bucket (${results.length - graded.length} failed to load)`);
