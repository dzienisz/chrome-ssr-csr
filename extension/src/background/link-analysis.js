const LINK_LOAD_TIMEOUT_MS = 30000;
const LINK_SETTLE_MS = 1500;

function waitForTabReady(tabs, tabId, options = {}) {
  const { timeoutMs = LINK_LOAD_TIMEOUT_MS, settleMs = LINK_SETTLE_MS } = options;

  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    let finished = false;
    let settling = false;
    let reachedFirstComplete = false;
    let pinnedOrigin;
    let timeoutTimer;
    let settleTimer;

    const cleanup = () => {
      tabs.onUpdated.removeListener(onUpdated);
      tabs.onRemoved.removeListener(onRemoved);
      clearTimeout(timeoutTimer);
      clearTimeout(settleTimer);
    };

    const finish = (reason, tab) => {
      if (finished) return;
      finished = true;
      cleanup();

      if (reason) {
        const error = new Error(`Link analysis tab ${reason}`);
        error.reason = reason;
        reject(error);
      } else {
        resolve(tab);
      }
    };

    const originOf = (url) => {
      if (!url) return undefined;
      try {
        return new URL(url).origin;
      } catch (error) {
        return undefined;
      }
    };

    const armTimeout = (expireImmediately = false) => {
      clearTimeout(timeoutTimer);
      const remainingMs = deadline - Date.now();
      if (expireImmediately && remainingMs <= 0) {
        finish("timeout");
        return;
      }
      timeoutTimer = setTimeout(() => finish("timeout"), Math.max(0, remainingMs));
    };

    const startSettling = (tab) => {
      if (!reachedFirstComplete) {
        pinnedOrigin = originOf(tab && tab.url);
        reachedFirstComplete = true;
      }
      settling = true;
      clearTimeout(timeoutTimer);
      timeoutTimer = undefined;
      settleTimer = setTimeout(() => {
        settleTimer = undefined;
        if (finished) return;

        try {
          tabs.get(tabId, (freshTab) => {
            if (finished) return;
            if (!freshTab) {
              finish("closed");
              return;
            }
            const freshOrigin = originOf(freshTab.url);
            if (
              pinnedOrigin !== undefined &&
              freshOrigin !== undefined &&
              freshOrigin !== pinnedOrigin
            ) {
              finish("navigated");
              return;
            }
            finish(undefined, freshTab);
          });
        } catch (error) {
          finish("closed");
        }
      }, settleMs);
    };

    const onUpdated = (updatedTabId, changeInfo, tab) => {
      if (finished || updatedTabId !== tabId) return;

      if (settling) {
        const url = (changeInfo && changeInfo.url) || (tab && tab.url);
        const updatedOrigin = originOf(url);
        if (
          pinnedOrigin !== undefined &&
          updatedOrigin !== undefined &&
          updatedOrigin !== pinnedOrigin
        ) {
          finish("navigated");
          return;
        }

        if (changeInfo && changeInfo.status === "loading") {
          clearTimeout(settleTimer);
          settleTimer = undefined;
          settling = false;
          armTimeout(true);
        }
        return;
      }

      if (changeInfo && changeInfo.status === "complete") {
        if (Date.now() >= deadline) {
          finish("timeout");
          return;
        }
        startSettling(tab);
      }
    };

    const onRemoved = (removedTabId) => {
      if (removedTabId === tabId) finish("closed");
    };

    tabs.onUpdated.addListener(onUpdated);
    tabs.onRemoved.addListener(onRemoved);
    armTimeout();

    try {
      tabs.get(tabId, (tab) => {
        if (finished) return;
        if (!tab) {
          finish("closed");
        } else if (tab.status === "complete") {
          startSettling(tab);
        }
      });
    } catch (error) {
      finish("closed");
    }
  });
}

function formatLinkVerdict(result, host, t) {
  if (result.assessable === false) {
    const reason =
      result.unassessableReason === "bot-challenge" ? "bot check" : "too little visible text";
    return {
      title: `${host}: Cannot assess — ${reason}`,
      message: result.renderOrigin?.label || "",
    };
  }

  const levels = {
    high: t("confidenceLevelHigh", "High"),
    medium: t("confidenceLevelMedium", "Medium"),
    low: t("confidenceLevelLow", "Low"),
  };
  const levelLabel = levels[result.confidenceLevel] || `${Math.round(result.confidence)}%`;
  const origin = result.renderOrigin?.label ? ` · ${result.renderOrigin.label}` : "";

  return {
    title: `${host}: ${result.renderType}`,
    message: `${levelLabel} ${t("confidence", "confidence")}${origin}`,
  };
}

function linkFailureMessage(reason, host, t) {
  const messages = {
    timeout: [
      "linkAnalysisTimeout",
      "$HOST$ did not finish loading within 30 seconds. The tab was left open.",
    ],
    closed: [
      "linkAnalysisClosed",
      "The tab for $HOST$ was closed before it could be analyzed.",
    ],
    navigated: [
      "linkAnalysisNavigated",
      "The tab left $HOST$ before it could be analyzed. The tab was left open.",
    ],
  };
  const [key, fallback] = messages[reason] || messages.timeout;
  return t(key, fallback, [host]);
}

const SSRLinkAnalysis = {
  waitForTabReady,
  formatLinkVerdict,
  linkFailureMessage,
};

globalThis.SSRLinkAnalysis = SSRLinkAnalysis;
if (typeof module !== "undefined") module.exports = SSRLinkAnalysis;
