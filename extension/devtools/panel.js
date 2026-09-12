/**
 * DevTools panel controller.
 *
 * The panel runs the same analyzer bundle the popup injects, but reaches the
 * page through chrome.devtools.inspectedWindow.eval rather than
 * chrome.scripting. That matters for two reasons: a DevTools page has no host
 * permissions to spend, and eval runs in the page's main world where the
 * analyzer expects to be.
 *
 * inspectedWindow.eval cannot await a promise — it serializes whatever the
 * expression returns, and a pending promise serializes to {}. So the runner
 * below starts the analysis, parks the result on a page global, and the panel
 * polls for it.
 */

const RUNNER = `(() => {
  const store = (window.__ssrDetectorPanel = window.__ssrDetectorPanel || {});
  if (store.pending) return { status: "pending" };
  if (store.result) {
    const result = store.result;
    store.result = null;
    return { status: "done", result };
  }
  if (typeof window.pageAnalyzer !== "function") return { status: "missing" };
  store.pending = true;
  window
    .pageAnalyzer()
    .then((result) => { store.result = result; store.pending = false; })
    .catch((error) => {
      store.result = { failed: String((error && error.message) || error) };
      store.pending = false;
    });
  return { status: "started" };
})()`;

const POLL_INTERVAL_MS = 120;
const POLL_TIMEOUT_MS = 20000;

const state = {
  result: null,
  page: { url: "", title: "" },
  bundle: null,
  // Incremented per run. A navigation mid-poll must abandon the run in flight
  // — its document is gone, and the new one carries only the probe content
  // script, so the old poll would sit there until it timed out while the panel
  // showed nothing.
  runId: 0,
};

document.addEventListener("DOMContentLoaded", async () => {
  window.applyI18n(document);
  await applyTheme();

  document.getElementById("rerun").addEventListener("click", () => run());
  document.getElementById("copy").addEventListener("click", copySummary);
  document.getElementById("export-md").addEventListener("click", () => exportAs("md"));
  document.getElementById("export-json").addEventListener("click", () => exportAs("json"));

  chrome.devtools.network.onNavigated.addListener(() => {
    if (document.getElementById("auto-rerun").checked) run();
  });

  run();
});

/**
 * The panel cannot read the DevTools theme directly in a cross-browser way,
 * so it follows the extension's own theme setting like every other surface,
 * with `auto` deferring to the OS.
 */
function applyTheme() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ darkMode: "auto" }, (settings) => {
      const dark =
        settings.darkMode === "dark" ||
        (settings.darkMode === "auto" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (dark) document.documentElement.setAttribute("data-theme", "dark");
      resolve();
    });
  });
}

/** Promise wrapper over the callback-style inspectedWindow.eval. */
function evaluate(expression) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(expression, (result, exceptionInfo) => {
      if (exceptionInfo && (exceptionInfo.isError || exceptionInfo.isException)) {
        reject(new Error(exceptionInfo.value || exceptionInfo.description || "eval failed"));
        return;
      }
      resolve(result);
    });
  });
}

async function loadBundle() {
  if (state.bundle) return state.bundle;
  const response = await fetch(chrome.runtime.getURL("src/analyzer-bundle.js"));
  state.bundle = await response.text();
  return state.bundle;
}

async function run() {
  const runId = ++state.runId;
  /** Has a newer run started — usually because the page navigated? */
  const stale = () => runId !== state.runId;

  showStatus(window.t("analyzing", "Analyzing this page…"));

  try {
    const bundle = await loadBundle();
    if (stale()) return;

    // The bundle guards against double injection itself, so re-running after a
    // navigation is cheap and re-running on the same document is a no-op.
    await evaluate(bundle);
    if (stale()) return;

    const started = await evaluate(RUNNER);
    if (stale()) return;
    if (started && started.status === "missing") {
      throw new Error("The analyzer did not load into this page.");
    }

    const result = await pollForResult(stale);
    if (stale() || result === null) return;
    if (result.failed) throw new Error(result.failed);

    state.result = result;
    state.page = await readPageIdentity();
    if (stale()) return;
    render(result);
  } catch (error) {
    if (stale()) return;
    showError(String((error && error.message) || error));
  }
}

/**
 * Poll the page-side store until the analysis lands.
 *
 * @param {() => boolean} stale - True once a newer run has superseded this one
 * @returns {Promise<Object|null>} the result, or null if this run was abandoned
 */
async function pollForResult(stale) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    if (stale()) return null;
    const status = await evaluate(RUNNER);
    if (status && status.status === "done") return status.result;
    // The document was replaced under us: the analyzer is no longer loaded, so
    // waiting for the old run's result can only end in a timeout.
    if (status && status.status === "missing") return null;
    if (Date.now() > deadline) throw new Error("Analysis timed out.");
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

async function readPageIdentity() {
  try {
    return await evaluate("({ url: location.href, title: document.title })");
  } catch (e) {
    return { url: "", title: "" };
  }
}

/* -------------------------------------------------------------- rendering */

function showStatus(message) {
  document.getElementById("report").hidden = true;
  const status = document.getElementById("status");
  status.hidden = false;
  status.className = "empty";
  status.replaceChildren(
    window.SSRReport.el("div", { className: "spinner", attrs: { "aria-hidden": "true" } }),
    window.SSRReport.el("span", { text: message }),
  );
}

function showError(detail) {
  document.getElementById("report").hidden = true;
  const status = document.getElementById("status");
  status.hidden = false;
  status.className = "empty";
  status.replaceChildren(
    window.SSRReport.el("div", {
      children: [
        window.SSRReport.el("strong", {
          text: window.t("analysisFailed", "Analysis failed"),
        }),
        window.SSRReport.el("div", { text: detail }),
        window.SSRReport.el("div", {
          text: window.t(
            "panelReloadHint",
            "Reload the inspected page and try again. Browser-internal pages cannot be analyzed.",
          ),
        }),
      ],
    }),
  );
}

function render(result) {
  document.getElementById("status").hidden = true;
  document.getElementById("report").hidden = false;
  document.getElementById("page-url").textContent = state.page.url || "";

  document.getElementById("verdict").replaceChildren(window.SSRReport.renderVerdict(result));
  document
    .getElementById("overview")
    .replaceChildren(window.SSRReport.renderOverview(result, { topSignals: false }));
  document.getElementById("signals").replaceChildren(window.SSRReport.renderSignals(result));
  document.getElementById("delivery").replaceChildren(window.SSRReport.renderDelivery(result));
  document.getElementById("diff").replaceChildren(window.SSRReport.renderDiff(result));
}

/* ---------------------------------------------------------------- exports */

function exportAs(format) {
  if (!state.result) return;
  const stamp = new Date().toISOString().split("T")[0];
  const version = chrome.runtime.getManifest().version;

  if (format === "json") {
    window.SSRExport.downloadFile(
      window.SSRExport.toJSON(state.result, state.page),
      `csr-ssr-analysis-${stamp}.json`,
      "application/json",
    );
  } else {
    window.SSRExport.downloadFile(
      window.SSRExport.toMarkdown(state.result, state.page, version),
      `csr-ssr-analysis-${stamp}.md`,
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
