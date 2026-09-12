/**
 * Meta Tags Detector Module
 * Analyzes meta tags and SEO indicators
 */

/**
 * Analyze meta tags for SSR/CSR indicators
 * @returns {Object} Detection results with score and indicators
 */
function analyzeMeta() {
  const config = window.DETECTOR_CONFIG;
  const indicators = [];
  const signals = [];
  let ssrScore = 0;

  const metaTags = document.querySelectorAll('meta[name], meta[property], meta[content]');
  let hasRichMeta = false;
  let hasSSRFrameworkMeta = false;

  metaTags.forEach(meta => {
    const name = (meta.getAttribute('name') || meta.getAttribute('property') || '').toLowerCase();
    const content = (meta.getAttribute('content') || '').toLowerCase();

    // Check for SSR framework indicators in meta tags
    if (name.includes('next') || name.includes('nuxt') || name.includes('gatsby') ||
        name.includes('remix') || content.includes('next.js')) {
      hasSSRFrameworkMeta = true;
    }

    // Check for rich meta content (indicates server-side generation)
    if ((name.includes('description') || name.includes('og:') || name.includes('twitter:')) &&
        content.length > config.content.minRichMetaLength) {
      hasRichMeta = true;
    }
  });

  if (hasSSRFrameworkMeta) {
    ssrScore += config.scoring.ssrFrameworkMeta;
    indicators.push("SSR framework meta detected");
    signals.push({
      id: "meta.framework",
      label: "Meta tags name a server framework",
      impact: "ssr",
      weight: config.scoring.ssrFrameworkMeta,
      detail: "A generator/framework meta tag points at a server-rendering stack.",
    });
  }

  if (hasRichMeta) {
    ssrScore += config.scoring.richMeta;
    indicators.push("rich meta tags present (SSR)");
    signals.push({
      id: "meta.rich",
      label: "Complete social/SEO metadata",
      impact: "ssr",
      weight: config.scoring.richMeta,
      detail: "Description and Open Graph/Twitter tags are filled in — crawlers get a usable document.",
    });
  }

  // Check for structured data (JSON-LD)
  const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (structuredDataScripts.length > 0) {
    ssrScore += config.scoring.structuredData;
    indicators.push("structured data present (SSR)");
    signals.push({
      id: "meta.structuredData",
      label: `JSON-LD structured data (${structuredDataScripts.length})`,
      impact: "ssr",
      weight: config.scoring.structuredData,
      detail: "Schema.org blocks are in the document, which search engines read without running scripts.",
    });
  }

  return {
    ssrScore,
    csrScore: 0,
    indicators,
    signals,
    details: {
      hasRichMeta,
      hasSSRFrameworkMeta,
      structuredDataCount: structuredDataScripts.length
    }
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.analyzeMeta = analyzeMeta;
}
