/**
 * Tiny localization helper shared by every extension page.
 *
 * chrome.i18n.getMessage returns "" for a key the current locale does not
 * define, which silently blanks the UI. Every call here therefore carries the
 * English string as a fallback: a missing translation degrades to English
 * instead of to nothing, and a new string can ship before its translations do.
 */

/**
 * @param {string} key - Message name in _locales/<locale>/messages.json
 * @param {string} fallback - English text used when the key is missing
 * @param {Array<string>} [substitutions]
 * @returns {string}
 */
function t(key, fallback, substitutions) {
  try {
    const message = chrome.i18n.getMessage(key, substitutions);
    if (message) return message;
  } catch (e) {
    // Not running inside an extension (unit tests) — fall through.
  }
  return fallback;
}

/**
 * Tell assistive technology which language the page is actually in.
 *
 * Every page ships English markup and swaps it for the UI locale at runtime.
 * Leaving `<html lang="en">` in place means a screen reader applies English
 * pronunciation rules to Polish or Japanese text.
 *
 * @param {Document} [doc=document]
 */
function applyDocumentLanguage(doc) {
  const target = doc || document;
  try {
    const locale = chrome.i18n.getUILanguage();
    if (locale) target.documentElement.lang = locale;
  } catch (e) {
    // Not running inside an extension (unit tests) — keep the markup's value.
  }
}

/**
 * Localize a document fragment declaratively.
 *
 *   <span data-i18n="tabSignals">Signals</span>
 *   <button data-i18n-title="rerunTitle" title="Run again">…</button>
 *
 * The markup keeps the English copy, so the page is still readable with the
 * script disabled and the fallback above always has something to return.
 *
 * @param {ParentNode} [root=document]
 */
function applyI18n(root) {
  const scope = root || document;

  if (!root || root === document) applyDocumentLanguage(scope.ownerDocument || scope);

  scope.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n, node.textContent.trim());
  });

  for (const attr of ["title", "aria-label", "placeholder"]) {
    const selector = `[data-i18n-${attr}]`;
    scope.querySelectorAll(selector).forEach((node) => {
      const key = node.getAttribute(`data-i18n-${attr}`);
      node.setAttribute(attr, t(key, node.getAttribute(attr) || ""));
    });
  }
}

if (typeof window !== "undefined") {
  window.t = t;
  window.applyI18n = applyI18n;
  window.applyDocumentLanguage = applyDocumentLanguage;
}
