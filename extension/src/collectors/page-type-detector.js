/**
 * Page Type Detector
 * Detects the type of page being analyzed
 */

/**
 * Detect if page is an e-commerce/shopping page
 */
function isEcommercePage() {
  // Check for common e-commerce indicators
  const ecommerceSelectors = [
    '[class*="cart"]',
    '[id*="cart"]',
    '[class*="checkout"]',
    '[id*="checkout"]',
    '[class*="product"]',
    '[id*="product"]',
    '[class*="shop"]',
    '[itemtype*="Product"]',
    'button[class*="add-to-cart"]',
    'button[class*="buy"]',
    '.price',
    '[class*="price"]'
  ];
  
  for (const selector of ecommerceSelectors) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  
  // Check URL patterns
  const url = window.location.href.toLowerCase();
  const ecommercePatterns = ['/shop', '/store', '/product', '/cart', '/checkout', '/buy'];
  return ecommercePatterns.some(pattern => url.includes(pattern));
}

/**
 * Detect if page has authentication (login/signup)
 */
function isAuthPage() {
  // Check for login/signup forms
  const authSelectors = [
    'form[action*="login"]',
    'form[action*="signin"]',
    'form[action*="signup"]',
    'form[action*="register"]',
    'input[type="password"]',
    '[class*="login"]',
    '[class*="signin"]',
    '[class*="signup"]',
    '[id*="login"]',
    '[id*="signin"]'
  ];
  
  for (const selector of authSelectors) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  
  // Check URL patterns
  const url = window.location.href.toLowerCase();
  const authPatterns = ['/login', '/signin', '/signup', '/register', '/auth'];
  return authPatterns.some(pattern => url.includes(pattern));
}

/**
 * Detect if page is a blog/article
 */
function isBlogPage() {
  // Check for blog/article indicators
  const blogSelectors = [
    'article',
    '[itemtype*="Article"]',
    '[itemtype*="BlogPosting"]',
    '.post',
    '.article',
    '[class*="blog"]',
    '[class*="post"]',
    'time[datetime]',
    '.author',
    '[rel="author"]'
  ];
  
  let blogIndicators = 0;
  for (const selector of blogSelectors) {
    if (document.querySelector(selector)) {
      blogIndicators++;
    }
  }
  
  // Check URL patterns
  const url = window.location.href.toLowerCase();
  const blogPatterns = ['/blog', '/post', '/article', '/news', '/story'];
  const hasUrlPattern = blogPatterns.some(pattern => url.includes(pattern));
  
  // Require at least 2 indicators or URL pattern
  return blogIndicators >= 2 || hasUrlPattern;
}

/**
 * Detect if page is documentation
 */
function isDocsPage() {
  // Check for docs indicators
  const docsSelectors = [
    '[class*="docs"]',
    '[id*="docs"]',
    '[class*="documentation"]',
    'nav[class*="sidebar"]',
    '.toc',
    '[class*="table-of-contents"]',
    'code',
    'pre'
  ];
  
  let docsIndicators = 0;
  for (const selector of docsSelectors) {
    if (document.querySelector(selector)) {
      docsIndicators++;
    }
  }
  
  // Check URL patterns
  const url = window.location.href.toLowerCase();
  const docsPatterns = ['/docs', '/documentation', '/api', '/guide', '/tutorial', '/reference'];
  const hasUrlPattern = docsPatterns.some(pattern => url.includes(pattern));
  
  // Require at least 3 indicators or URL pattern
  return docsIndicators >= 3 || hasUrlPattern;
}

/**
 * Detect if page is a homepage
 */
function isHomepage() {
  const url = window.location.href;
  const urlObj = new URL(url);
  
  // Check if URL is root or just domain
  const isRoot = urlObj.pathname === '/' || urlObj.pathname === '';
  
  // Check for common homepage indicators
  const hasHero = document.querySelector('[class*="hero"], [id*="hero"], .jumbotron');
  const hasCTA = document.querySelector('[class*="cta"], button[class*="get-started"]');
  
  return isRoot && (hasHero || hasCTA);
}

/**
 * Detect if page is a dashboard/app
 */
function isAppPage() {
  // Check for app/dashboard indicators
  const appSelectors = [
    '[class*="dashboard"]',
    '[id*="dashboard"]',
    '[class*="app"]',
    '[role="application"]',
    'nav[class*="sidebar"]',
    '[class*="sidebar"]',
    '.app-container',
    '[data-testid*="app"]'
  ];
  
  let appIndicators = 0;
  for (const selector of appSelectors) {
    if (document.querySelector(selector)) {
      appIndicators++;
    }
  }
  
  // Check URL patterns
  const url = window.location.href.toLowerCase();
  const appPatterns = ['/app', '/dashboard', '/admin', '/console', '/panel'];
  const hasUrlPattern = appPatterns.some(pattern => url.includes(pattern));
  
  // Check for many interactive elements (typical of apps)
  const buttonCount = document.querySelectorAll('button').length;
  const inputCount = document.querySelectorAll('input').length;
  const isInteractive = buttonCount > 10 || inputCount > 5;
  
  return appIndicators >= 2 || hasUrlPattern || isInteractive;
}

/**
 * Detect page type
 * Returns the most specific type found
 */
function detectPageType() {
  // Check in order of specificity
  if (isEcommercePage()) return 'ecommerce';
  if (isAuthPage()) return 'auth';
  if (isBlogPage()) return 'blog';
  if (isDocsPage()) return 'docs';
  if (isAppPage()) return 'app';
  if (isHomepage()) return 'homepage';
  return 'other';
}

/**
 * Get additional page characteristics
 */
function getPageCharacteristics() {
  return {
    hasVideo: document.querySelector('video') !== null,
    imageCount: document.querySelectorAll('img').length,
    hasForm: document.querySelector('form') !== null,
    formCount: document.querySelectorAll('form').length,
    hasAnalytics: detectAnalytics(),
    languageCode: document.documentElement.lang || 'unknown',
    isResponsive: document.querySelector('meta[name="viewport"]') !== null,
    hasPWA: 'serviceWorker' in navigator && document.querySelector('link[rel="manifest"]') !== null
  };
}

/**
 * Detect analytics tools
 */
function detectAnalytics() {
  const analytics = [];
  
  // Google Analytics
  if (window.ga || window.gtag || window.dataLayer) {
    analytics.push('GA');
  }
  
  // Google Tag Manager
  if (window.google_tag_manager) {
    analytics.push('GTM');
  }
  
  // Mixpanel
  if (window.mixpanel) {
    analytics.push('Mixpanel');
  }
  
  // Hotjar
  if (window.hj) {
    analytics.push('Hotjar');
  }
  
  // Segment
  if (window.analytics && window.analytics.track) {
    analytics.push('Segment');
  }
  
  // Amplitude
  if (window.amplitude) {
    analytics.push('Amplitude');
  }
  
  return analytics;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.detectPageType = detectPageType;
  window.getPageCharacteristics = getPageCharacteristics;
}
