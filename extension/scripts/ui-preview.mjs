#!/usr/bin/env node
/**
 * Render the extension's surfaces against a real analysis result and save
 * screenshots.
 *
 * The popup and the DevTools panel are the two places where a detection bug
 * and a rendering bug look identical, and neither can be opened by a unit
 * test. This drives them the way a browser would: it analyzes a fixture page
 * in Chromium, hands the real result to popup.html / panel.html behind a
 * minimal `chrome` stub, and screenshots the result in both themes.
 *
 *   npm run preview                 # every fixture, both themes
 *   npm run preview -- csr-spa      # one fixture
 *   npm run preview -- --promo      # also refresh promo-images/raw/
 *
 * Screenshots land in scripts/preview-out/ (git-ignored). With --promo, three
 * popup captures are additionally written to promo-images/raw/ at the exact
 * size the store-screenshot sources expect, so marketing art is regenerated
 * from the shipping UI rather than from a stale hand-cropped capture.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FIXTURES } from "./fixtures/pages.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXTENSION_DIR = join(HERE, "..");
const OUT_DIR = join(HERE, "preview-out");
const PROMO_RAW_DIR = join(EXTENSION_DIR, "promo-images", "raw");
const PROMO = process.argv.includes("--promo");

/** Popup captures used by promo-images/src/screenshot-*.html. */
const PROMO_SHOTS = [
  { fixture: "ssr-next-edge", tab: null, file: "popup-verdict.png" },
  { fixture: "csr-spa", tab: "diff", file: "popup-regions.png" },
  { fixture: "isr-prerender", tab: "delivery", file: "popup-delivery.png" },
];

/** Viewport for a promo capture: the frame in the screenshot source is 400x640. */
const PROMO_VIEWPORT = { width: 400, height: 640 };
const BUNDLE = readFileSync(join(EXTENSION_DIR, "src/analyzer-bundle.js"), "utf8");
const VERSION = JSON.parse(readFileSync(join(EXTENSION_DIR, "manifest.json"), "utf8")).version;

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));
const selected = requested.length
  ? FIXTURES.filter((f) => requested.includes(f.name))
  : FIXTURES;

if (!selected.length) {
  console.error(`No fixture matched. Available: ${FIXTURES.map((f) => f.name).join(", ")}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const byPath = new Map(FIXTURES.map((f) => [`/${f.name}`, f]));
const server = createServer((req, res) => {
  const fixture = byPath.get((req.url || "/").split("?")[0]);
  if (!fixture) {
    res.writeHead(200, { "content-type": "application/javascript" });
    res.end("/* fixture asset */");
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", ...fixture.headers });
  res.end(fixture.html);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

/** The smallest `chrome` surface the extension pages actually touch. */
function chromeStub({ result, page, history, version }) {
  // A file:// page cannot fetch its own siblings; the panel only fetches the
  // analyzer bundle, which this preview supplies through the eval stub above.
  window.fetch = async () => ({ text: async () => "/* bundle stub */" });

  window.chrome = {
    runtime: {
      getManifest: () => ({ version }),
      getURL: (path) => path,
      openOptionsPage: () => {},
      sendMessage: (_message, callback) => callback && callback(),
      onMessage: { addListener: () => {} },
      lastError: undefined,
    },
    // Force the English fallbacks: a preview should show the strings the
    // markup declares, not whatever locale the harness happens to run in.
    i18n: { getMessage: () => "" },
    storage: {
      sync: {
        get: (defaults, callback) =>
          callback({ ...defaults, shareData: false, autoAnalyze: true }),
        set: (_values, callback) => callback && callback(),
      },
      local: {
        get: (_keys, callback) => callback({ analysisHistory: history }),
        set: (_values, callback) => callback && callback(),
      },
    },
    tabs: {
      query: (_query, callback) => callback([{ id: 1, url: page.url, title: page.title }]),
    },
    scripting: {
      // Callback form, matching how the extension actually calls it (Firefox's
      // chrome.* alias has no promise form).
      executeScript: (options, callback) =>
        callback(options.files ? [{ result: null }] : [{ result }]),
    },
    action: {
      setBadgeText: () => {},
      setBadgeBackgroundColor: () => {},
      getUserSettings: (callback) => callback({ isOnToolbar: true }),
    },
    commands: {
      getAll: (callback) => callback([{ name: "_execute_action", shortcut: "Ctrl+Shift+Y" }]),
    },
    devtools: {
      network: { onNavigated: { addListener: () => {} } },
      // The panel injects the bundle, kicks off the run, then polls. Replay
      // that conversation with the fixture's real result.
      inspectedWindow: {
        eval: (expression, callback) => {
          if (expression.includes("__ssrDetectorPanel")) {
            callback({ status: "done", result }, null);
          } else if (expression.includes("location.href")) {
            callback({ url: page.url, title: page.title }, null);
          } else {
            callback(undefined, null);
          }
        },
      },
    },
    contextMenus: { create: () => {}, removeAll: (cb) => cb && cb(), onClicked: { addListener: () => {} } },
    notifications: { create: () => {} },
  };
}

async function analyzeFixture(fixture) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${origin}/${fixture.name}`, { waitUntil: "load" });
  await page.waitForTimeout(150);
  await page.addScriptTag({ content: BUNDLE });
  const result = await page.evaluate(() => window.pageAnalyzer());
  await context.close();
  return result;
}

async function shoot({
  file,
  width,
  height,
  theme,
  result,
  pageInfo,
  history,
  outfile,
  outDir = OUT_DIR,
  tab,
  fullPage = true,
}) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.addInitScript(chromeStub, { result, page: pageInfo, history, version: VERSION });
  await page.goto(`file://${join(EXTENSION_DIR, file)}`);
  await page.waitForTimeout(350);
  if (tab) {
    await page.click(`[data-panel="${tab}"]`);
    await page.waitForTimeout(120);
  }
  await page.screenshot({ path: join(outDir, outfile), fullPage });
  await context.close();
}

const history = [];

for (const fixture of selected) {
  const result = await analyzeFixture(fixture);
  const pageInfo = { url: `https://example.com/${fixture.name}`, title: fixture.note };
  history.unshift({ ...pageInfo, timestamp: Date.now(), results: result });

  for (const theme of ["light", "dark"]) {
    await shoot({
      file: "popup.html",
      width: 400,
      height: 720,
      theme,
      result,
      pageInfo,
      history,
      outfile: `popup-${fixture.name}-${theme}.png`,
    });
  }

  console.log(`rendered ${fixture.name}: ${result.renderType} (${result.confidence}%)`);
}

// One fixture is enough to exercise every tab and the wide panel layout.
const showcase = selected[selected.length - 1];
const showcaseResult = await analyzeFixture(showcase);
const showcasePage = { url: `https://example.com/${showcase.name}`, title: showcase.note };

for (const tab of ["signals", "delivery", "diff", "history"]) {
  await shoot({
    file: "popup.html",
    width: 400,
    height: 760,
    theme: "light",
    result: showcaseResult,
    pageInfo: showcasePage,
    history,
    outfile: `popup-tab-${tab}.png`,
    tab,
  });
}

for (const theme of ["light", "dark"]) {
  await shoot({
    file: "devtools/panel.html",
    width: 1280,
    height: 820,
    theme,
    result: showcaseResult,
    pageInfo: showcasePage,
    history,
    outfile: `panel-${theme}.png`,
  });
}

for (const file of ["options.html", "welcome.html"]) {
  for (const theme of ["light", "dark"]) {
    await shoot({
      file,
      width: 900,
      height: 900,
      theme,
      result: showcaseResult,
      pageInfo: showcasePage,
      history,
      outfile: `${file.replace(".html", "")}-${theme}.png`,
    });
  }
}

if (PROMO) {
  mkdirSync(PROMO_RAW_DIR, { recursive: true });
  for (const shot of PROMO_SHOTS) {
    const fixture = FIXTURES.find((f) => f.name === shot.fixture);
    const promoResult = await analyzeFixture(fixture);
    await shoot({
      file: "popup.html",
      ...PROMO_VIEWPORT,
      theme: "light",
      result: promoResult,
      pageInfo: { url: `https://example.com/${fixture.name}`, title: fixture.note },
      history,
      outfile: shot.file,
      outDir: PROMO_RAW_DIR,
      tab: shot.tab,
      // Not fullPage: the screenshot frame is a fixed 400x640 window, and a
      // capture taller than the frame would just be cropped by CSS anyway.
      fullPage: false,
    });
    console.log(`promo capture: promo-images/raw/${shot.file}`);
  }
}

await browser.close();
server.close();

console.log(`\nScreenshots written to ${OUT_DIR}`);
