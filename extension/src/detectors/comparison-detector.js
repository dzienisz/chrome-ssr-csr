/**
 * Raw HTML Comparison Module
 * Fetches raw HTML and compares to rendered DOM to detect CSR vs SSR
 */

/**
 * Extract user-visible text from a body element.
 * Strips script/style/noscript/template so inline JS/CSS never counts as
 * content. Works on a detached clone (textContent semantics), so the raw
 * and rendered sides are measured identically.
 * @param {HTMLElement|null} body - Body element (live or from a parsed document)
 * @returns {string} Normalized visible text
 */
function extractVisibleText(body) {
  if (!body) return "";
  const clone = body.cloneNode(true);
  clone
    .querySelectorAll(
      "script, style, noscript, template, #ssr-detector-probe-data",
    )
    .forEach((el) => el.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

/**
 * Compare initial HTML (before JS) vs rendered DOM (after JS)
 * True SSR will have similar content in both; CSR will have minimal raw HTML
 * @returns {Promise<Object|null>} Comparison results or null if fetch fails
 */
async function compareInitialVsRendered() {
  const config = window.DETECTOR_CONFIG;

  try {
    // Fetch raw HTML (before JS execution)
    const response = await fetch(window.location.href, {
      credentials: "same-origin",
      headers: { Accept: "text/html" },
    });

    if (!response.ok) {
      return compareParsedSnapshot();
    }

    const rawHTML = await response.text();

    // Response headers of the same document the user is on. Same-origin, so
    // every header is readable. delivery-detector turns them into a
    // build-time / edge-cached / per-request classification — the "where was
    // this rendered" half of the question the verdict alone cannot answer.
    const responseHeaders = {};
    try {
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });
    } catch (e) {
      // Headers iteration is not expected to throw; ignore if it does.
    }

    // Parse raw HTML
    const parser = new DOMParser();
    const rawDoc = parser.parseFromString(rawHTML, "text/html");
    const rawBodyText = extractVisibleText(rawDoc.body);

    // Get current rendered DOM text, measured the same way
    const renderedText = extractVisibleText(document.body);

    // Calculate content lengths
    const rawLength = rawBodyText.length;
    const renderedLength = renderedText.length;

    // Calculate content ratio
    const contentRatio = rawLength / Math.max(renderedLength, 1);

    // Determine if CSR or SSR based on ratio.
    // Both branches require enough real text to judge (symmetric guards).
    const minLength = config.contentComparison.minRenderedLength;
    const isLikelyCSR =
      contentRatio < config.contentComparison.csrRatio &&
      renderedLength > minLength;
    const isLikelySSR =
      contentRatio > config.contentComparison.ssrRatio && rawLength > minLength;

    // Server sent almost none of the visible text: near-conclusive CSR
    const isDecisiveCSR =
      contentRatio < config.contentComparison.decisiveCsrRatio &&
      renderedLength > minLength;

    return {
      rawLength,
      renderedLength,
      contentRatio: Math.round(contentRatio * 100) / 100,
      isLikelyCSR,
      isLikelySSR,
      isDecisiveCSR,
      source: "fetch",
      responseStatus: response.status,
      responseHeaders,
      // Parsed raw document, so other detectors can check pre-JS markers.
      // Not serializable — must not be copied into analyzer output.
      rawDocument: rawDoc,
      // Raw source for markers no CSS selector can reach (script contents,
      // processing instructions). Same rule: never copy into the output.
      rawHTML,
    };
  } catch (e) {
    // Fetch failed (CORS, network error, etc.) - fall back to the probe
    console.debug("CSR/SSR Detector: Raw HTML fetch failed", e.message);
    return compareParsedSnapshot();
  }
}

/**
 * Read the probe's parse-time text length (see src/probe.js).
 * @returns {number|null} Characters of visible text when parsing finished
 */
function readParsedTextLength() {
  try {
    window.dispatchEvent(new CustomEvent("ssr-detector-request-data"));
    const bridge = document.getElementById("ssr-detector-probe-data");
    const raw = bridge && bridge.getAttribute("data-ssr-detector-snapshot");
    const length = raw ? JSON.parse(raw).parsedTextLength : null;
    return Number.isFinite(length) ? length : null;
  } catch (e) {
    return null;
  }
}

/**
 * Fallback comparison when the re-fetch is refused (bot protection answers
 * it with a challenge page far more often than it blocks a real navigation).
 * Uses the text length the probe measured when the parser finished, before
 * deferred and module scripts ran. That count can only overstate what the
 * server sent, never understate it, so a small value is still conclusive CSR.
 * No raw document exists on this path: detectors that need pre-JS markup see
 * null, exactly as when the comparison is unavailable.
 * @returns {Object|null} Comparison results, or null without a probe snapshot
 */
function compareParsedSnapshot() {
  const config = window.DETECTOR_CONFIG;
  const rawLength = readParsedTextLength();
  if (rawLength === null) return null;

  const renderedLength = extractVisibleText(document.body).length;
  const contentRatio = rawLength / Math.max(renderedLength, 1);
  const minLength = config.contentComparison.minRenderedLength;

  return {
    rawLength,
    renderedLength,
    contentRatio: Math.round(contentRatio * 100) / 100,
    isLikelyCSR:
      contentRatio < config.contentComparison.csrRatio &&
      renderedLength > minLength,
    isLikelySSR:
      contentRatio > config.contentComparison.ssrRatio && rawLength > minLength,
    isDecisiveCSR:
      contentRatio < config.contentComparison.decisiveCsrRatio &&
      renderedLength > minLength,
    source: "parser-snapshot",
    responseStatus: null,
    responseHeaders: null,
    rawDocument: null,
    rawHTML: null,
  };
}

function getDetectionBodyHTML() {
  const body = document.body;
  if (!body) return "";
  if (!body.querySelector("#ssr-detector-probe-data")) return body.innerHTML;
  const clone = body.cloneNode(true);
  clone
    .querySelectorAll("#ssr-detector-probe-data")
    .forEach((el) => el.remove());
  return clone.innerHTML;
}

// Export for use in other modules
if (typeof window !== "undefined") {
  window.getDetectionBodyHTML = getDetectionBodyHTML;
  window.extractVisibleText = extractVisibleText;
  window.compareInitialVsRendered = compareInitialVsRendered;
  window.compareParsedSnapshot = compareParsedSnapshot;
}
