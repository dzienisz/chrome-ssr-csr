#!/usr/bin/env node
/**
 * Accuracy audit: grade the detector against Jev, TypeSafe's System One model.
 *
 * For each site, loads the page in Chromium, runs the real
 * src/analyzer-bundle.js, and asks Jev the same question from text alone:
 * does the server HTML already hold the main content, or does JavaScript
 * produce it? Disagreements where Jev is confident are the sites worth a
 * look when tuning src/core/config.js. Jev is a second opinion, not ground
 * truth; sites with a known `expected` bucket grade both.
 *
 *   TYPESAFE_API_KEY=... npm run audit:jev
 *   npm run audit:jev -- --urls my-sites.txt --limit 50
 *
 * --urls takes one `url [SSR|CSR|HYBRID]` per line; default is the 22
 * ground-truth sites from live-sites.mjs. Needs the open internet and a
 * Chromium build (`npx playwright install chromium`). Nothing here ships in
 * the extension; page text only leaves this machine for api.typesafe.ai.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { SITES } from './live-sites.mjs';
import { askJev, buildState, bucket, compare, grade, parseUrlList, readJev } from './jev-audit-lib.mjs';

const { values: args } = parseArgs({
  options: {
    urls: { type: 'string' },
    limit: { type: 'string' },
    out: { type: 'string', default: new URL('./audit-jev-results.json', import.meta.url).pathname },
  },
});

const apiKey = process.env.TYPESAFE_API_KEY;
if (!apiKey) {
  console.error('TYPESAFE_API_KEY is not set. Get a key at https://console.typesafe.ai/keys');
  process.exit(2);
}

const PROBE = fileURLToPath(new URL('../src/probe.js', import.meta.url));
const BUNDLE = readFileSync(new URL('../src/analyzer-bundle.js', import.meta.url), 'utf8');
let sites = args.urls ? parseUrlList(readFileSync(args.urls, 'utf8')) : SITES;
if (args.limit) sites = sites.slice(0, Number(args.limit));

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const rows = [];
let tokens = 0;

for (const site of sites) {
  const context = await browser.newContext({
    bypassCSP: true,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  // Mirror the extension: probe.js is a document_start MAIN-world content script.
  await context.addInitScript({ path: PROBE });
  const page = await context.newPage();
  const row = { url: site.url, expected: site.expected ?? [] };
  try {
    const response = await page.goto(site.url, { waitUntil: 'load', timeout: 45000 });
    const rawHtml = (await response?.text()) ?? '';
    await page.waitForTimeout(4000);
    await page.addScriptTag({ content: BUNDLE });
    const ours = await page.evaluate(() => window.pageAnalyzer());

    const texts = await page.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('style, svg, template, link, meta').forEach((n) => n.remove());
      // Keep <script src> tags as markers of an app shell, drop inline code.
      doc.querySelectorAll('script').forEach((s) => { s.textContent = ''; });
      const initialBodyMarkup = doc.body?.innerHTML ?? '';
      doc.querySelectorAll('script, noscript').forEach((n) => n.remove());
      return {
        initialText: doc.body?.textContent ?? '',
        initialBodyMarkup,
        renderedText: document.body?.innerText ?? '',
      };
    }, rawHtml);

    const jev = readJev(await askJev(buildState({ url: site.url, ...texts }), { apiKey }));
    tokens += jev.inputTokens;

    Object.assign(row, {
      ours: bucket(ours.renderType),
      ourRenderType: ours.renderType,
      ourConfidence: ours.confidence,
      jev,
      status: compare(bucket(ours.renderType), jev),
    });
    row.oursCorrect = grade(row.ours, row.expected);
    row.jevCorrect = grade(jev.bucket, row.expected.map((b) => (b === 'HYBRID' ? 'SSR' : b)));
  } catch (e) {
    row.status = 'error';
    row.error = String(e).slice(0, 200);
  }
  rows.push(row);

  if (row.status === 'error') {
    console.log(`ERROR   ${site.url}\n        ${row.error}`);
  } else {
    const exp = row.expected.length ? ` expected=${row.expected.join('|')}` : '';
    console.log(
      `${row.status.toUpperCase().padEnd(7)} ${site.url}\n        ours=${row.ours} (${row.ourConfidence}%) ` +
        `jev=${row.jev.bucket} (content-in-html=${row.jev.contentInInitialHtml.toFixed(2)}, ` +
        `shell=${row.jev.emptyShell.toFixed(2)}, choice=${row.jev.choice})${exp}`,
    );
  }
  await context.close();
}

await browser.close();
writeFileSync(args.out, JSON.stringify(rows, null, 2));

const count = (s) => rows.filter((r) => r.status === s).length;
const graded = rows.filter((r) => r.oursCorrect !== null && r.oursCorrect !== undefined);
console.log(
  `\n${rows.length} sites: ${count('agree')} agree, ${count('review')} review, ${count('unsure')} unsure, ${count('error')} errors`,
);
if (graded.length) {
  const ok = (k) => graded.filter((r) => r[k]).length;
  console.log(`vs ground truth: detector ${ok('oursCorrect')}/${graded.length}, Jev ${ok('jevCorrect')}/${graded.length}`);
}
console.log(`Jev input tokens: ${tokens} (~$${((tokens / 1e6) * 0.042).toFixed(4)})`);
console.log(`Results: ${args.out}`);
