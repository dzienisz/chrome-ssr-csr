if (typeof importScripts === "function") importScripts("src/background/link-analysis.js");

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
const LINK_MENU_ID = "analyze-link-rendering";

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
    chrome.contextMenus.create({
      id: LINK_MENU_ID,
      title:
        chrome.i18n.getMessage("contextMenuAnalyzeLink") ||
        "Analyze link rendering (opens in background tab)",
      contexts: ["link"],
      targetUrlPatterns: ["http://*/*", "https://*/*"],
    });
  });

  if (details.reason === "install") {
    chrome.tabs.create({ url: "welcome.html" });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab) analyzeTab(tab);
  if (info.menuItemId === LINK_MENU_ID && info.linkUrl) {
    const pattern = SSRLinkAnalysis.linkOriginPattern(info.linkUrl);
    if (!pattern) {
      notify(
        t("analysisFailed", "Analysis failed"),
        SSRLinkAnalysis.linkFailureMessage("unsupported", hostOf(info.linkUrl), t),
      );
      return;
    }

    // activeTab covers only the clicked tab. The browser remembers
    // this site-specific request.
    chrome.permissions.request({ origins: [pattern] }, (granted) => {
      const lastError = chrome.runtime.lastError;
      if (granted && !lastError) {
        analyzeLink(info.linkUrl, tab);
        return;
      }

      notify(
        t("analysisFailed", "Analysis failed"),
        SSRLinkAnalysis.linkFailureMessage("permission", hostOf(info.linkUrl), t),
      );
    });
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  const match = /^link-analysis:(\d+):\d+$/.exec(notificationId);
  if (!match) return;

  const tabId = Number(match[1]);
  chrome.tabs.update(tabId, { active: true }, (tab) => {
    void chrome.runtime.lastError;
    if (!tab) {
      chrome.notifications.clear(notificationId);
      return;
    }

    if (!chrome.windows || typeof chrome.windows.update !== "function") {
      chrome.notifications.clear(notificationId);
      return;
    }

    chrome.windows.update(tab.windowId, { focused: true }, () => {
      void chrome.runtime.lastError;
      chrome.notifications.clear(notificationId);
    });
  });
});

/**
 * A document load invalidates the badge: the verdict belonged to the document
 * that just went away. Clearing it beats showing the previous page's answer.
 *
 * Keyed on `status` alone, not on `changeInfo.url`: a reload of the same URL
 * reports "loading" with no url field, and that page is just as capable of
 * having changed its rendering as one at a new address.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
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
async function analyzeTab(tab, options = {}) {
  const url = tab.url || "";
  if (RESTRICTED_PROTOCOLS.some((protocol) => url.startsWith(protocol))) {
    notify(
      chrome.i18n.getMessage("restrictedTitle") || "This page cannot be analyzed",
      chrome.i18n.getMessage("restrictedBody") ||
        "Browsers do not let extensions read their own internal pages.",
      options.activateTabId,
    );
    return;
  }

  try {
    const [loaded] = await executeScript({
      target: { tabId: tab.id },
      files: ["src/analyzer-bundle.js"],
    });

    const [injection] = await executeScript({
      target: { tabId: tab.id },
      func: async () => await window.pageAnalyzer(),
    });

    const result = injection && injection.result;
    if (!result) {
      notify("Analysis failed", "The page did not return a result.", options.activateTabId);
      return;
    }

    // Same hazard as the popup: the tab id survives a navigation, so a result
    // produced after one describes a document that `tab` no longer names.
    // Recording it under the click-time url would file the wrong verdict
    // against the wrong site. The documentId the two injections ran against
    // catches a reload, which keeps the url; the url catches the rest, and is
    // all Firefox reports.
    const sameDocument =
      !loaded || !injection || !loaded.documentId || !injection.documentId
        ? true
        : loaded.documentId === injection.documentId;
    const current = await getTab(tab.id);
    if (!sameDocument || !current || (current.url && current.url !== url)) {
      notify(
        "Analysis discarded",
        "The page navigated while it was being analyzed.",
        options.activateTabId,
      );
      return;
    }

    setBadge(result.renderType, tab.id);
    await saveToHistory({
      url: tab.url,
      title: tab.title || tab.url,
      timestamp: Date.now(),
      results: result,
    });

    if (options.link) {
      const verdict = SSRLinkAnalysis.formatLinkVerdict(result, hostOf(url), t);
      notify(verdict.title, verdict.message, options.activateTabId);
    } else {
      const origin = result.renderOrigin ? ` — ${result.renderOrigin.label}` : "";
      if (result.assessable === false) {
        const reason =
          result.unassessableReason === "bot-challenge"
            ? "bot check"
            : "too little visible text";
        notify(`Cannot assess — ${reason}`, hostOf(url), options.activateTabId);
      } else {
        notify(
          `${result.renderType} (${result.confidence}%)`,
          `${hostOf(url)}${origin}`,
          options.activateTabId,
        );
      }
    }
  } catch (error) {
    notify(
      "Analysis failed",
      String((error && error.message) || error),
      options.activateTabId,
    );
  }
}

async function analyzeLink(url, sourceTab) {
  let newTab;
  try {
    newTab = await new Promise((resolve, reject) => {
      chrome.tabs.create(
        {
          url,
          active: false,
          index: sourceTab ? sourceTab.index + 1 : undefined,
          openerTabId: sourceTab?.id,
        },
        (createdTab) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }
          if (!createdTab) {
            reject(new Error("The link tab could not be opened."));
            return;
          }
          resolve(createdTab);
        },
      );
    });
  } catch (error) {
    notify(
      t("analysisFailed", "Analysis failed"),
      String((error && error.message) || error),
    );
    return;
  }

  let readyTab;
  try {
    readyTab = await SSRLinkAnalysis.waitForTabReady(chrome.tabs, newTab.id);
  } catch (error) {
    const reason = error && error.reason;
    notify(
      t("analysisFailed", "Analysis failed"),
      SSRLinkAnalysis.linkFailureMessage(reason, hostOf(url), t),
      reason === "closed" ? undefined : newTab.id,
    );
    return;
  }

  await analyzeTab(readyTab, { activateTabId: readyTab.id, link: true });
}

/**
 * @param {number} tabId
 * @returns {Promise<chrome.tabs.Tab|null>}
 */
function getTab(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      void chrome.runtime.lastError;
      resolve(tab || null);
    });
  });
}

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

function setBadge(renderType, tabId) {
  let text = renderType === "Cannot assess" ? "?" : "";
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
function notify(title, message, activateTabId) {
  chrome.storage.sync.get({ notifications: true }, (settings) => {
    if (!settings.notifications) return;
    const options = {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icon48.png"),
      title,
      message,
      priority: 1,
    };
    if (typeof activateTabId === "number") {
      chrome.notifications.create(
        `link-analysis:${activateTabId}:${Date.now()}`,
        options,
      );
    } else {
      chrome.notifications.create(options);
    }
  });
}

function t(key, fallback, substitutions) {
  const translated = chrome.i18n.getMessage(key, substitutions);
  if (translated) return translated;

  const values =
    substitutions === undefined
      ? []
      : Array.isArray(substitutions)
        ? substitutions
        : [substitutions];
  return fallback.replace(/\$HOST\$|\$(\d+)/g, (placeholder, index) => {
    const value = placeholder === "$HOST$" ? values[0] : values[Number(index) - 1];
    return value === undefined ? placeholder : String(value);
  });
}

/**
 * The one writer of `analysisHistory`.
 *
 * Appending means read-modify-write over the whole array, and the popup and
 * the context menu can finish analyses at the same time. Two readers taking
 * the same snapshot means the second `set` silently drops the first entry, so
 * the popup does not write the store itself — it sends `saveAnalysis` here,
 * and every append is queued behind the previous one in this single context.
 */
let historyQueue = Promise.resolve();

function saveToHistory(entry) {
  return enqueueHistoryWrite(() => appendHistoryEntry(entry));
}

/**
 * Clearing has to share the queue with appending. A clear issued straight to
 * storage can land between an append's read and its write, and the append then
 * writes the pre-clear array back — the user presses "Clear history" and the
 * entries reappear.
 */
function clearHistory() {
  return enqueueHistoryWrite(
    () => new Promise((resolve) => chrome.storage.local.set({ analysisHistory: [] }, resolve)),
  );
}

function enqueueHistoryWrite(operation) {
  historyQueue = historyQueue.then(operation).catch(() => {});
  return historyQueue;
}

/**
 * Shares the popup's history store and its limit, so entries added from the
 * context menu are trimmed by the same rule rather than a hardcoded ten.
 *
 * @param {{url: string, title: string, timestamp: number, results: Object}} entry
 */
function appendHistoryEntry(entry) {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ historyLimit: 10 }, (settings) => {
      chrome.storage.local.get(["analysisHistory"], (data) => {
        const history = data.analysisHistory || [];
        history.unshift(entry);

        const limit = settings.historyLimit === -1 ? Infinity : settings.historyLimit;
        if (history.length > limit) history.splice(limit);

        chrome.storage.local.set({ analysisHistory: history }, resolve);
      });
    });
  });
}

// The popup's analyses come through here too, so both entry points append in
// one place and in one order.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message) return false;

  if (message.action === "saveAnalysis") {
    saveToHistory(message.entry).then(() => sendResponse({ ok: true }));
    return true; // keep the message channel open for the async response
  }

  if (message.action === "clearAnalysisHistory") {
    clearHistory().then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
