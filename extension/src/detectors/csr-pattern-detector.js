/**
 * CSR Pattern Detector Module
 * Detects patterns specific to client-side rendered applications
 */

/**
 * Detect CSR-specific patterns in the page
 * @returns {Object} Detection results with score and indicators
 */
function detectCSRPatterns() {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  const signals = [];
  let csrScore = 0;

  // Check for typical SPA root containers
  const root = document.getElementById('root') || document.getElementById('app');
  if (root) {
    // Check for React/Vue root markers
    const hasReactRoot = root.hasAttribute('data-reactroot') ||
                         root._reactRootContainer !== undefined;
    const hasVueApp = root.hasAttribute('data-v-app') ||
                      root.__vue_app__ !== undefined;

    // SPA frameworks typically inject content into a single root with few initial children
    // After hydration, the root will have content but the marker attributes indicate SPA
    if (hasReactRoot || hasVueApp) {
      csrScore += config.scoring.spaRootPattern;
      indicators.push("SPA root container pattern detected (CSR)");
      signals.push({
        id: "csr.spaRoot",
        label: "Single-page-app mount point",
        impact: "csr",
        weight: config.scoring.spaRootPattern,
        detail: `#${root.id} carries framework root markers — the whole page hangs off one container.`,
      });
    }
  }

  // Check for noscript fallback content (common in CSR/SPA apps)
  const noscripts = document.querySelectorAll('noscript');
  for (const noscript of noscripts) {
    const text = noscript.textContent.toLowerCase();
    if (text.includes('javascript') ||
        text.includes('enable js') ||
        text.includes('requires javascript') ||
        text.includes('need to enable')) {
      csrScore += config.scoring.noscriptFallback;
      indicators.push("JavaScript required message found (CSR)");
      signals.push({
        id: "csr.noscript",
        label: "\u201cJavaScript required\u201d fallback",
        impact: "csr",
        weight: config.scoring.noscriptFallback,
        detail: "The page ships a <noscript> notice telling visitors the site needs JavaScript.",
      });
      break;
    }
  }

  // Check for empty initial HTML indicators
  // Look for common CSR patterns in the HTML structure
  const bodyClasses = document.body.className.toLowerCase();

  // Many CSR apps add classes dynamically after load
  if (bodyClasses.includes('js-loaded') ||
      bodyClasses.includes('app-loaded') ||
      bodyClasses.includes('hydrated')) {
    csrScore += 10;
    indicators.push("dynamic body class detected (CSR)");
    signals.push({
      id: "csr.bodyClass",
      label: "Body class set after boot",
      impact: "csr",
      weight: 10,
      detail: "A js-loaded / app-loaded / hydrated class was added to <body> by script.",
    });
  }

  return {
    ssrScore: 0,
    csrScore,
    indicators,
    signals,
    details: {
      hasRoot: !!root,
      hasNoscriptWarning: indicators.some(i => i.includes('JavaScript required'))
    }
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.detectCSRPatterns = detectCSRPatterns;
}
