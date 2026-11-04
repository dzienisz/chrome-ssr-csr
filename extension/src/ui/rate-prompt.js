const RATE_PROMPT_MIN_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const RATE_PROMPT_MAX_SHOWS = 3;

const REVIEW_URLS = {
  chrome:
    "https://chromewebstore.google.com/detail/csr-vs-ssr-detector/fhiopdjeekafnhmfbcfoolhejdgjpkgg/reviews",
  edge: "https://microsoftedge.microsoft.com/addons/detail/ffnkjnckfaboknffjlfenkbjfhmoahih",
  firefox:
    "https://addons.mozilla.org/firefox/addon/csr-vs-ssr-detector/reviews/",
};

function shouldShowRatePrompt(state, now = Date.now()) {
  return (
    Number.isFinite(state?.installedAt) &&
    Number.isFinite(now) &&
    now - state.installedAt >= RATE_PROMPT_MIN_AGE_MS &&
    state.popupOpens >= 3 &&
    !state.ratePromptDone &&
    (state.ratePromptShown || 0) < RATE_PROMPT_MAX_SHOWS
  );
}

function reviewUrlFor({ userAgent = "", isFirefox = false } = {}) {
  if (isFirefox) return REVIEW_URLS.firefox;
  if (userAgent.includes("Edg/")) return REVIEW_URLS.edge;
  return REVIEW_URLS.chrome;
}

if (typeof window !== "undefined") {
  window.SSRRatePrompt = {
    RATE_PROMPT_MIN_AGE_MS,
    RATE_PROMPT_MAX_SHOWS,
    shouldShowRatePrompt,
    reviewUrlFor,
  };
}
