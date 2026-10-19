/**
 * Server view: turns the HTML a page's server sent into a document that is
 * safe to show next to the live page.
 *
 * The HTML is the page's own and fully hostile. It is never parsed into an
 * extension document: it goes into an <iframe sandbox=""> as `srcdoc`, set as
 * a property, so a stray `</iframe>` cannot close the frame early. An empty
 * sandbox attribute grants no tokens — no scripts, no same-origin access, no
 * forms, no popups, no top navigation — so the frame shows exactly what a
 * browser draws before any JavaScript runs.
 *
 * The edits made here are the minimum needed for that frame to look like the
 * page: a <base> so relative CSS and images resolve against the page's
 * address, and no <meta http-equiv="refresh">, which needs no script to move
 * the frame somewhere else.
 */

(function (root) {
  /** ~2 MB of characters; larger documents are cut and flagged. */
  const MAX_HTML_CHARS = 2 * 1024 * 1024;

  /** Key prefix for entries handed from the popup to server-view.html. */
  const STORAGE_PREFIX = "serverView:";

  /**
   * @param {string} html
   * @param {number} [maxChars]
   * @returns {{html: string, truncated: boolean}}
   */
  function capHtml(html, maxChars = MAX_HTML_CHARS) {
    const text = String(html ?? "");
    return text.length > maxChars
      ? { html: text.slice(0, maxChars), truncated: true }
      : { html: text, truncated: false };
  }

  /** Absolute http(s) URL, or null. */
  function httpUrl(value, base) {
    try {
      const url = new URL(value, base);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  /**
   * Build the srcdoc for the server-view frame.
   *
   * @param {string} html - raw HTML from the server
   * @param {string} pageUrl - address the HTML was fetched from
   * @param {{maxChars?: number, parser?: DOMParser}} [options]
   * @returns {{srcdoc: string, truncated: boolean, baseHref: string|null}}
   */
  function prepareSrcdoc(html, pageUrl, options = {}) {
    const capped = capHtml(html, options.maxChars ?? MAX_HTML_CHARS);
    const parser = options.parser || new DOMParser();
    // DOMParser documents are inert: no scripts run and nothing is fetched.
    const doc = parser.parseFromString(capped.html, "text/html");

    doc
      .querySelectorAll("meta[http-equiv]")
      .forEach((meta) => {
        if (meta.getAttribute("http-equiv").trim().toLowerCase() === "refresh") meta.remove();
      });

    // A page's own <base> may be relative; resolve it against the page and
    // keep a single absolute one. Anything that is not http(s) falls back to
    // the page address.
    const pageBase = httpUrl(pageUrl);
    const existing = doc.querySelector("base[href]");
    const baseHref =
      (existing && httpUrl(existing.getAttribute("href"), pageBase || undefined)) || pageBase;
    doc.querySelectorAll("base").forEach((node) => node.remove());

    if (baseHref) {
      const base = doc.createElement("base");
      base.setAttribute("href", baseHref);
      doc.head.insertBefore(base, doc.head.firstChild);
    }

    const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : "";
    return {
      srcdoc: `${doctype}${doc.documentElement.outerHTML}`,
      truncated: capped.truncated,
      baseHref: baseHref || null,
    };
  }

  /**
   * The frame the server HTML is shown in. `sandbox` is present and empty:
   * every restriction applies and none is lifted.
   *
   * @param {Document} doc - document to create the element in
   * @param {string} srcdoc
   * @param {string} [title] - accessible name for the frame
   * @returns {HTMLIFrameElement}
   */
  function createServerFrame(doc, srcdoc, title) {
    const frame = doc.createElement("iframe");
    frame.setAttribute("sandbox", "");
    frame.setAttribute("referrerpolicy", "no-referrer");
    frame.setAttribute("loading", "eager");
    if (title) frame.setAttribute("title", title);
    frame.srcdoc = srcdoc;
    return frame;
  }

  /** Random id for a storage entry. */
  function newId() {
    const bytes = new Uint8Array(12);
    root.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * storage.session where it exists (in memory, cleared with the browser
   * session); storage.local otherwise, in which case the reader deletes the
   * entry as soon as it has it.
   *
   * @param {Object} chromeApi
   * @returns {{area: Object, deleteAfterRead: boolean}}
   */
  function storageArea(chromeApi) {
    const storage = chromeApi && chromeApi.storage;
    if (storage && storage.session) return { area: storage.session, deleteAfterRead: false };
    return { area: storage.local, deleteAfterRead: true };
  }

  const api = {
    MAX_HTML_CHARS,
    STORAGE_PREFIX,
    capHtml,
    prepareSrcdoc,
    createServerFrame,
    newId,
    storageArea,
  };

  if (root) root.SSRServerView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
