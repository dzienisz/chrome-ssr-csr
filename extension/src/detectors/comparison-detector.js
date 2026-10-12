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
  const parts = [];
  const stack = [body];

  function pushChildren(node) {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      stack.push(node.childNodes[i]);
    }
  }

  while (stack.length) {
    const node = stack.pop();
    if (node.nodeType === 3) {
      parts.push(node.data);
      continue;
    }

    if (node.nodeType === 1) {
      if (
        node.id === "ssr-detector-probe-data" ||
        node.tagName === "SCRIPT" ||
        node.tagName === "STYLE" ||
        node.tagName === "NOSCRIPT"
      ) {
        continue;
      }
      if (node.tagName === "TEMPLATE") {
        if (node.hasAttribute("shadowrootmode")) pushChildren(node.content);
        continue;
      }

      pushChildren(node);
      if (node.shadowRoot) pushChildren(node.shadowRoot);
      continue;
    }

    if (node.nodeType === 9 || node.nodeType === 11) pushChildren(node);
  }

  return parts.join("").replace(/\s+/g, " ").trim();
}

/**
 * Extract visible words with element boundaries preserved.
 * @param {HTMLElement|null} body - Body element (live or from a parsed document)
 * @returns {string[]} Normalized word tokens
 */
function extractVisibleWords(body) {
  if (!body) return [];
  const parts = [];
  const stack = [body];

  function pushChildren(node) {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      stack.push(node.childNodes[i]);
    }
  }

  while (stack.length) {
    const node = stack.pop();
    if (node && node.separator) {
      parts.push(" ");
      continue;
    }

    if (node.nodeType === 3) {
      parts.push(node.data);
      continue;
    }

    if (node.nodeType === 1) {
      if (
        node.id === "ssr-detector-probe-data" ||
        node.tagName === "SCRIPT" ||
        node.tagName === "STYLE" ||
        node.tagName === "NOSCRIPT"
      ) {
        continue;
      }

      if (node.tagName === "TEMPLATE") {
        if (node.hasAttribute("shadowrootmode")) {
          parts.push(" ");
          stack.push({ separator: true });
          pushChildren(node.content);
        }
        continue;
      }

      parts.push(" ");
      stack.push({ separator: true });
      pushChildren(node);
      if (node.shadowRoot) pushChildren(node.shadowRoot);
      continue;
    }

    if (node.nodeType === 9 || node.nodeType === 11) pushChildren(node);
  }

  const text = parts
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFKC")
    .toLowerCase();

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("und", { granularity: "word" });
    return Array.from(segmenter.segment(text))
      .filter((part) => part.isWordLike)
      .map((part) => part.segment);
  }

  return text.match(/[\p{L}\p{N}]+/gu) || [];
}

/**
 * Measure how many rendered words are present in the raw HTML, preserving
 * duplicate occurrences on both sides.
 * @param {string[]} rawWords
 * @param {string[]} renderedWords
 * @returns {{matched: number, coverage: number}}
 */
function wordCoverage(rawWords, renderedWords) {
  const rawCounts = new Map();
  for (const word of rawWords) {
    rawCounts.set(word, (rawCounts.get(word) || 0) + 1);
  }

  let matched = 0;
  for (const word of renderedWords) {
    const count = rawCounts.get(word) || 0;
    if (count > 0) {
      matched++;
      rawCounts.set(word, count - 1);
    }
  }

  return {
    matched,
    coverage: renderedWords.length ? matched / renderedWords.length : 0,
  };
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
    const snapshot = readProbeSnapshot();
    const rawTitle = rawDoc.title.replace(/\s+/g, " ").trim();
    if (
      snapshotMatchesUrl(snapshot) &&
      snapshot?.parsedTitleHash &&
      rawTitle &&
      fnv1a(rawTitle) !== snapshot.parsedTitleHash
    ) {
      return compareParsedSnapshot({
        refetchMismatch: true,
        refetchMismatchReason: "title",
      });
    }
    const rawBodyText = extractVisibleText(rawDoc.body);

    // Get current rendered DOM text, measured the same way
    const renderedText = extractVisibleText(document.body);

    // Calculate content lengths
    const rawLength = rawBodyText.length;
    const renderedLength = renderedText.length;

    // Calculate content ratio
    const contentRatio = rawLength / Math.max(renderedLength, 1);
    const minLength = config.contentComparison.minRenderedLength;
    const rawWords = extractVisibleWords(rawDoc.body);
    const renderedWords = extractVisibleWords(document.body);
    const { matched, coverage } = wordCoverage(rawWords, renderedWords);

    if (rawLength > minLength && renderedWords.length > 0 && matched === 0) {
      return compareParsedSnapshot({
        refetchMismatch: true,
        refetchMismatchReason: "no-shared-words",
      });
    }

    // Determine if CSR or SSR based on rendered-word coverage.
    // Both branches require enough real text to judge (symmetric guards).
    const isLikelyCSR =
      coverage < config.contentComparison.csrRatio &&
      renderedLength > minLength;
    const isPartialCSR =
      coverage >= config.contentComparison.csrRatio &&
      coverage < config.contentComparison.partialRatio &&
      renderedLength > minLength;
    const isLikelySSR =
      coverage > config.contentComparison.ssrRatio && rawLength > minLength;

    // Server sent almost none of the visible text: near-conclusive CSR
    const isDecisiveCSR =
      coverage < config.contentComparison.decisiveCsrRatio &&
      renderedLength > minLength;

    return {
      rawLength,
      renderedLength,
      contentRatio: Math.round(contentRatio * 100) / 100,
      wordCoverage: Math.round(coverage * 100) / 100,
      rawWordCount: rawWords.length,
      renderedWordCount: renderedWords.length,
      matchedWordCount: matched,
      measure: "words",
      isLikelyCSR,
      isPartialCSR,
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
 * Hash a normalized string with FNV-1a, matching the isolated probe.
 * @param {string} value - Value to hash
 * @returns {string} Eight-character lowercase hash, or empty for an empty value
 */
function fnv1a(value) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Read the probe's parse-time text length and hashes (see src/probe.js).
 * @returns {{parsedTextLength: number|null, parsedTitleHash: string|null, parsedUrlHash: string|null}}
 */
function readProbeSnapshot() {
  try {
    let bridge = document.getElementById("ssr-detector-probe-data");
    let raw = bridge && bridge.getAttribute("data-ssr-detector-snapshot");
    if (!raw) {
      window.dispatchEvent(new CustomEvent("ssr-detector-request-data"));
      bridge = document.getElementById("ssr-detector-probe-data");
      raw = bridge && bridge.getAttribute("data-ssr-detector-snapshot");
    }
    const snapshot = raw ? JSON.parse(raw) : {};
    return {
      parsedTextLength: Number.isFinite(snapshot.parsedTextLength)
        ? snapshot.parsedTextLength
        : null,
      parsedTitleHash:
        typeof snapshot.parsedTitleHash === "string" && snapshot.parsedTitleHash
          ? snapshot.parsedTitleHash
          : null,
      parsedUrlHash:
        typeof snapshot.parsedUrlHash === "string" && snapshot.parsedUrlHash
          ? snapshot.parsedUrlHash
          : null,
    };
  } catch (e) {
    return {
      parsedTextLength: null,
      parsedTitleHash: null,
      parsedUrlHash: null,
    };
  }
}

function snapshotMatchesUrl(snapshot) {
  return Boolean(
    snapshot?.parsedUrlHash &&
      snapshot.parsedUrlHash === fnv1a(window.location.href),
  );
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
function compareParsedSnapshot(options = {}) {
  const config = window.DETECTOR_CONFIG;
  const snapshot = readProbeSnapshot();
  const { parsedTextLength: rawLength } = snapshot;
  if (rawLength === null) return null;

  const renderedLength = extractVisibleText(document.body).length;
  const contentRatio = rawLength / Math.max(renderedLength, 1);
  const minLength = config.contentComparison.minRenderedLength;

  return {
    rawLength,
    renderedLength,
    contentRatio: Math.round(contentRatio * 100) / 100,
    wordCoverage: null,
    rawWordCount: null,
    renderedWordCount: null,
    matchedWordCount: null,
    measure: "length",
    isLikelyCSR:
      contentRatio < config.contentComparison.csrRatio &&
      renderedLength > minLength,
    isPartialCSR:
      contentRatio >= config.contentComparison.csrRatio &&
      contentRatio < config.contentComparison.partialRatio &&
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
    refetchMismatch: options.refetchMismatch === true,
    refetchMismatchReason: options.refetchMismatchReason ?? null,
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
  window.extractVisibleWords = extractVisibleWords;
  window.wordCoverage = wordCoverage;
  window.compareInitialVsRendered = compareInitialVsRendered;
  window.compareParsedSnapshot = compareParsedSnapshot;
}
