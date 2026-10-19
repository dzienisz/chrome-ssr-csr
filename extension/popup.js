/**
 * Popup controller.
 *
 * Analysis runs the moment the popup opens — the old flow made you click a
 * button to ask the only question the popup exists to answer.
 *
 * Results are rendered here, from JSON, by src/ui/report.js. The previous
 * version built an HTML string inside the inspected page and assigned it to
 * the popup's innerHTML, which handed any page a way to inject markup into an
 * extension surface. Nothing from the page is treated as markup any more.
 */

const DEFAULTS = {
  darkMode: "auto",
  historyLimit: 10,
  notifications: true,
  shareData: true,
  autoAnalyze: true,
  jevEnabled: false,
};

const BACKEND_URL = "https://backend-mauve-beta-88.vercel.app";

const RESTRICTED_PROTOCOLS = [
  "chrome:",
  "chrome-extension:",
  "edge:",
  "about:",
  "view-source:",
  "moz-extension:",
  "resource:",
  "devtools:",
];

const state = {
  result: null,
  page: { url: "", title: "" },
  tab: "overview",
  settings: { ...DEFAULTS },
  jev: { status: "idle" },
  serverView: { status: "idle" },
  live: false,
  highlight: { active: false, status: "idle", drawn: 0, total: 0 },
  // Incremented per analysis. Auto-analyze on open and the re-run button can
  // both be in flight at once, and a slower earlier run finishing last would
  // otherwise replace the newer report, badge, history entry and telemetry
  // with stale results.
  runId: 0,
};

/* ------------------------------------------------------------------ setup */

document.addEventListener("DOMContentLoaded", async () => {
  window.applyI18n(document);
  document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;

  state.settings = await getSettings();
  applyTheme(state.settings.darkMode);

  wireEvents();
  setupPinHint();

  if (state.settings.autoAnalyze) {
    analyze();
  } else {
    showIdle();
  }
});

function wireEvents() {
  document.getElementById("settings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById("rerun").addEventListener("click", () => analyze());

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => selectTab(tab.dataset.panel));
    tab.addEventListener("keydown", onTabKeydown);
  });

  document.getElementById("copy").addEventListener("click", copySummary);
  document.getElementById("export-json").addEventListener("click", () => exportAs("json"));
  document.getElementById("export-md").addEventListener("click", () => exportAs("md"));
  document.getElementById("export-csv").addEventListener("click", () => exportAs("csv"));

  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.action === "settingsUpdated") {
      state.settings = { ...DEFAULTS, ...message.settings };
      applyTheme(state.settings.darkMode);
      getJevKey().then((key) => {
        state.settings.jevHasKey = Boolean(key);
        if (state.result) render(state.result);
      });
    }
  });
}

/** Left/right arrows move between tabs, as the ARIA tablist pattern expects. */
function onTabKeydown(event) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const index = tabs.indexOf(event.currentTarget);
  const next = tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
  next.focus();
  selectTab(next.dataset.panel);
  event.preventDefault();
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULTS, (settings) => resolve({ ...DEFAULTS, ...settings }));
  }).then(
    (settings) =>
      new Promise((resolve) => {
        chrome.storage.local.get("jevApiKey", (values) =>
          resolve({ ...settings, jevHasKey: Boolean(values && values.jevApiKey) }),
        );
      }),
  );
}

function getJevKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get("jevApiKey", (values) => resolve(values && values.jevApiKey));
  });
}

function applyTheme(mode) {
  const dark =
    mode === "dark" ||
    (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
}

/* --------------------------------------------------------------- analysis */

async function analyze() {
  const runId = ++state.runId;
  /** Has a newer analysis started since this one? */
  const stale = () => runId !== state.runId;

  state.jev = { status: "idle" };
  state.serverView = { status: "idle" };
  state.live = false;
  state.highlight = { active: false, status: "idle", drawn: 0, total: 0 };
  setBusy(true);
  showStatus();

  try {
    const tab = await getActiveTab();
    if (stale()) return;

    if (!tab) {
      showError("No active tab", "The popup could not find a page to analyze.");
      return;
    }

    const page = { url: tab.url || "", title: tab.title || tab.url || "" };

    // An empty url is itself the answer. `tabs` is not among the permissions,
    // so a tab's address is only visible once activeTab has been granted for
    // it — and it is never granted for the pages this cannot analyze anyway.
    // Without this, the restricted branch is dead exactly where it is needed,
    // and the user gets Chrome's raw "Extension manifest must request
    // permission…" string instead of an explanation.
    if (!page.url || RESTRICTED_PROTOCOLS.some((protocol) => page.url.startsWith(protocol))) {
      state.page = page;
      showRestricted();
      return;
    }

    const [loaded] = await executeScript({
      target: { tabId: tab.id },
      files: ["src/analyzer-bundle.js"],
    });
    if (stale()) return;

    const [injection] = await executeScript({
      target: { tabId: tab.id },
      func: async () => await window.pageAnalyzer(),
    });
    if (stale()) return;

    // A tab id outlives the document in it. If the page navigated while the
    // analysis was running, the result describes a document that `page` does
    // not name — and labelling one page's report with another page's URL is
    // worse than showing nothing, because it also gets written to history and
    // sent as telemetry.
    if (await documentChanged(tab.id, page.url, loaded, injection)) {
      showError(
        window.t("analysisFailed", "Analysis failed"),
        window.t(
          "pageChanged",
          "The page navigated while it was being analyzed. Run it again.",
        ),
      );
      return;
    }

    const result = injection && injection.result;
    if (!result) {
      showError(
        window.t("analysisFailed", "Analysis failed"),
        window.t("analysisFailedBody", "The page did not return a result. Try reloading it."),
      );
      return;
    }

    state.page = page;
    state.result = result;
    state.live = true;
    render(result);
    void syncHighlightState(tab.id);
    updateBadge(result.renderType, tab.id);
    saveToHistory(page, result);

    if (state.settings.shareData && result.assessable !== false) {
      collectAndSendTelemetry(tab.id, result, page, injection.documentId);
    }
  } catch (error) {
    if (stale()) return;

    // Injection refusals are the same situation as the restricted branch
    // above, reached a step later — a page the browser will not let an
    // extension read. Say so, rather than forwarding the API's wording.
    const message = String((error && error.message) || error);
    if (/cannot access|host permission|manifest must request|cannot be scripted/i.test(message)) {
      showRestricted();
      return;
    }

    showError(window.t("cannotAccess", "Cannot access this page"), message);
  } finally {
    if (!stale()) setBusy(false);
  }
}

/** Disable the re-run control while an analysis is in flight. */
function setBusy(busy) {
  const button = document.getElementById("rerun");
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs && tabs[0]));
  });
}

/**
 * Did the tab move to a different document while we were analyzing it?
 *
 * Two checks, because neither alone is enough:
 *
 * - Every injection result carries the documentId it ran against, and a
 *   navigation mints a new one. This catches what the url cannot: a reload,
 *   or a navigation that lands back on the same address. Chromium-only, so it
 *   is used when present rather than required.
 * - The url, for Firefox, and for a document swapped after the last injection
 *   returned.
 *
 * @param {number} tabId
 * @param {string} expectedUrl
 * @param {chrome.scripting.InjectionResult} [first] injection that loaded the bundle
 * @param {chrome.scripting.InjectionResult} [second] injection that ran it
 * @returns {Promise<boolean>}
 */
function documentChanged(tabId, expectedUrl, first, second) {
  if (first && second && first.documentId && second.documentId && first.documentId !== second.documentId) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        // The tab is gone, which is at least as disqualifying as a navigation.
        void chrome.runtime.lastError;
        resolve(true);
        return;
      }
      resolve(Boolean(tab.url) && tab.url !== expectedUrl);
    });
  });
}

/**
 * Promise wrapper over chrome.scripting.executeScript.
 *
 * Not `await chrome.scripting.executeScript(...)`: Chrome's MV3 `chrome.*`
 * namespace returns a promise when no callback is given, but Firefox's
 * `chrome.*` alias is callback-only and returns undefined — awaiting it there
 * yields undefined and every analysis fails. The callback form works in both.
 *
 * @param {Object} options
 * @returns {Promise<Array>} injection results
 */
function executeScript(options) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(options, (results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(results || []);
    });
  });
}

async function syncHighlightState(tabId) {
  try {
    const [injection] = await executeScript({
      target: { tabId },
      func: () =>
        Boolean(window.SSRRegionHighlight && window.SSRRegionHighlight.isActive()),
    });
    if (injection && injection.result) {
      state.highlight.active = true;
      state.highlight.status = "idle";
      renderDiffPanel();
    }
  } catch (e) {
    // A page can navigate or lose its activeTab grant while the popup is open.
  }
}

async function toggleHighlight() {
  if (!state.result || state.highlight.status === "working") return;

  state.highlight.status = "working";
  renderDiffPanel();
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id) throw new Error("No active tab");
    if (state.page.url && tab.url && state.page.url !== tab.url) {
      throw new Error("The page changed. Run the analysis again.");
    }

    if (state.highlight.active) {
      await executeScript({
        target: { tabId: tab.id },
        func: () =>
          window.SSRRegionHighlight ? window.SSRRegionHighlight.remove() : false,
      });
      state.highlight = { active: false, status: "idle", drawn: 0, total: 0 };
    } else {
      const [regions] = await executeScript({
        target: { tabId: tab.id },
        files: ["src/core/region-key.js", "src/ui/region-highlight.js"],
      });
      const diff = state.result.detailedInfo?.domDiff;
      if (!diff?.available || !diff.regions?.length) {
        throw new Error("No regions are available to highlight");
      }
      const payload = diff.regions.map((region) => ({
        key: region.key,
        label: region.label,
        origin: region.origin,
        serverPct: window.SSRReport.regionServerPct(region),
      }));
      const strings = {
        client: window.t("highlightOriginClient", "Added by JS"),
        mixed: window.t("highlightOriginMixed", "Mixed"),
        server: window.t("highlightOriginServer", "From server"),
        share: window.t("highlightServerShare", "$1% from server", ["$1"]),
      };
      const [injection] = await executeScript({
        target: { tabId: tab.id },
        args: [payload, strings],
        func: (pageRegions, pageStrings) =>
          window.SSRRegionHighlight.show(pageRegions, pageStrings),
      });
      if (!injection || !injection.result) {
        throw new Error("The page did not return highlight results");
      }
      const { drawn, total } = injection.result;
      state.highlight = {
        active: drawn > 0,
        status: drawn > 0 ? "shown" : "none",
        drawn,
        total,
      };
    }
  } catch (e) {
    state.highlight = { ...state.highlight, active: false, status: "error" };
  }

  renderDiffPanel();
  document.getElementById("highlight-toggle")?.focus();
}

/**
 * Telemetry stays exactly as it was: the same fields, sent only when the user
 * has left sharing on. Nothing this release added — response headers, region
 * attribution — leaves the device.
 */
async function collectAndSendTelemetry(tabId, result, page, documentId) {
  try {
    if (!publicTelemetryLocation(page.url)) return;

    await executeScript({
      target: { tabId },
      files: ["src/telemetry-bundle.js"],
    });

    const [injection] = await executeScript({
      target: { tabId },
      func: async (detection) => await window.collectTelemetryData(detection),
      args: [result],
    });

    if (!injection || !injection.result) return;

    // These run after the verdict has already been shown, so a navigation in
    // between would pair this page's metrics with the previous page's origin.
    // Send nothing rather than something wrong: telemetry is a nice-to-have,
    // and a mislabelled row is worse than a missing one.
    if (documentId && injection.documentId && injection.documentId !== documentId) return;
    await sendAnalysisData({ ...result, ...injection.result }, page);
  } catch (e) {
    // Telemetry must never affect what the user sees.
  }
}

function publicTelemetryLocation(pageUrl) {
  try {
    const url = new URL(pageUrl);
    if (!window.isPublicHostname(url.hostname)) return null;
    return { domain: url.hostname, url: url.origin };
  } catch {
    return null;
  }
}

async function sendAnalysisData(results, page) {
  try {
    const location = publicTelemetryLocation(page.url);
    if (!location) return;

    const payload = {
      url: location.url,
      domain: location.domain,
      renderType: results.renderType,
      confidence: results.confidence,
      algorithmVersion: results.algorithmVersion ?? null,
      frameworks: results.detailedInfo?.frameworks || [],
      coreWebVitals: results.coreWebVitals || null,
      pageType: results.pageType || null,
      deviceInfo: results.deviceInfo || null,
      techStack: results.techStack || null,
      seoAccessibility: results.seoAccessibility || null,
      hydrationData: results.hydrationData || null,
      navigationData: results.navigationData || null,
      confidenceLevel: results.confidenceLevel ?? null,
      performanceMetrics: {
        domReady: results.detailedInfo?.timing?.domContentLoaded,
        fcp: results.detailedInfo?.timing?.firstContentfulPaint,
        contentRatio: results.detailedInfo?.contentComparison?.ratio,
        rawHtmlLength: results.detailedInfo?.contentComparison?.rawLength,
        renderedLength: results.detailedInfo?.contentComparison?.renderedLength,
        hybridScore: results.detailedInfo?.hybridScore,
      },
      indicators: results.indicators || [],
      version: chrome.runtime.getManifest().version,
      timestamp: new Date().toISOString(),
    };

    await fetch(`${BACKEND_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Fail silently - never disrupt the user experience
  }
}

/* ---------------------------------------------------------------- rendering */

function showStatus() {
  document.getElementById("report").hidden = true;
  const status = document.getElementById("status");
  status.hidden = false;
  status.className = "empty";
  status.replaceChildren(
    window.SSRReport.el("div", { className: "spinner", attrs: { "aria-hidden": "true" } }),
    window.SSRReport.el("span", { text: window.t("analyzing", "Analyzing this page…") }),
  );
}

function showIdle() {
  const status = document.getElementById("status");
  status.hidden = false;
  status.className = "empty";
  const button = window.SSRReport.el("button", {
    className: "btn btn-primary",
    text: window.t("analyzePage", "Analyze this page"),
  });
  button.addEventListener("click", () => analyze());
  status.replaceChildren(button);
}

function showRestricted() {
  showError(
    window.t("restrictedTitle", "This page cannot be analyzed"),
    window.t(
      "restrictedBody",
      "Browsers do not let extensions read their own internal pages (chrome://, edge://, about:). Open a regular website and try again.",
    ),
  );
}

function showError(title, detail) {
  document.getElementById("report").hidden = true;
  const status = document.getElementById("status");
  status.hidden = false;
  status.className = "";
  status.replaceChildren(
    window.SSRReport.el("div", {
      className: "error-box",
      children: [
        window.SSRReport.el("h2", { text: title }),
        window.SSRReport.el("div", { text: detail }),
      ],
    }),
  );
}

function render(result) {
  document.getElementById("status").hidden = true;
  document.getElementById("report").hidden = false;

  document.getElementById("verdict").replaceChildren(window.SSRReport.renderVerdict(result));
  document.getElementById("signal-count").textContent = String((result.signals || []).length);

  const jevOffer = window.SSRJev.shouldOfferJev(
    result,
    state.settings,
    state.settings.jevHasKey,
  );
  const overviewOptions = {
    jev: jevOffer
      ? {
          ...state.jev,
          source: result.detailedInfo?.contentComparison?.source,
          onAsk: askJevForPage,
        }
      : null,
  };
  if (state.live) {
    overviewOptions.serverView = {
      ...state.serverView,
      onOpen: openServerView,
    };
  }
  renderPanel("overview", () =>
    window.SSRReport.renderOverview(result, overviewOptions),
  );
  renderPanel("signals", () => window.SSRReport.renderSignals(result));
  renderPanel("delivery", () => window.SSRReport.renderDelivery(result));
  renderPanel("diff", () =>
    window.SSRReport.renderDiff(result, {
      highlight: { ...state.highlight, onToggle: toggleHighlight },
    }),
  );
  renderHistoryPanel();

  selectTab(state.tab);
}

function renderPanel(name, build) {
  document.getElementById(`panel-${name}`).replaceChildren(build());
}

function renderDiffPanel() {
  if (!state.result) return;
  renderPanel("diff", () =>
    window.SSRReport.renderDiff(state.result, {
      highlight: { ...state.highlight, onToggle: toggleHighlight },
    }),
  );
}

function selectTab(name) {
  state.tab = name;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.panel === name));
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.hidden = panel.id !== `panel-${name}`;
  });
  if (name === "history") renderHistoryPanel();
}

async function askJevForPage() {
  if (!state.result || state.jev.status === "loading") return;

  state.jev = { status: "loading" };
  render(state.result);

  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id) throw new Error("No active tab");
    if (state.page.url && tab.url && state.page.url !== tab.url) {
      throw new Error("The page changed. Run the analysis again.");
    }

    const [injection] = await executeScript({
      target: { tabId: tab.id },
      args: [window.SSRJev.EXCERPT_CHARS],
      func: async (maxChars) => {
        if (typeof window.extractVisibleText !== "function") {
          throw new Error("Text extractor unavailable");
        }

        const response = await fetch(location.href, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();
        const rawDoc = new DOMParser().parseFromString(html, "text/html");
        rawDoc
          .querySelectorAll("style, svg, template, link, meta")
          .forEach((node) => node.remove());
        rawDoc.querySelectorAll("script").forEach((script) => {
          script.textContent = "";
        });
        const initialBodyMarkup = rawDoc.body?.innerHTML ?? "";
        rawDoc.querySelectorAll("script, noscript").forEach((node) => node.remove());

        const excerpt = (value) => {
          const text = String(value ?? "").replace(/\s+/g, " ").trim();
          return text.length > maxChars
            ? `${text.slice(0, maxChars)} …[truncated]`
            : text;
        };

        return {
          url: location.href,
          initialText: excerpt(window.extractVisibleText(rawDoc.body)),
          initialBodyMarkup: excerpt(initialBodyMarkup),
          renderedText: excerpt(window.extractVisibleText(document.body)),
        };
      },
    });
    if (!injection || !injection.result) throw new Error("Page content was unavailable");

    const apiKey = await getJevKey();
    const requestState = window.SSRJev.buildState({
      url: injection.result.url,
      initialText: injection.result.initialText,
      initialBodyMarkup: injection.result.initialBodyMarkup,
      renderedText: injection.result.renderedText,
    });
    const result = await window.SSRJev.askJev(requestState, { apiKey });
    state.jev = { status: "result", result };
  } catch (error) {
    state.jev = {
      status: "error",
      errorKind: error && error.kind ? error.kind : "network",
      errorMessage: String((error && error.message) || error)
        .replace(/\s+/g, " ")
        .slice(0, 100),
    };
  }

  render(state.result);
}

async function openServerView() {
  if (!state.result || state.serverView.status === "loading") return;

  state.serverView = { status: "loading" };
  render(state.result);

  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id || state.page.url !== tab.url) {
      throw new Error("The page changed. Run the analysis again.");
    }

    const [injection] = await executeScript({
      target: { tabId: tab.id },
      func: async () => {
        try {
          const response = await fetch(location.href, {
            credentials: "same-origin",
            headers: { Accept: "text/html" },
          });
          return {
            html: await response.text(),
            status: response.status,
            url: location.href,
            title: document.title,
            viewport: { width: innerWidth, height: innerHeight },
          };
        } catch (error) {
          return {
            html: "",
            status: 0,
            fetchError: String((error && error.message) || error).slice(0, 200),
            url: location.href,
            title: document.title,
            viewport: { width: innerWidth, height: innerHeight },
          };
        }
      },
    });
    if (!injection || !injection.result) throw new Error("Page content was unavailable");

    const liveShot = await captureVisibleTab(tab.windowId);
    const { html, truncated } = window.SSRServerView.capHtml(injection.result.html);
    const { area, deleteAfterRead } = window.SSRServerView.storageArea(chrome);
    const id = window.SSRServerView.newId();
    const key = window.SSRServerView.STORAGE_PREFIX + id;

    const stored = await storageCall(area, "get", null);
    const existing = Object.entries(stored || {})
      .filter(([storedKey]) => storedKey.startsWith(window.SSRServerView.STORAGE_PREFIX))
      .sort(([, first], [, second]) => (Number(second?.fetchedAt) || 0) - (Number(first?.fetchedAt) || 0));
    const staleKeys = existing.slice(1).map(([storedKey]) => storedKey);
    if (staleKeys.length) await storageCall(area, "remove", staleKeys);

    await storageCall(area, "set", {
      [key]: {
        html,
        liveShot,
        url: injection.result.url,
        title: injection.result.title,
        status: injection.result.status,
        truncated,
        fetchedAt: Date.now(),
        viewport: injection.result.viewport,
        fetchError: injection.result.fetchError || "",
        deleteAfterRead,
      },
    });

    await new Promise((resolve, reject) => {
      try {
        chrome.tabs.create(
          {
            url: chrome.runtime.getURL(`server-view.html?id=${id}`),
            index: tab.index + 1,
            openerTabId: tab.id,
          },
          () => {
            const error = chrome.runtime.lastError;
            if (error) reject(new Error(error.message));
            else resolve();
          },
        );
      } catch (error) {
        reject(error);
      }
    });

    state.serverView = { status: "idle" };
    render(state.result);
  } catch (error) {
    state.serverView = {
      status: "error",
      errorMessage: String((error && error.message) || error)
        .replace(/\s+/g, " ")
        .slice(0, 100),
    };
    render(state.result);
  }
}

function captureVisibleTab(windowId) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 70 }, (dataUrl) => {
        const error = chrome.runtime.lastError;
        resolve(error ? null : dataUrl || null);
      });
    } catch {
      resolve(null);
    }
  });
}

function storageCall(area, method, ...args) {
  return new Promise((resolve, reject) => {
    try {
      area[method](...args, (result) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(result);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/* ------------------------------------------------------------------ history */

/**
 * Hand the entry to the background worker rather than writing the store here.
 *
 * An append is a read-modify-write of the whole history array, and a
 * context-menu analysis can land while the popup is doing one. Two writers
 * taking the same snapshot means one of the entries disappears; the worker
 * queues every append in a single context instead.
 */
function saveToHistory(page, result) {
  const entry = {
    url: page.url,
    title: page.title || page.url,
    timestamp: Date.now(),
    results: result,
  };

  try {
    chrome.runtime.sendMessage({ action: "saveAnalysis", entry }, () => {
      // A worker that is still starting up can drop the first message; the
      // next analysis will record its own entry, and losing one history row is
      // not worth surfacing to the user.
      void chrome.runtime.lastError;
    });
  } catch (e) {
    void e;
  }
}

function renderHistoryPanel() {
  const panel = document.getElementById("panel-history");

  chrome.storage.local.get(["analysisHistory"], (data) => {
    const history = data.analysisHistory || [];
    if (!history.length) {
      panel.replaceChildren(
        window.SSRReport.el("div", {
          className: "empty",
          text: window.t("historyEmpty", "Analyzed pages will be listed here."),
        }),
      );
      return;
    }

    const card = window.SSRReport.el("section", { className: "card" });
    history.forEach((entry) => {
      const kind = window.SSRReport.verdictKind(entry.results.renderType);
      const item = window.SSRReport.el("button", {
        className: "history-item",
        attrs: { type: "button" },
        children: [
          window.SSRReport.el("div", { className: "history-title", text: entry.title }),
          window.SSRReport.el("div", {
            className: "history-meta",
            children: [
              // The short badge, not the full verdict string: at 400px the
              // long form wraps to two lines and pushes every row apart.
              window.SSRReport.el("span", {
                className: "chip",
                dataset: { tone: kind },
                text: window.SSRReport.verdictBadge(entry.results.renderType) || "—",
                attrs: { title: entry.results.renderType },
              }),
              window.SSRReport.el("span", {
                text: `${window.SSRReport.historyConfidenceText(entry.results)}${new Date(entry.timestamp).toLocaleString()}`,
              }),
            ],
          }),
        ],
      });
      item.addEventListener("click", () => {
        state.result = entry.results;
        state.page = { url: entry.url, title: entry.title };
        state.live = false;
        state.tab = "overview";
        render(entry.results);
      });
      card.appendChild(item);
    });

    const clear = window.SSRReport.el("button", {
      className: "btn",
      text: window.t("clearHistory", "Clear history"),
    });
    // Through the worker, like every other write: a clear sent straight to
    // storage can land between a queued append's read and its write, and the
    // append then puts the cleared entries back.
    clear.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "clearAnalysisHistory" }, () => {
        void chrome.runtime.lastError;
        renderHistoryPanel();
      });
    });

    panel.replaceChildren(
      card,
      window.SSRReport.el("div", { className: "history-actions", children: [clear] }),
    );
  });
}

/* ------------------------------------------------------------------ exports */

function exportAs(format) {
  if (!state.result) return;
  const stamp = new Date().toISOString().split("T")[0];
  const base = `csr-ssr-analysis-${stamp}`;
  const version = chrome.runtime.getManifest().version;

  if (format === "json") {
    window.SSRExport.downloadFile(
      window.SSRExport.toJSON(state.result, state.page),
      `${base}.json`,
      "application/json",
    );
  } else if (format === "csv") {
    window.SSRExport.downloadFile(
      window.SSRExport.toCSV(state.result, state.page),
      `${base}.csv`,
      "text/csv",
    );
  } else {
    window.SSRExport.downloadFile(
      window.SSRExport.toMarkdown(state.result, state.page, version),
      `${base}.md`,
      "text/markdown",
    );
  }
}

/** Pending "Copied" → label reset, so a second click cannot strand the button. */
let copyResetTimer = null;

async function copySummary() {
  if (!state.result) return;
  const button = document.getElementById("copy");

  // Restore from the canonical label rather than from whatever the button
  // currently reads: clicking twice inside the reset window would otherwise
  // capture "Copied" as the label to restore, and the button would keep
  // claiming success for good.
  const idle = window.t("copySummary", "Copy summary");
  clearTimeout(copyResetTimer);

  try {
    await navigator.clipboard.writeText(window.SSRExport.toSummary(state.result, state.page));
    button.textContent = window.t("copied", "Copied");
  } catch {
    button.textContent = window.t("copyFailed", "Copy failed");
  }

  copyResetTimer = setTimeout(() => {
    button.textContent = idle;
    copyResetTimer = null;
  }, 1400);
}

/* -------------------------------------------------------------------- misc */

function updateBadge(renderType, tabId) {
  const kind = window.SSRReport.verdictKind(renderType);
  const text = window.SSRReport.verdictBadge(renderType);
  const color = { ssr: "#059669", csr: "#dc2626", hybrid: "#d97706" }[kind] || "#6b7280";

  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
}

/**
 * Chrome offers no API to pin an extension; getUserSettings() only reports
 * whether the user already has. Show the hint once, then never again.
 */
function setupPinHint() {
  if (!chrome.action || !chrome.action.getUserSettings) return;

  chrome.storage.local.get(["pinHintDismissed"], (data) => {
    if (data.pinHintDismissed) return;

    chrome.action.getUserSettings((settings) => {
      if (settings.isOnToolbar) return;

      const banner = document.getElementById("pin-banner");
      banner.hidden = false;
      document.getElementById("pin-dismiss").addEventListener("click", () => {
        banner.hidden = true;
        chrome.storage.local.set({ pinHintDismissed: true });
      });
    });
  });
}
