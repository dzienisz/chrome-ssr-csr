/**
 * SEO & Accessibility Detector
 * Analyzes meta tags, structured data, and accessibility attributes
 */

const SEODetector = {
  detect: function() {
    return {
      seo: this.analyzeSEO(),
      accessibility: this.analyzeAccessibility()
    };
  },

  analyzeSEO: function() {
    // Meta Description
    const metaDesc = document.querySelector('meta[name="description"]');
    const hasMetaDescription = !!metaDesc;
    const metaDescriptionLength = metaDesc ? metaDesc.content.length : 0;

    // Title
    const titleLength = document.title ? document.title.length : 0;

    // Headings
    const h1Count = document.getElementsByTagName('h1').length;
    const h2Count = document.getElementsByTagName('h2').length;

    // Open Graph
    const hasOGTags = !!document.querySelector('meta[property^="og:"]');
    const hasOGImage = !!document.querySelector('meta[property="og:image"]');
    
    // Twitter Card
    const hasTwitterCard = !!document.querySelector('meta[name^="twitter:"]');

    // Canonical
    const canonical = document.querySelector('link[rel="canonical"]');
    const hasCanonicalURL = !!(canonical && canonical.href);

    // Robots
    const robots = document.querySelector('meta[name="robots"]');
    const hasRobotsMeta = !!robots;

    // Structured Data (JSON-LD)
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    const hasStructuredData = !!jsonLd;
    let structuredDataTypes = [];
    if (jsonLd) {
      try {
        const data = JSON.parse(jsonLd.innerText);
        if (Array.isArray(data)) {
          structuredDataTypes = data.map(item => item['@type']);
        } else {
          structuredDataTypes = [data['@type']];
        }
      } catch (e) {
        // invalid json
      }
    }
    
    // Viewport
    const viewport = document.querySelector('meta[name="viewport"]');
    const isMobileFriendly = !!(viewport && viewport.content.includes('width=device-width'));

    return {
      hasMetaDescription,
      metaDescriptionLength,
      titleLength,
      h1Count,
      h2Count,
      hasOGTags,
      hasOGImage,
      hasTwitterCard,
      hasCanonicalURL,
      hasRobotsMeta,
      hasStructuredData,
      structuredDataTypes,
      isMobileFriendly
    };
  },

  analyzeAccessibility: function() {
    // Images Alt Text
    const images = Array.from(document.getElementsByTagName('img'));
    const totalImages = images.length;
    const imagesWithAlt = images.filter(img => img.hasAttribute('alt') && img.alt.trim().length > 0).length;
    const altTextCoverage = totalImages > 0 ? (imagesWithAlt / totalImages) * 100 : 100;

    // ARIA Labels
    const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]').length;
    const hasAriaLabels = elementsWithAria > 0;
    
    // Landmarks
    const landmarks = document.querySelectorAll('main, nav, header, footer, aside, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]');
    const hasLandmarks = landmarks.length > 0;
    
    // Lang Attribute
    const htmlLang = document.documentElement.lang;
    const hasLangAttribute = !!htmlLang;
    
    // Skip Links (heuristic: usually first link, potentially hidden)
    const firstLink = document.body.querySelector('a');
    const hasSkipLinks = firstLink && (firstLink.textContent.toLowerCase().includes('skip') || firstLink.href.includes('#main'));

    // Buttons without text
    const buttons = Array.from(document.getElementsByTagName('button'));
    const emptyButtons = buttons.filter(btn => !btn.innerText.trim() && !btn.getAttribute('aria-label')).length;

    return {
      hasAriaLabels,
      totalImages,
      imagesWithAlt,
      altTextCoverage: Math.round(altTextCoverage),
      hasLandmarks,
      hasLangAttribute,
      language: htmlLang || 'unknown',
      hasSkipLinks: !!hasSkipLinks,
      emptyButtons,
      wcagLevel: 'unknown' // Would require more complex analysis
    };
  }
};

// Export for browser context
if (typeof window !== 'undefined') {
  window.SEODetector = SEODetector;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SEODetector;
}
