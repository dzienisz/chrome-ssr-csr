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
  showStatus();

  const tab = await getActiveTab();
  if (!tab) {
    showError("No active tab", "The popup could not find a page to analyze.");
    return;
  }

  state.page = { url: tab.url || "", title: tab.title || tab.url || "" };

  if (RESTRICTED_PROTOCOLS.some((protocol) => state.page.url.startsWith(protocol))) {
    showRestricted();
    return;
  }

  try {
    await executeScript({
      target: { tabId: tab.id },
      files: ["src/analyzer-bundle.js"],
    });

    const [injection] = await executeScript({
      target: { tabId: tab.id },
      func: async () => await window.pageAnalyzer(),
    });

    const result = injection && injection.result;
    if (!result) {
      showError(
        window.t("analysisFailed", "Analysis failed"),
        window.t("analysisFailedBody", "The page did not return a result. Try reloading it."),
      );
      return;
    }

    state.result = result;
    render(result);
    updateBadge(result.renderType, tab.id);
    saveToHistory(state.page, result);

    if (state.settings.shareData) {
      collectAndSendTelemetry(tab.id, result);
    }
  } catch (error) {
    showError(
      window.t("cannotAccess", "Cannot access this page"),
      String((error && error.message) || error),
    );
  }
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs && tabs[0]));
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

/**
 * Telemetry stays exactly as it was: the same fields, sent only when the user
 * has left sharing on. Nothing this release added — response headers, region
 * attribution — leaves the device.
 */
async function collectAndSendTelemetry(tabId, result) {
  try {
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
    await sendAnalysisData({ ...result, ...injection.result });
  } catch (e) {
    // Telemetry must never affect what the user sees.
  }
}

async function sendAnalysisData(results) {
  try {
    let domain = "unknown";
    let anonymizedUrl = state.page.url;
    try {
      const url = new URL(state.page.url);
      domain = url.hostname;
      anonymizedUrl = url.origin;
    } catch {
      // keep defaults
    }

    const payload = {
      url: anonymizedUrl,
      domain,
      renderType: results.renderType,
      confidence: results.confidence,
      frameworks: results.detailedInfo?.frameworks || [],
      coreWebVitals: results.coreWebVitals || null,
      pageType: results.pageType || null,
      deviceInfo: results.deviceInfo || null,
      techStack: results.techStack || null,
      seoAccessibility: results.seoAccessibility || null,
      hydrationData: results.hydrationData || null,
      navigationData: results.navigationData || null,
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

  renderPanel("overview", () => window.SSRReport.renderOverview(result));
  renderPanel("signals", () => window.SSRReport.renderSignals(result));
  renderPanel("delivery", () => window.SSRReport.renderDelivery(result));
  renderPanel("diff", () => window.SSRReport.renderDiff(result));
  renderHistoryPanel();

  selectTab(state.tab);
}

function renderPanel(name, build) {
  document.getElementById(`panel-${name}`).replaceChildren(build());
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

/* ------------------------------------------------------------------ history */

function saveToHistory(page, result) {
  chrome.storage.local.get(["analysisHistory"], (data) => {
    const history = data.analysisHistory || [];
    history.unshift({
      url: page.url,
      title: page.title || page.url,
      timestamp: Date.now(),
      results: result,
    });

    const limit = state.settings.historyLimit === -1 ? Infinity : state.settings.historyLimit;
    if (history.length > limit) history.splice(limit);

    chrome.storage.local.set({ analysisHistory: history });
  });
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
                text: `${entry.results.confidence}% · ${new Date(entry.timestamp).toLocaleString()}`,
              }),
            ],
          }),
        ],
      });
      item.addEventListener("click", () => {
        state.result = entry.results;
        state.page = { url: entry.url, title: entry.title };
        state.tab = "overview";
        render(entry.results);
      });
      card.appendChild(item);
    });

    const clear = window.SSRReport.el("button", {
      className: "btn",
      text: window.t("clearHistory", "Clear history"),
    });
    clear.addEventListener("click", () => {
      chrome.storage.local.set({ analysisHistory: [] }, renderHistoryPanel);
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

async function copySummary() {
  if (!state.result) return;
  const button = document.getElementById("copy");
  const original = button.textContent;
  try {
    await navigator.clipboard.writeText(window.SSRExport.toSummary(state.result, state.page));
    button.textContent = window.t("copied", "Copied");
  } catch {
    button.textContent = window.t("copyFailed", "Copy failed");
  }
  setTimeout(() => {
    button.textContent = original;
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
