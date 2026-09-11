/**
 * Background service worker (event page on Firefox).
 *
 * Keeps three things honest:
 *  - the toolbar badge, which must never outlive the analysis that produced it
 *  - the right-click entry point, for checking a page without opening the popup
 *  - first-run onboarding
 *
 * chrome.action.onClicked is deliberately absent: the action has a popup, so
 * that event never fires. The previous version carried a full analysis
 * pipeline behind it that could not run.
 */

const MENU_ID = "analyze-rendering";

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

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: chrome.i18n.getMessage("contextMenuAnalyze") || "Analyze page rendering",
      contexts: ["page"],
    });
  });

  if (details.reason === "install") {
    chrome.tabs.create({ url: "welcome.html" });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab) analyzeTab(tab);
});

/**
 * A navigation invalidates the badge: the verdict belonged to the document
 * that just went away. Clearing it beats showing the previous page's answer.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading" && changeInfo.url) {
    try {
      chrome.action.setBadgeText({ text: "", tabId });
    } catch (e) {
      // The tab can disappear between the event and this call.
    }
  }
});

/**
 * Promise wrapper over chrome.scripting.executeScript.
 *
 * Firefox's `chrome.*` alias is callback-only — awaiting it there yields
 * undefined — while Chrome supports both forms. The callback form is the one
 * that works in both.
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
 * Run the analyzer in a tab and report the verdict as a notification.
 * @param {chrome.tabs.Tab} tab
 */
async function analyzeTab(tab) {
  const url = tab.url || "";
  if (RESTRICTED_PROTOCOLS.some((protocol) => url.startsWith(protocol))) {
    notify(
      chrome.i18n.getMessage("restrictedTitle") || "This page cannot be analyzed",
      chrome.i18n.getMessage("restrictedBody") ||
        "Browsers do not let extensions read their own internal pages.",
    );
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
      notify("Analysis failed", "The page did not return a result.");
      return;
    }

    setBadge(result.renderType, tab.id);
    await saveToHistory(tab, result);

    const origin = result.renderOrigin ? ` — ${result.renderOrigin.label}` : "";
    notify(`${result.renderType} (${result.confidence}%)`, `${hostOf(url)}${origin}`);
  } catch (error) {
    notify("Analysis failed", String((error && error.message) || error));
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

function setBadge(renderType, tabId) {
  let text = "";
  let color = "#6b7280";

  if (/hybrid|mixed|islands/i.test(renderType)) {
    text = "MIX";
    color = "#d97706";
  } else if (/ssr|server/i.test(renderType)) {
    text = "SSR";
    color = "#059669";
  } else if (/csr|client/i.test(renderType)) {
    text = "CSR";
    color = "#dc2626";
  }

  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
}

/** Notifications are opt-out; respect the setting before creating one. */
function notify(title, message) {
  chrome.storage.sync.get({ notifications: true }, (settings) => {
    if (!settings.notifications) return;
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon48.png"),
      title,
      message,
      priority: 1,
    });
  });
}

/**
 * Shares the popup's history store and its limit, so entries added from the
 * context menu are trimmed by the same rule rather than a hardcoded ten.
 */
function saveToHistory(tab, result) {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ historyLimit: 10 }, (settings) => {
      chrome.storage.local.get(["analysisHistory"], (data) => {
        const history = data.analysisHistory || [];
        history.unshift({
          url: tab.url,
          title: tab.title || tab.url,
          timestamp: Date.now(),
          results: result,
        });

        const limit = settings.historyLimit === -1 ? Infinity : settings.historyLimit;
        if (history.length > limit) history.splice(limit);

        chrome.storage.local.set({ analysisHistory: history }, resolve);
      });
    });
  });
}
