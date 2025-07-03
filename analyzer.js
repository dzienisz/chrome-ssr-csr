// Enhanced Page Analysis Module - Improved SSR vs CSR Detection
function pageAnalyzer() {
  const indicators = [];
  let ssrScore = 0;
  let csrScore = 0;
  const detailedInfo = {};

  // === ENHANCED HTML CONTENT ANALYSIS ===
  const bodyHTML = document.body.innerHTML;
  const bodyText = document.body.innerText.trim();
  
  // Check for substantial initial content with better metrics
  const hasRichInitialContent = document.body.children.length > 3 && 
    bodyText.length > 200 && 
    document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, article, section').length > 5;
  
  if (hasRichInitialContent) {
    ssrScore += 35;
    indicators.push("rich initial content structure (SSR)");
  } else if (bodyText.length < 50) {
    csrScore += 30;
    indicators.push("minimal text content (CSR)");
  }

  // === FRAMEWORK-SPECIFIC DETECTION ===
  // Enhanced hydration markers detection
  const frameworkMarkers = {
    react: document.querySelector('[data-reactroot], [data-react-hydration-marker]') !== null,
    nextjs: document.querySelector('#__next, #__NEXT_DATA__') !== null,
    nuxt: document.querySelector('#__nuxt, #__NUXT__') !== null,
    gatsby: document.querySelector('#___gatsby') !== null,
    sveltekit: document.querySelector('#svelte') !== null,
    astro: document.querySelector('[data-astro-island]') !== null,
    remix: document.querySelector('[data-remix-run]') !== null,
    qwik: document.querySelector('[q\\:container]') !== null,
    solidjs: document.querySelector('[data-solid]') !== null
  };

  const foundFrameworks = Object.entries(frameworkMarkers)
    .filter(([_, found]) => found)
    .map(([framework, _]) => framework);

  if (foundFrameworks.length > 0) {
    ssrScore += 30;
    indicators.push(`${foundFrameworks.join(', ')} hydration markers (SSR)`);
    detailedInfo.frameworks = foundFrameworks;
  }

  // === SERIALIZED DATA DETECTION ===
  // Check for inline JSON data (strong SSR indicator)
  const hasInlineData = bodyHTML.includes('__NEXT_DATA__') ||
    bodyHTML.includes('window.__INITIAL_STATE__') ||
    bodyHTML.includes('window.__APOLLO_STATE__') ||
    bodyHTML.includes('window.__PRELOADED_STATE__') ||
    bodyHTML.includes('application/json') ||
    /window\.__[\w_]+__\s*=/.test(bodyHTML);

  if (hasInlineData) {
    ssrScore += 25;
    indicators.push("serialized data detected (SSR)");
  }

  // === META TAGS AND SEO ANALYSIS ===
  const metaTags = document.querySelectorAll('meta[name], meta[property], meta[content]');
  let hasRichMeta = false;
  let hasSSRFrameworkMeta = false;
  
  metaTags.forEach(meta => {
    const name = (meta.getAttribute('name') || meta.getAttribute('property') || '').toLowerCase();
    const content = (meta.getAttribute('content') || '').toLowerCase();
    
    // Check for SSR framework indicators
    if (name.includes('next') || name.includes('nuxt') || name.includes('gatsby') || 
        name.includes('remix') || content.includes('next.js')) {
      hasSSRFrameworkMeta = true;
    }
    
    // Check for rich meta content (indicates server-side generation)
    if ((name.includes('description') || name.includes('og:') || name.includes('twitter:')) && 
        content.length > 20) {
      hasRichMeta = true;
    }
  });
  
  if (hasSSRFrameworkMeta) {
    ssrScore += 20;
    indicators.push("SSR framework meta detected");
  }
  
  if (hasRichMeta) {
    ssrScore += 15;
    indicators.push("rich meta tags present (SSR)");
  }

  // === SCRIPT ANALYSIS ===
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
      ssrScore += 15; // Likely SSR with hydration
      indicators.push("SSR hydration scripts detected");
    } else {
      csrScore += 25; // Likely pure CSR
      indicators.push("CSR framework scripts detected");
    }
  }

  // === STATIC SITE GENERATOR DETECTION ===
  const staticGeneratorMarkers = {
    jekyll: document.querySelector('meta[name="generator"][content*="Jekyll"]') !== null,
    hugo: document.querySelector('meta[name="generator"][content*="Hugo"]') !== null,
    eleventy: document.querySelector('meta[name="generator"][content*="Eleventy"]') !== null,
    hexo: document.querySelector('meta[name="generator"][content*="Hexo"]') !== null
  };

  const foundGenerators = Object.entries(staticGeneratorMarkers)
    .filter(([_, found]) => found)
    .map(([generator, _]) => generator);

  if (foundGenerators.length > 0) {
    ssrScore += 40;
    indicators.push(`${foundGenerators.join(', ')} static site generator detected (SSR)`);
    detailedInfo.generators = foundGenerators;
  }

  // === PERFORMANCE TIMING ANALYSIS ===
  const performanceEntries = performance.getEntriesByType('navigation');
  if (performanceEntries.length > 0) {
    const navTiming = performanceEntries[0];
    const domContentLoadedTime = navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart;
    const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0];
    
    // Fast initial render suggests SSR
    if (domContentLoadedTime < 30) {
      ssrScore += 25;
      indicators.push("very fast DOM ready (SSR)");
    } else if (domContentLoadedTime > 500) {
      csrScore += 20;
      indicators.push("slow DOM ready (CSR)");
    }
    
    // FCP timing analysis
    if (firstContentfulPaint && firstContentfulPaint.startTime < 800) {
      ssrScore += 15;
      indicators.push("fast first contentful paint (SSR)");
    }
    
    detailedInfo.timing = {
      domContentLoaded: Math.round(domContentLoadedTime),
      firstContentfulPaint: firstContentfulPaint ? Math.round(firstContentfulPaint.startTime) : null
    };
  }

  // === SPA/CSR SPECIFIC INDICATORS ===
  // Router-specific elements
  const routerSelectors = [
    '[data-router]', '[router-outlet]', '.router-view', 
    '[ui-view]', '[ng-view]', '.route-component'
  ];
  const hasClientRouting = routerSelectors.some(selector => 
    document.querySelector(selector) !== null
  );
  
  if (hasClientRouting) {
    csrScore += 20;
    indicators.push("client-side routing detected (CSR)");
  }

  // === LOADING STATES AND PLACEHOLDERS ===
  const loadingIndicators = bodyHTML.toLowerCase();
  const hasLoadingStates = loadingIndicators.includes('loading') || 
    loadingIndicators.includes('spinner') || 
    loadingIndicators.includes('skeleton') ||
    document.querySelector('.loading, .spinner, .skeleton') !== null;

  if (hasLoadingStates && bodyText.length < 100) {
    csrScore += 20;
    indicators.push("loading states with minimal content (CSR)");
  }

  // === STRUCTURED DATA ANALYSIS ===
  const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (structuredDataScripts.length > 0) {
    ssrScore += 15;
    indicators.push("structured data present (SSR)");
  }

  // === CONTENT-TO-SCRIPT RATIO ===
  const allElements = document.querySelectorAll('*').length;
  const scriptElements = document.querySelectorAll('script').length;
  const scriptRatio = scriptElements / allElements;

  if (scriptRatio > 0.15) {
    csrScore += 15;
    indicators.push("high script-to-content ratio (CSR)");
  } else if (scriptRatio < 0.05) {
    ssrScore += 10;
    indicators.push("low script-to-content ratio (SSR)");
  }

  // === FINAL CALCULATION WITH WEIGHTED CONFIDENCE ===
  const totalScore = ssrScore + csrScore;
  const ssrPercentage = totalScore > 0 ? Math.round((ssrScore / totalScore) * 100) : 50;
  
  let renderType, confidence;
  
  // Enhanced confidence calculation
  const indicatorCount = indicators.length;
  const baseConfidence = Math.abs(ssrPercentage - 50) * 2; // Base confidence from score difference
  const indicatorBonus = Math.min(indicatorCount * 3, 20); // Bonus for number of indicators
  
  if (ssrPercentage >= 75) {
    renderType = "Server-Side Rendered (SSR)";
    confidence = Math.min(baseConfidence + indicatorBonus, 95);
  } else if (ssrPercentage <= 25) {
    renderType = "Client-Side Rendered (CSR)";
    confidence = Math.min(baseConfidence + indicatorBonus, 95);
  } else if (ssrPercentage >= 60) {
    renderType = "Likely SSR with Hydration";
    confidence = Math.min(baseConfidence + indicatorBonus, 85);
  } else if (ssrPercentage <= 40) {
    renderType = "Likely CSR/SPA";
    confidence = Math.min(baseConfidence + indicatorBonus, 85);
  } else {
    renderType = "Hybrid/Mixed Rendering";
    confidence = Math.min(baseConfidence + 10, 70);
  }

  return {
    renderType,
    confidence: Math.max(confidence, 30), // Minimum confidence of 30%
    indicators: indicators.length > 0 ? indicators : ["basic analysis"],
    detailedInfo: {
      ssrScore,
      csrScore,
      ssrPercentage,
      totalIndicators: indicatorCount,
      ...detailedInfo
    }
  };
}

// Helper function to get color based on render type
function getTypeColor(renderType) {
  if (renderType.includes('SSR')) return '#059669';
  if (renderType.includes('CSR')) return '#dc2626';
  if (renderType.includes('Hybrid')) return '#d97706';
  return '#6b7280';
}

// Helper function to create confidence bar
function getConfidenceBar(confidence) {
  const width = Math.max(confidence, 10);
  const color = confidence >= 70 ? '#059669' : confidence >= 50 ? '#d97706' : '#dc2626';
  
  return `
    <div style="background: #f1f5f9; border-radius: 4px; height: 6px; width: 100%; margin-top: 4px; overflow: hidden;">
      <div style="background: ${color}; height: 100%; width: ${width}%; border-radius: 4px; transition: width 0.3s ease;"></div>
    </div>
  `;
}

// Helper function to create results HTML
function createResultsHTML(results) {
  const { renderType, confidence, indicators, detailedInfo } = results;
  
  let resultHTML = `
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
      <div style="margin-bottom: 8px;">
        <strong style="color: #2563eb;">Render Type:</strong>
        <br>
        <span style="font-weight: 600; color: ${getTypeColor(renderType)}">${renderType}</span>
      </div>
      <div style="margin-bottom: 8px;">
        <strong style="color: #2563eb;">Confidence:</strong> 
        <span style="font-weight: 600;">${confidence}%</span>
        ${getConfidenceBar(confidence)}
      </div>
      <div style="margin-bottom: 8px;">
        <strong style="color: #2563eb;">Analysis Score:</strong> 
        <br>
        <span style="font-size: 12px; color: #666;">
          SSR: ${detailedInfo.ssrScore} | CSR: ${detailedInfo.csrScore} 
          (${detailedInfo.ssrPercentage}% SSR)
        </span>
      </div>
    </div>
    
    <div style="margin-bottom: 10px;">
      <strong style="color: #2563eb;">Key Indicators (${detailedInfo.totalIndicators}):</strong>
      <div style="margin-top: 4px; font-size: 13px; line-height: 1.4;">
        ${indicators.map(indicator => `<span style="display: inline-block; background: #f1f5f9; padding: 2px 6px; margin: 2px 2px; border-radius: 5px; font-size: 11px;">${indicator}</span>`).join('')}
      </div>
    </div>
  `;
  
  // Add framework detection if available
  if (detailedInfo.frameworks && detailedInfo.frameworks.length > 0) {
    resultHTML += `
      <div style="margin-bottom: 8px;">
        <strong style="color: #2563eb;">Detected Frameworks:</strong> 
        <span style="font-weight:700;">${detailedInfo.frameworks.join(', ').toUpperCase()}</span>
      </div>
    `;
  }
  
  // Add static generator information if available
  if (detailedInfo.generators && detailedInfo.generators.length > 0) {
    resultHTML += `
      <div style="margin-bottom: 8px;">
        <strong style="color: #2563eb;">Static Site Generator:</strong> 
        <span style="font-weight:700;">${detailedInfo.generators.join(', ').toUpperCase()}</span>
      </div>
    `;
  }
  
  // Add timing information if available
  if (detailedInfo.timing) {
    resultHTML += `
      <div style="margin-bottom: 8px;">
        <strong style="color: #2563eb;">Performance:</strong>
        <div style="font-size: 12px; color: #666; margin-top: 2px;">
          DOM Ready: ${detailedInfo.timing.domContentLoaded}ms
          ${detailedInfo.timing.firstContentfulPaint ? 
            ` | FCP: ${detailedInfo.timing.firstContentfulPaint}ms` : ''}
        </div>
      </div>
    `;
  }
  
  return resultHTML;
}

// Export functions for use in other files
window.pageAnalyzer = pageAnalyzer;
window.getTypeColor = getTypeColor;
window.getConfidenceBar = getConfidenceBar;
window.createResultsHTML = createResultsHTML;
