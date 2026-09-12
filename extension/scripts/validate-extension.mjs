#!/usr/bin/env node
/**
 * End-to-end harness: load the extension as an extension.
 *
 * The other two harnesses inject `src/analyzer-bundle.js` into a page with
 * `addScriptTag`. That grades the detector, and nothing else — it never loads
 * the manifest, never starts the service worker, never runs `probe.js` as a
 * content script, and never opens popup.html. A manifest Chromium rejects, a
 * worker that throws on startup, a page referencing a file that no longer
 * exists (popup.html shipped a `<script src="analyzer.js">` for three
 * releases) all pass those harnesses and break on install.
 *
 * This one installs the unpacked extension in a throwaway profile and checks
 * the things only a real install can show:
 *
 *   - the manifest is accepted and the service worker registers
 *   - probe.js runs at document_start in the MAIN world of an http page
 *   - every extension page loads with no console errors and no failed requests
 *   - the popup renders a real report through the real chrome.* APIs
 *   - the background worker's saveAnalysis contract round-trips into storage
 *   - the history limit is honoured by the writer that owns it
 *
 *   npm run validate:extension
 *
 * Requires playwright's Chromium; set CHROMIUM_PATH to use another build.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FIXTURES } from "./fixtures/pages.mjs";

const EXTENSION_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Extension pages that must load cleanly, and the element that proves they did. */
const PAGES = [
  { path: "popup.html", ready: "#analyze, #status, #report" },
  { path: "options.html", ready: "#save" },
  { path: "welcome.html", ready: "#open-settings" },
  { path: "devtools/panel.html", ready: "#status, #report" },
];

/** Console messages that are noise rather than a defect. */
const IGNORED_CONSOLE = [
  // A DevTools page opened as an ordinary tab has no chrome.devtools API;
  // panel.js is expected to fail there, and does so without throwing.
  /Cannot read properties of undefined \(reading 'network'\)/,
  /chrome\.devtools/,
];

const failures = [];
const notes = [];

/**
 * @param {boolean} ok
 * @param {string} label - What held, phrased as the passing case
 * @param {string} [detail] - What went wrong, shown only on failure
 */
function check(ok, label, detail) {
  if (ok) notes.push(`  ok   ${label}`);
  else failures.push(detail ? `${label}\n         ${detail}` : label);
}

/* ------------------------------------------------------------------ server */

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

/* --------------------------------------------------------------- install */

const profile = mkdtempSync(join(tmpdir(), "ssr-detector-profile-"));

// `headless: true` makes Playwright reach for chromium-headless-shell, which
// cannot load extensions at all — the profile comes up with nothing installed
// and every check below fails for a reason that has nothing to do with this
// extension. `channel: "chromium"` selects the full Chromium build and its new
// headless mode, which supports them.
const browserChoice = process.env.CHROMIUM_PATH
  ? { executablePath: process.env.CHROMIUM_PATH }
  : { channel: "chromium" };

const context = await chromium.launchPersistentContext(profile, {
  ...browserChoice,
  headless: true,
  args: [
    `--disable-extensions-except=${EXTENSION_DIR}`,
    `--load-extension=${EXTENSION_DIR}`,
  ],
});

const workerErrors = [];
let worker = context.serviceWorkers()[0];
if (!worker) {
  worker = await context.waitForEvent("serviceworker", { timeout: 15000 }).catch(() => null);
}

check(Boolean(worker), "the service worker registers (the manifest is accepted)");

if (!worker) {
  const version = context.browser() ? context.browser().version() : "unknown";
  await context.close();
  server.close();
  rmSync(profile, { recursive: true, force: true });

  console.error("FAIL  extension did not load; nothing else can be checked");
  console.error(`      browser: ${version}`);
  console.error(
    `      launched with: ${JSON.stringify(browserChoice)}\n` +
      "      A browser that cannot load extensions produces exactly this.\n" +
      "      chromium-headless-shell is the usual culprit: run with the full\n" +
      "      Chromium build (channel: \"chromium\", or CHROMIUM_PATH pointing at\n" +
      "      chrome rather than headless_shell).",
  );
  process.exit(1);
}

const extensionId = worker.url().split("/")[2];
notes.push(`  ok   installed as ${extensionId}`);

// onInstalled fires asynchronously; give it a moment to create the context
// menu and throw if it is going to.
worker.on("console", (message) => {
  if (message.type() === "error") workerErrors.push(message.text());
});
await new Promise((resolve) => setTimeout(resolve, 800));
check(
  workerErrors.length === 0,
  "the service worker starts without logging an error",
  workerErrors.join(" | "),
);

/* -------------------------------------------------- probe content script */

const page = await context.newPage();
await page.goto(`${origin}/ssr-classic`, { waitUntil: "load" });

// probe.js is declared with world: "MAIN" and run_at: document_start, so the
// page's own realm must see its guard flag. An isolated-world regression
// would leave this undefined while every unit test still passed.
const probeActive = await page.evaluate(() => window.__SSR_DETECTOR_PROBE_ACTIVE__ === true);
check(probeActive, "probe.js runs in the page's MAIN world at document_start");

const snapshot = await page.evaluate(async () => {
  window.dispatchEvent(new CustomEvent("ssr-detector-request-data"));
  await new Promise((resolve) => setTimeout(resolve, 50));
  const node = document.getElementById("ssr-detector-probe-data");
  return node && node.getAttribute("data-ssr-detector-snapshot");
});
check(Boolean(snapshot), "the probe answers a snapshot request");
check(
  snapshot ? typeof JSON.parse(snapshot).navigationCount === "number" : false,
  "the snapshot is parseable and carries navigation counters",
);

// The bridge must not be readable as page text — it holds telemetry.
const bridgeText = await page.evaluate(() => {
  const node = document.getElementById("ssr-detector-probe-data");
  return node ? node.textContent : null;
});
check(bridgeText === "", "the probe bridge exposes no text content to the page");

/* ------------------------------------------------- extension pages load */

for (const { path, ready } of PAGES) {
  const errors = [];
  const failedRequests = [];
  const extensionPage = await context.newPage();

  extensionPage.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
    errors.push(text);
  });
  extensionPage.on("pageerror", (error) => {
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(String(error)))) return;
    errors.push(String(error));
  });
  extensionPage.on("requestfailed", (request) => failedRequests.push(request.url()));
  extensionPage.on("response", (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });

  await extensionPage.goto(`chrome-extension://${extensionId}/${path}`, {
    waitUntil: "domcontentloaded",
  });
  await extensionPage.waitForTimeout(600);

  const rendered = await extensionPage.$(ready);
  check(Boolean(rendered), `${path} renders its shell`, `no element matched ${ready}`);
  check(errors.length === 0, `${path} loads without script errors`, errors.join(" | "));
  check(
    failedRequests.length === 0,
    `${path} requests only files that exist`,
    failedRequests.join(", "),
  );

  // Localization runs on every page; a missing key would blank an element.
  const empty = await extensionPage.evaluate(() =>
    [...document.querySelectorAll("[data-i18n]")]
      .filter((node) => !node.textContent.trim())
      .map((node) => node.dataset.i18n),
  );
  check(
    empty.length === 0,
    `${path} localizes every marked element to non-empty text`,
    `blank after localization: ${empty.join(", ")}`,
  );

  await extensionPage.close();
}

/* ------------------------------------------- popup renders a real report */

// The popup asks chrome.tabs for the active tab, which is itself when it is
// opened as a tab rather than from the toolbar. Handing it a result directly
// exercises the real renderer, the real i18n and the real storage APIs under
// the extension origin — the parts a stubbed preview cannot vouch for.
const reportPage = await context.newPage();
const reportErrors = [];
reportPage.on("pageerror", (error) => reportErrors.push(String(error)));
await reportPage.goto(`chrome-extension://${extensionId}/popup.html`, {
  waitUntil: "domcontentloaded",
});
await reportPage.waitForTimeout(400);

const renderOk = await reportPage.evaluate(() => {
  const result = {
    renderType: "Server-Side Rendered (SSR)",
    confidence: 92,
    indicators: ["raw HTML matches rendered content (0.98x ratio) - SSR"],
    renderOrigin: { id: "edge", label: "Served from a cache", detail: "A cache answered this." },
    signals: [
      {
        id: "comparison.match",
        label: "The served HTML already contained the page",
        impact: "ssr",
        weight: 30,
        detail: "2,000 of 2,010 characters were in the initial response.",
      },
    ],
    detailedInfo: {
      ssrScore: 85,
      csrScore: 0,
      ssrPercentage: 100,
      hybridScore: 0,
      frameworks: ["nextjs"],
      contentComparison: { rawLength: 2000, renderedLength: 2010, ratio: 0.99 },
      delivery: {
        available: true,
        mode: "edge-cached",
        modeLabel: "Served from CDN cache",
        modeDetail: "A cache answered this request.",
        cdn: "Vercel",
        cacheState: "HIT",
        cacheLayers: [{ header: "x-vercel-cache", state: "HIT" }],
        age: 12,
        ttfb: 40,
        serverTiming: [],
      },
      domDiff: {
        available: true,
        serverChars: 2000,
        clientChars: 10,
        serverSharePct: 99,
        rawElements: 40,
        renderedElements: 42,
        elementsAddedByJs: 2,
        regionCount: 1,
        serverRegionCount: 1,
        clientRegionCount: 0,
        mixedRegionCount: 0,
        regions: [
          {
            key: "main",
            label: "Main content",
            rawChars: 1800,
            renderedChars: 1800,
            addedChars: 0,
            origin: "server",
            existedInRawHtml: true,
          },
        ],
        biggestClientRegion: null,
      },
    },
  };

  const verdict = window.SSRReport.renderVerdict(result);
  const overview = window.SSRReport.renderOverview(result);
  const delivery = window.SSRReport.renderDelivery(result);

  const host = document.createElement("div");
  host.append(verdict, overview, delivery);

  return {
    kind: verdict.dataset.kind,
    confidence: host.querySelector(".dial-value")?.textContent,
    hasCdn: host.textContent.includes("Vercel"),
    summary: window.SSRExport.toSummary(result, { url: "https://example.com/" }),
    csv: window.SSRExport.toCSV(result, { url: "https://example.com/", title: "=cmd()" }),
  };
});

check(renderOk.kind === "ssr", "popup renders an SSR verdict", `got ${renderOk.kind}`);
check(
  renderOk.confidence === "92",
  "popup renders the confidence dial",
  `got ${renderOk.confidence}`,
);
check(renderOk.hasCdn, "popup renders the delivery details");
check(
  renderOk.summary.includes("Served from a cache"),
  "the shared export helper produces a summary under the extension origin",
);
check(
  renderOk.csv.includes(`"'=cmd()"`),
  "CSV export neutralizes a formula title in the real runtime",
);
check(reportErrors.length === 0, "popup renders without throwing", reportErrors.join(" | "));

/* ------------------------------------------- history message round-trip */

// The popup no longer writes analysisHistory; it sends the entry to the
// worker, which is the single writer. If that contract breaks, history
// silently stops recording and no unit test notices.
const historyResult = await reportPage.evaluate(async () => {
  await new Promise((resolve) => chrome.storage.local.set({ analysisHistory: [] }, resolve));
  await new Promise((resolve) => chrome.storage.sync.set({ historyLimit: 5 }, resolve));

  const send = (entry) =>
    new Promise((resolve) => chrome.runtime.sendMessage({ action: "saveAnalysis", entry }, resolve));

  // Fire them together: this is exactly the overlap that used to drop entries
  // when two contexts each read-modify-wrote the whole array.
  await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      send({
        url: `https://example.com/${i}`,
        title: `Page ${i}`,
        timestamp: Date.now() + i,
        results: { renderType: "Server-Side Rendered (SSR)", confidence: 90 },
      }),
    ),
  );

  const { analysisHistory } = await new Promise((resolve) =>
    chrome.storage.local.get(["analysisHistory"], resolve),
  );
  return {
    length: analysisHistory.length,
    urls: analysisHistory.map((e) => e.url),
  };
});

check(
  historyResult.length === 5,
  "the worker honours the history limit under concurrent writes",
  `kept ${historyResult.length} entries, expected 5`,
);
check(
  new Set(historyResult.urls).size === historyResult.urls.length,
  "no history entry is lost or duplicated by concurrent writes",
  historyResult.urls.join(", "),
);

/* ------------------------------------------------------------------ done */

await context.close();
server.close();
rmSync(profile, { recursive: true, force: true });

for (const note of notes) console.log(note);
for (const failure of failures) console.log(`  FAIL ${failure}`);

const total = notes.length + failures.length;
console.log(`\n${notes.length}/${total} extension checks passed`);
process.exit(failures.length === 0 ? 0 : 1);
