/**
 * Framework Detector Module
 * Detects JavaScript frameworks and their hydration patterns
 */

/**
 * Detect frameworks and their rendering patterns
 * @returns {Object} Detection results with score and indicators
 */
function detectFrameworks() {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  let ssrScore = 0;
  let csrScore = 0;
  const detailedInfo = {};

  // Detect framework hydration markers
  const frameworkMarkers = {};
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
    } catch (e) {
      frameworkMarkers[framework] = false;
    }
  }

  const foundFrameworks = Object.entries(frameworkMarkers)
    .filter(([_, found]) => found)
    .map(([framework, _]) => framework);

  if (foundFrameworks.length > 0) {
    ssrScore += config.scoring.frameworkMarkers;
    indicators.push(`${foundFrameworks.join(', ')} hydration markers (SSR)`);
    detailedInfo.frameworks = foundFrameworks;
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
