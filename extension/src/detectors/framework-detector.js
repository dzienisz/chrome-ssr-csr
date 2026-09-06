/**
 * Framework Detector Module
 * Detects JavaScript frameworks and their hydration patterns
 */

/**
 * Concatenate the inline script contents of a document, skipping this
 * extension's own bundles. The analyzer normally runs as a content script and
 * never lands in the DOM, but the validation harness injects it as a script
 * tag — without this guard it would detect the framework names in its own
 * config as if they were the page's.
 *
 * @param {Document|null} doc
 * @returns {string}
 */
function collectScriptSource(doc) {
  if (!doc) return '';
  try {
    const parts = [];
    doc.querySelectorAll('script').forEach(script => {
      const text = script.textContent || '';
      if (!text) return;
      if (text.includes('__SSR_CSR_ANALYZER_LOADED__') ||
          text.includes('__SSR_CSR_TELEMETRY_LOADED__')) return;
      parts.push(text);
    });
    return parts.join('\n');
  } catch (e) {
    return '';
  }
}

/**
 * Detect frameworks and their rendering patterns
 * @param {Document|null} rawDocument - Parsed raw (pre-JS) HTML document, when
 *   the comparison fetch succeeded. Framework markers only count as hydration
 *   (SSR) evidence if they exist here; markers only in the rendered DOM are
 *   what a client-rendered app looks like after boot.
 * @returns {Object} Detection results with score and indicators
 */
function detectFrameworks(rawDocument) {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  let ssrScore = 0;
  let csrScore = 0;
  const detailedInfo = {};

  // Script-content markers: frameworks that ship no identifiable element.
  // Scoped to script contents rather than the whole serialized document, so a
  // docs page that merely *writes about* __next_f is not a Next.js app — and
  // so this detector never matches its own bundle when it is injected as a
  // script tag rather than as a content script.
  const renderedSource = collectScriptSource(document);
  const rawSource = collectScriptSource(rawDocument);

  const contentPatterns = config.frameworkContentPatterns || {};
  const contentMarkers = {};
  const rawContentMarkers = {};
  for (const [framework, patterns] of Object.entries(contentPatterns)) {
    contentMarkers[framework] = patterns.some(pat => renderedSource.includes(pat));
    rawContentMarkers[framework] = patterns.some(pat => rawSource.includes(pat));
  }

  // Detect framework hydration markers
  const frameworkMarkers = {};
  const rawFrameworkMarkers = {};
  for (const [framework, selector] of Object.entries(config.frameworks)) {
    try {
      if (framework === 'react') {
        // Special handling for React
        frameworkMarkers[framework] =
          document.querySelector(selector) !== null ||
          document.getElementById('root')?._reactRootContainer !== undefined;
      } else {
        frameworkMarkers[framework] = document.querySelector(selector) !== null;
      }
      rawFrameworkMarkers[framework] =
        rawDocument ? rawDocument.querySelector(selector) !== null : false;
    } catch (e) {
      frameworkMarkers[framework] = false;
      rawFrameworkMarkers[framework] = false;
    }
  }

  // Merge selector hits with script-content hits, on both sides
  for (const framework of Object.keys(contentPatterns)) {
    frameworkMarkers[framework] = frameworkMarkers[framework] || contentMarkers[framework];
    rawFrameworkMarkers[framework] = rawFrameworkMarkers[framework] || rawContentMarkers[framework];
  }

  const foundFrameworks = Object.entries(frameworkMarkers)
    .filter(([_, found]) => found)
    .map(([framework, _]) => framework);

  if (foundFrameworks.length > 0) {
    detailedInfo.frameworks = foundFrameworks;

    const hydratedFrameworks = foundFrameworks.filter(f => rawFrameworkMarkers[f]);
    if (hydratedFrameworks.length > 0) {
      ssrScore += config.scoring.frameworkMarkers;
      indicators.push(`${hydratedFrameworks.join(', ')} hydration markers in raw HTML (SSR)`);
    } else {
      indicators.push(`${foundFrameworks.join(', ')} markers only in rendered DOM (not SSR evidence)`);
    }
  }

  // Detect static site generators
  const staticGeneratorMarkers = {};
  for (const [generator, selector] of Object.entries(config.staticGenerators)) {
    try {
      staticGeneratorMarkers[generator] = document.querySelector(selector) !== null;
    } catch (e) {
      staticGeneratorMarkers[generator] = false;
    }
  }

  const foundGenerators = Object.entries(staticGeneratorMarkers)
    .filter(([_, found]) => found)
    .map(([generator, _]) => generator);

  if (foundGenerators.length > 0) {
    ssrScore += config.scoring.staticGenerator;
    indicators.push(`${foundGenerators.join(', ')} static site generator detected (SSR)`);
    detailedInfo.generators = foundGenerators;
  }

  // Check for serialized data (strong SSR indicator)
  const bodyHTML = document.body.innerHTML;
  const hasInlineData = config.serializedDataPatterns.some(pattern =>
    bodyHTML.includes(pattern)
  ) || /window\.__[\w_]+__\s*=/.test(bodyHTML);

  if (hasInlineData) {
    ssrScore += config.scoring.serializedData;
    indicators.push("serialized data detected (SSR)");
  }

  // Analyze script patterns
  const scripts = document.querySelectorAll('script[src]');
  let frameworkScriptCount = 0;
  let hasLazyChunks = false;
  let hasHydrationScripts = false;

  scripts.forEach(script => {
    const src = script.src.toLowerCase();

    if (src.includes('react') || src.includes('vue') || src.includes('angular') ||
        src.includes('svelte') || src.includes('solid')) {
      frameworkScriptCount++;
    }

    if (src.includes('chunk') || src.includes('_next/static') || src.includes('_nuxt/')) {
      hasLazyChunks = true;
    }

    if (src.includes('hydrat') || src.includes('client')) {
      hasHydrationScripts = true;
    }
  });

  if (frameworkScriptCount > 0) {
    if (hasLazyChunks || hasHydrationScripts) {
      ssrScore += config.scoring.ssrHydrationScripts;
      indicators.push("SSR hydration scripts detected");
    } else {
      csrScore += config.scoring.csrFrameworkScripts;
      indicators.push("CSR framework scripts detected");
    }
  }

  // Check for client-side routing
  const hasClientRouting = config.routerSelectors.some(selector => {
    try {
      return document.querySelector(selector) !== null;
    } catch (e) {
      return false;
    }
  });

  if (hasClientRouting) {
    csrScore += config.scoring.clientRouting;
    indicators.push("client-side routing detected (CSR)");
  }

  return {
    ssrScore,
    csrScore,
    indicators,
    details: detailedInfo
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.detectFrameworks = detectFrameworks;
}
