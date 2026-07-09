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
  if (!body) return '';
  const clone = body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, template').forEach(el => el.remove());
  return (clone.textContent || '').replace(/\s+/g, ' ').trim();
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
      credentials: 'same-origin',
      headers: { 'Accept': 'text/html' }
    });

    if (!response.ok) {
      return null;
    }

    const rawHTML = await response.text();

    // Parse raw HTML
    const parser = new DOMParser();
    const rawDoc = parser.parseFromString(rawHTML, 'text/html');
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
    const isLikelyCSR = contentRatio < config.contentComparison.csrRatio &&
                        renderedLength > minLength;
    const isLikelySSR = contentRatio > config.contentComparison.ssrRatio &&
                        rawLength > minLength;

    // Server sent almost none of the visible text: near-conclusive CSR
    const isDecisiveCSR = contentRatio < config.contentComparison.decisiveCsrRatio &&
                          renderedLength > minLength;

    return {
      rawLength,
      renderedLength,
      contentRatio: Math.round(contentRatio * 100) / 100,
      isLikelyCSR,
      isLikelySSR,
      isDecisiveCSR,
      // Parsed raw document, so other detectors can check pre-JS markers.
      // Not serializable — must not be copied into analyzer output.
      rawDocument: rawDoc
    };
  } catch (e) {
    // Fetch failed (CORS, network error, etc.) - can't determine
    console.debug('CSR/SSR Detector: Raw HTML fetch failed', e.message);
    return null;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.extractVisibleText = extractVisibleText;
  window.compareInitialVsRendered = compareInitialVsRendered;
}
