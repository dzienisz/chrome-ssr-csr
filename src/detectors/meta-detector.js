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
  }

  if (hasRichMeta) {
    ssrScore += config.scoring.richMeta;
    indicators.push("rich meta tags present (SSR)");
  }

  // Check for structured data (JSON-LD)
  const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (structuredDataScripts.length > 0) {
    ssrScore += config.scoring.structuredData;
    indicators.push("structured data present (SSR)");
  }

  return {
    ssrScore,
    csrScore: 0,
    indicators,
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
