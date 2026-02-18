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
