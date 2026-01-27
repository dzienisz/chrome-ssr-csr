/**
 * Raw HTML Comparison Module
 * Fetches raw HTML and compares to rendered DOM to detect CSR vs SSR
 */

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
    const rawBodyText = rawDoc.body?.innerText?.trim() || '';

    // Get current rendered DOM text
    const renderedText = document.body.innerText.trim();

    // Calculate content lengths
    const rawLength = rawBodyText.length;
    const renderedLength = renderedText.length;

    // Calculate content ratio
    const contentRatio = rawLength / Math.max(renderedLength, 1);

    // Determine if CSR or SSR based on ratio
    const isLikelyCSR = contentRatio < config.contentComparison.csrRatio &&
                        renderedLength > config.contentComparison.minRenderedLength;
    const isLikelySSR = contentRatio > config.contentComparison.ssrRatio;

    return {
      rawLength,
      renderedLength,
      contentRatio: Math.round(contentRatio * 100) / 100,
      isLikelyCSR,
      isLikelySSR
    };
  } catch (e) {
    // Fetch failed (CORS, network error, etc.) - can't determine
    console.debug('CSR/SSR Detector: Raw HTML fetch failed', e.message);
    return null;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.compareInitialVsRendered = compareInitialVsRendered;
}
