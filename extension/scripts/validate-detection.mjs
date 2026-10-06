/**
 * Detection validation harness (DIR-04 spike, plans/002).
 *
 * Loads each ground-truth site in Chromium, injects the real
 * src/analyzer-bundle.js, runs window.pageAnalyzer(), and grades the verdict
 * against the site's known rendering strategy.
 *
 * Requires playwright (a devDependency since v4.0.0) and its Chromium build:
 *   npx playwright install chromium
 *   npm run validate:live
 *
 * For a deterministic, offline, CI-runnable complement to this suite, see
 * scripts/validate-local.mjs (`npm run validate:local`).
 *
 * Bucketing mirrors backend/lib/db.ts (ILIKE '%SSR%' / '%CSR%' / '%Hybrid%'):
 *   "Server-Side Rendered (SSR)" | "Likely SSR with Hydration"  -> SSR
 *   "Client-Side Rendered (CSR)" | "Likely CSR/SPA"             -> CSR
 *   "Hybrid/Islands Architecture" | "Hybrid/Mixed Rendering"    -> HYBRID
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SITES } from './live-sites.mjs';

const PROBE = fileURLToPath(new URL('../src/probe.js', import.meta.url));
const BUNDLE = readFileSync(
  new URL('../src/analyzer-bundle.js', import.meta.url),
  'utf8'
);


function bucket(renderType) {
  if (/hybrid|mixed/i.test(renderType)) return 'HYBRID';
  if (/ssr/i.test(renderType)) return 'SSR';
  if (/csr/i.test(renderType)) return 'CSR';
  return 'ERROR';
}

// Same escape hatch as the other two harnesses: CHROMIUM_PATH points at a
// browser playwright did not install itself.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const results = [];

for (const site of SITES) {
  const context = await browser.newContext({
    bypassCSP: true, // content scripts are exempt from page CSP; mirror that
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  // Mirror the extension: probe.js is a document_start MAIN-world content script.
  await context.addInitScript({ path: PROBE });
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
