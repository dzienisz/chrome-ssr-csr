// Prevent duplicate injection
if (typeof window.__SSR_CSR_TELEMETRY_LOADED__ === 'undefined') {
  window.__SSR_CSR_TELEMETRY_LOADED__ = true;

/**
 * src/collectors/performance-collector.js
 */

/**
 * Performance Collector
 * Collects Core Web Vitals and performance metrics
 */

/**
 * Get Largest Contentful Paint (LCP)
 * Target: < 2.5s (Good), < 4.0s (Needs Improvement), >= 4.0s (Poor)
 */
function getLargestContentfulPaint() {
  return new Promise((resolve) => {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        observer.disconnect();
        resolve(lastEntry.renderTime || lastEntry.loadTime);
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      
      // Timeout after 2 seconds (quick analysis)
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 2000);
    } catch (error) {
      console.error('[Performance] LCP error:', error);
      resolve(null);
    }
  });
}

/**
 * Get Cumulative Layout Shift (CLS)
 * Target: < 0.1 (Good), < 0.25 (Needs Improvement), >= 0.25 (Poor)
 */
function getCumulativeLayoutShift() {
  return new Promise((resolve) => {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      
      // Collect for 1 second (quick analysis)
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 1000);
    } catch (error) {
      console.error('[Performance] CLS error:', error);
      resolve(null);
    }
  });
}

/**
 * Get First Input Delay (FID)
 * Target: < 100ms (Good), < 300ms (Needs Improvement), >= 300ms (Poor)
 */
function getFirstInputDelay() {
  return new Promise((resolve) => {
    try {
      const observer = new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0];
        observer.disconnect();
        resolve(firstInput.processingStart - firstInput.startTime);
      });
      observer.observe({ type: 'first-input', buffered: true });
      
      // Timeout after 2 seconds (user might not interact)
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, 2000);
    } catch (error) {
      console.error('[Performance] FID error:', error);
      resolve(null);
    }
  });
}

/**
 * Get Time to First Byte (TTFB)
 * Target: < 800ms (Good), < 1800ms (Needs Improvement), >= 1800ms (Poor)
 */
function getTimeToFirstByte() {
  try {
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (navTiming) {
      return navTiming.responseStart - navTiming.requestStart;
    }
    return null;
  } catch (error) {
    console.error('[Performance] TTFB error:', error);
    return null;
  }
}

/**
 * Get Time to Interactive (TTI)
 * Approximation using load event
 */
function getTimeToInteractive() {
  try {
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (navTiming) {
      return navTiming.domInteractive - navTiming.fetchStart;
    }
    return null;
  } catch (error) {
    console.error('[Performance] TTI error:', error);
    return null;
  }
}

/**
 * Get Total Blocking Time (TBT)
 * Sum of blocking time from long tasks
 */
function getTotalBlockingTime() {
  return new Promise((resolve) => {
    try {
      let tbt = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            tbt += entry.duration - 50;
          }
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
      
      // Collect for 1 second (quick analysis)
      setTimeout(() => {
        observer.disconnect();
        resolve(tbt);
      }, 1000);
    } catch (error) {
      console.error('[Performance] TBT error:', error);
      resolve(null);
    }
  });
}

/**
 * Get page load time
 */
function getPageLoadTime() {
  try {
    const navTiming = performance.getEntriesByType('navigation')[0];
    if (navTiming) {
      return navTiming.loadEventEnd - navTiming.fetchStart;
    }
    return null;
  } catch (error) {
    console.error('[Performance] Load time error:', error);
    return null;
  }
}

/**
 * Get resource count and transfer size
 */
function getResourceMetrics() {
  try {
    const resources = performance.getEntriesByType('resource');
    const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    
    return {
      resourceCount: resources.length,
      totalTransferSize: totalSize,
      cachedResources: resources.filter(r => r.transferSize === 0).length
    };
  } catch (error) {
    console.error('[Performance] Resource metrics error:', error);
    return {
      resourceCount: null,
      totalTransferSize: null,
      cachedResources: null
    };
  }
}

/**
 * Collect all Core Web Vitals
 * This is the main function to call
 */
async function collectCoreWebVitals() {
  const [lcp, cls, fid, tbt] = await Promise.all([
    getLargestContentfulPaint(),
    getCumulativeLayoutShift(),
    getFirstInputDelay(),
    getTotalBlockingTime()
  ]);
  
  const ttfb = getTimeToFirstByte();
  const tti = getTimeToInteractive();
  const pageLoadTime = getPageLoadTime();
  const resourceMetrics = getResourceMetrics();
  
  const metrics = {
    lcp: lcp ? Math.round(lcp) : null,
    cls: cls ? Math.round(cls * 1000) / 1000 : null,
    fid: fid ? Math.round(fid) : null,
    ttfb: ttfb ? Math.round(ttfb) : null,
    tti: tti ? Math.round(tti) : null,
    tbt: tbt ? Math.round(tbt) : null,
    pageLoadTime: pageLoadTime ? Math.round(pageLoadTime) : null,
    resourceCount: resourceMetrics.resourceCount,
    totalTransferSize: resourceMetrics.totalTransferSize,
    cachedResources: resourceMetrics.cachedResources,
    cacheHitRate: resourceMetrics.resourceCount > 0 
      ? Math.round((resourceMetrics.cachedResources / resourceMetrics.resourceCount) * 100) 
      : null
  };

  return metrics;
}

/**
 * Determine if metrics pass Core Web Vitals thresholds
 */
function evaluateCoreWebVitals(metrics) {
  const passes = {
    lcp: metrics.lcp && metrics.lcp < 2500,
    cls: metrics.cls && metrics.cls < 0.1,
    fid: metrics.fid && metrics.fid < 100
  };
  
  const passCount = Object.values(passes).filter(Boolean).length;
  const totalCount = Object.values(passes).filter(v => v !== null).length;
  
  return {
    passes,
    passRate: totalCount > 0 ? Math.round((passCount / totalCount) * 100) : null,
    allPass: passCount === 3
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.collectCoreWebVitals = collectCoreWebVitals;
  window.evaluateCoreWebVitals = evaluateCoreWebVitals;
}


/**
 * src/collectors/page-type-detector.js
 */

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


/**
 * src/collectors/device-detector.js
 */

/**
 * Device & Context Detector
 * Collects device, browser, and connection information
 */

/**
 * Detect device type based on screen width
 */
function getDeviceType() {
  const width = window.innerWidth;
  
  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Get screen information
 */
function getScreenInfo() {
  return {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: window.screen.colorDepth,
    orientation: window.screen.orientation?.type || 'unknown'
  };
}

/**
 * Detect if device has touch capability
 */
function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Get browser information
 */
function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let engineName = 'Unknown';
  
  // Detect browser
  if (ua.includes('Firefox/')) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Gecko';
  } else if (ua.includes('Edg/')) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Blink';
  } else if (ua.includes('Chrome/')) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Blink';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'WebKit';
  } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
    browserName = 'Opera';
    browserVersion = ua.match(/(?:Opera|OPR)\/(\d+\.\d+)/)?.[1] || 'Unknown';
    engineName = 'Blink';
  }
  
  return {
    name: browserName,
    version: browserVersion,
    engine: engineName,
    userAgent: ua
  };
}

/**
 * Get connection information
 * Uses Network Information API if available
 */
function getConnectionInfo() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) {
    return {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false
    };
  }
  
  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || null, // Mbps
    rtt: connection.rtt || null, // milliseconds
    saveData: connection.saveData || false
  };
}

/**
 * Get timezone and language
 */
function getLocaleInfo() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language || 'unknown',
    languages: navigator.languages || []
  };
}

/**
 * Detect if user has reduced motion preference
 */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Detect if user prefers dark mode
 */
function prefersDarkMode() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get memory information (if available)
 */
function getMemoryInfo() {
  if (performance.memory) {
    return {
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      usedJSHeapSize: performance.memory.usedJSHeapSize
    };
  }
  return null;
}

/**
 * Get hardware concurrency (CPU cores)
 */
function getHardwareConcurrency() {
  return navigator.hardwareConcurrency || null;
}

/**
 * Collect all device and context information
 */
function collectDeviceInfo() {
  const deviceInfo = {
    deviceType: getDeviceType(),
    screen: getScreenInfo(),
    isTouchDevice: isTouchDevice(),
    browser: getBrowserInfo(),
    connection: getConnectionInfo(),
    locale: getLocaleInfo(),
    preferences: {
      reducedMotion: prefersReducedMotion(),
      darkMode: prefersDarkMode()
    },
    hardware: {
      cpuCores: getHardwareConcurrency(),
      memory: getMemoryInfo()
    }
  };

  return deviceInfo;
}

/**
 * Get simplified device info for telemetry
 * (removes sensitive/detailed information)
 */
function getDeviceInfoForTelemetry() {
  const fullInfo = collectDeviceInfo();
  
  return {
    deviceType: fullInfo.deviceType,
    screenWidth: fullInfo.screen.width,
    screenHeight: fullInfo.screen.height,
    devicePixelRatio: fullInfo.screen.devicePixelRatio,
    isTouchDevice: fullInfo.isTouchDevice,
    browserName: fullInfo.browser.name,
    browserVersion: fullInfo.browser.version,
    engineName: fullInfo.browser.engine,
    connectionType: fullInfo.connection.type,
    effectiveType: fullInfo.connection.effectiveType,
    downlink: fullInfo.connection.downlink,
    rtt: fullInfo.connection.rtt,
    saveData: fullInfo.connection.saveData,
    timezone: fullInfo.locale.timezone,
    language: fullInfo.locale.language,
    prefersReducedMotion: fullInfo.preferences.reducedMotion,
    prefersDarkMode: fullInfo.preferences.darkMode,
    cpuCores: fullInfo.hardware.cpuCores
  };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.collectDeviceInfo = collectDeviceInfo;
  window.getDeviceInfoForTelemetry = getDeviceInfoForTelemetry;
}


/**
 * src/collectors/tech-stack-detector.js
 */

/**
 * Tech Stack Detector
 * Identifies CSS frameworks, state management, build tools, and hosting
 */

const TechStackDetector = {
  detect: function() {
    const techStack = {
      cssFramework: this.detectCSSFramework(),
      stateManagement: this.detectStateManagement(),
      buildTool: this.detectBuildTool(),
      hosting: this.detectHosting(),
      cdn: this.detectCDN(),
      globalVariables: this.detectGlobalVariables()
    };

    return techStack;
  },

  detectCSSFramework: function() {
    // Tailwind
    if (document.querySelector('[class*="text-"], [class*="bg-"], [class*="p-"]')) {
      const computedStyle = window.getComputedStyle(document.body);
      if (computedStyle.getPropertyValue('--tw-text-opacity')) return 'Tailwind';
    }

    // Bootstrap
    if (document.querySelector('[class*="col-"], .container, .btn-primary')) {
      if (document.querySelector('link[href*="bootstrap"]')) return 'Bootstrap';
      // Check for Bootstrap variables
      const computedStyle = window.getComputedStyle(document.body);
      if (computedStyle.getPropertyValue('--bs-blue')) return 'Bootstrap 5';
      if (computedStyle.getPropertyValue('--blue')) return 'Bootstrap 4';
    }

    // Material UI (MUI)
    if (document.querySelector('[class*="Mui"]')) return 'MUI';

    // Chakra UI
    if (document.querySelector('[class*="css-"]')) {
      const style = document.querySelector('style[data-emotion]');
      if (style && style.innerHTML.includes('chakra')) return 'Chakra UI';
    }

    // Bulma
    if (document.querySelector('.column, .is-primary')) {
      if (document.querySelector('link[href*="bulma"]')) return 'Bulma';
    }

    // Foundation
    if (document.querySelector('.top-bar, .reveal-modal')) return 'Foundation';
    
    // Ant Design
    if (document.querySelector('[class*="ant-"]')) return 'Ant Design';

    return null;
  },

  detectStateManagement: function() {
    const managers = [];

    // Redux (often exposed in window.__REDUX_DEVTOOLS_EXTENSION__)
    if (window.__REDUX_DEVTOOLS_EXTENSION__ || window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) {
      managers.push('Redux');
    }

    // MobX
    if (window.__MOBX_DEVTOOLS_GLOBAL_HOOK__) {
      managers.push('MobX');
    }

    // Recoil
    if (window.$recoilDebugStates) {
      managers.push('Recoil');
    }
    
    // XState
    if (window.__xstate__) {
      managers.push('XState');
    }
    
    // Apollo Client (State + Data)
    if (window.__APOLLO_CLIENT__) {
      managers.push('Apollo');
    }

    return managers;
  },

  detectBuildTool: function() {
    const scripts = Array.from(document.scripts).map(s => s.src);
    
    // Vite
    if (scripts.some(src => src.includes('/@vite/client'))) return 'Vite';
    if (document.querySelector('script[type="module"][src*="/src/"]')) return 'Vite';

    // Webpack
    if (window.webpackChunk || window.webpackJsonp) return 'Webpack';
    
    // Next.js (uses Webpack/Turbopack)
    if (window.__NEXT_DATA__) return 'Next.js Build';

    // Parcel
    if (window.parcelRequire) return 'Parcel';

    return null;
  },

  detectHosting: function() {
    const headers = document.head.innerHTML;
    
    // Vercel
    if (headers.includes('fl=vercel') || window.location.hostname.includes('.vercel.app')) return 'Vercel';
    
    // Netlify
    if (headers.includes('netlify') || window.location.hostname.includes('.netlify.app')) return 'Netlify';
    
    // GitHub Pages
    if (window.location.hostname.includes('github.io')) return 'GitHub Pages';
    
    // AWS Amplify
    if (window.location.hostname.includes('amplifyapp.com')) return 'AWS Amplify';
    
    // Heroku
    if (window.location.hostname.includes('herokuapp.com')) return 'Heroku';
    
    // Cloudflare Pages
    if (window.location.hostname.includes('pages.dev')) return 'Cloudflare Pages';

    return null;
  },
  
  detectCDN: function() {
    const resources = performance.getEntriesByType('resource');
    const domains = resources.map(r => {
      try { return new URL(r.name).hostname; } catch(e) { return ''; }
    });
    
    if (domains.some(d => d.includes('cloudflare'))) return 'Cloudflare';
    if (domains.some(d => d.includes('cloudfront.net'))) return 'AWS CloudFront';
    if (domains.some(d => d.includes('fastly'))) return 'Fastly';
    if (domains.some(d => d.includes('akamai'))) return 'Akamai';
    if (domains.some(d => d.includes('bunnycdn'))) return 'BunnyCDN';
    
    return null;
  },
  
  detectGlobalVariables: function() {
    // Capture interesting globals that hint at tech
    const interesting = [];
    if (window.React) interesting.push('React (Global)');
    if (window.Vue) interesting.push('Vue (Global)');
    if (window.jQuery) interesting.push('jQuery');
    if (window.Zepto) interesting.push('Zepto');
    if (window.angular) interesting.push('AngularJS');
    if (window.Backbone) interesting.push('Backbone');
    if (window.Ember) interesting.push('Ember');
    
    return interesting;
  }
};

// Export for browser context
if (typeof window !== 'undefined') {
  window.TechStackDetector = TechStackDetector;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TechStackDetector;
}


/**
 * src/collectors/seo-detector.js
 */

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


/**
 * src/collectors/hydration-detector.js
 */

/**
 * Hydration Detector
 * Detects React/Vue hydration mismatch errors extracted by the probe
 */

const HydrationDetector = {
  detect: function() {
    const probeData = this.getProbeData();
    
    if (!probeData) {
      return {
        errorCount: 0,
        errors: [],
        score: 100
      };
    }

    const errorCount = probeData.hydrationErrors.length;
    
    // Calculate health score (100 = perfect, 0 = severe issues)
    // -5 points per error, minimum 0
    const score = Math.max(0, 100 - (errorCount * 5));

    return {
      errorCount,
      errors: probeData.hydrationErrors.slice(0, 5), // Top 5 errors
      score
    };
  },

  getProbeData: function() {
    // Try to trigger data refresh from probe
    try {
      window.dispatchEvent(new CustomEvent('ssr-detector-request-data'));
    } catch (e) {}

    const dataElement = document.getElementById('ssr-detector-probe-data');
    if (!dataElement) return null;

    try {
      return JSON.parse(dataElement.textContent);
    } catch (e) {
      return null;
    }
  }
};

if (typeof window !== 'undefined') {
  window.HydrationDetector = HydrationDetector;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HydrationDetector;
}


/**
 * src/collectors/navigation-detector.js
 */

/**
 * Navigation Detector
 * Analyzes client-side navigation behavior (SPA transitions)
 */

const NavigationDetector = {
  detect: function() {
    const probeData = window.HydrationDetector ? window.HydrationDetector.getProbeData() : null;

    if (!probeData) {
      // Fallback detection if probe isn't ready
      return {
        isSPA: this.detectSPA(),
        clientRoutes: 0
      };
    }

    const navigations = probeData.navigations || [];
    const clientRoutes = navigations.length;

    return {
      isSPA: clientRoutes > 0 || this.detectSPA(),
      clientRoutes,
      routes: navigations.slice(-5) // Last 5 routes
    };
  },

  // Fallback static analysis if no history events yet
  detectSPA: function() {
    // Check for common routers
    if (window.next && window.next.router) return true;
    return false;
  }
};

if (typeof window !== 'undefined') {
  window.NavigationDetector = NavigationDetector;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NavigationDetector;
}


/**
 * src/core/telemetry-collector.js
 */

/**
 * Telemetry Collector
 * Orchestrates all telemetry collection after detection is complete.
 * Only loaded when shareData is enabled.
 */

/**
 * Collect all telemetry data
 * @param {Object} detectionResults - Results from pageAnalyzer()
 * @returns {Promise<Object>} Telemetry data
 */
async function collectTelemetryData(detectionResults) {
  const [coreWebVitals, pageType, deviceInfo, techStack, seoAccessibility] =
    await Promise.allSettled([
      typeof window.collectCoreWebVitals === 'function'
        ? Promise.race([
            window.collectCoreWebVitals(),
            new Promise(resolve => setTimeout(() => resolve(null), 500))
          ])
        : Promise.resolve(null),
      Promise.resolve(
        typeof window.detectPageType === 'function'
          ? window.detectPageType()
          : 'other'
      ),
      Promise.resolve(
        typeof window.getDeviceInfoForTelemetry === 'function'
          ? window.getDeviceInfoForTelemetry()
          : null
      ),
      Promise.resolve(
        typeof window.TechStackDetector === 'object'
          ? window.TechStackDetector.detect()
          : null
      ),
      Promise.resolve(
        typeof window.SEODetector === 'object'
          ? window.SEODetector.detect()
          : null
      )
    ]).then(r => r.map(x => x.value ?? null));

  const hydrationData = typeof window.HydrationDetector === 'object'
    ? window.HydrationDetector.detect()
    : null;

  const navigationData = typeof window.NavigationDetector === 'object'
    ? window.NavigationDetector.detect()
    : null;

  return { coreWebVitals, pageType, deviceInfo, techStack, seoAccessibility, hydrationData, navigationData };
}

if (typeof window !== 'undefined') {
  window.collectTelemetryData = collectTelemetryData;
}



} // End of injection guard
