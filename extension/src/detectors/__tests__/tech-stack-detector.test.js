import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the detector module
import '../tech-stack-detector.js';

describe('TechStackDetector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Reset window properties
    delete window.__REDUX_DEVTOOLS_EXTENSION__;
    delete window.__MOBX_DEVTOOLS_GLOBAL_HOOK__;
    delete window.__APOLLO_CLIENT__;
    delete window.__NEXT_DATA__;
    delete window.webpackChunk;
    delete window.webpackJsonp;
    delete window.parcelRequire;
    delete window.React;
    delete window.Vue;
    delete window.jQuery;

    // Reset performance mock
    global.performance.getEntriesByType = vi.fn(() => []);
  });

  describe('detectCSSFramework', () => {
    it('should detect Tailwind CSS', () => {
      document.body.innerHTML = '<div class="text-lg bg-blue-500 p-4">Styled</div>';

      // Mock getComputedStyle to return Tailwind variable
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = vi.fn(() => ({
        getPropertyValue: (prop) => prop === '--tw-text-opacity' ? '1' : ''
      }));

      const result = window.TechStackDetector.detectCSSFramework();

      expect(result).toBe('Tailwind');

      window.getComputedStyle = originalGetComputedStyle;
    });

    it('should detect Bootstrap via link', () => {
      document.head.innerHTML = '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.css">';
      document.body.innerHTML = '<div class="col-12 container btn-primary">Bootstrap</div>';

      const result = window.TechStackDetector.detectCSSFramework();

      expect(result).toBe('Bootstrap');
    });

    it('should detect MUI', () => {
      document.body.innerHTML = '<div class="MuiButton-root MuiPaper-root">MUI app</div>';

      const result = window.TechStackDetector.detectCSSFramework();

      expect(result).toBe('MUI');
    });

    it('should detect Ant Design', () => {
      document.body.innerHTML = '<div class="ant-btn ant-layout">Ant Design app</div>';

      const result = window.TechStackDetector.detectCSSFramework();

      expect(result).toBe('Ant Design');
    });

    it('should detect Bulma via link', () => {
      document.head.innerHTML = '<link href="https://cdn.bulma.io/bulma.css">';
      document.body.innerHTML = '<div class="column is-primary">Bulma</div>';

      const result = window.TechStackDetector.detectCSSFramework();

      expect(result).toBe('Bulma');
    });

    it('should detect Foundation', () => {
      document.body.innerHTML = '<div class="top-bar"><div class="reveal-modal">Foundation</div></div>';

      const result = window.TechStackDetector.detectCSSFramework();

      expect(result).toBe('Foundation');
    });

    it('should return null for no CSS framework', () => {
      document.body.innerHTML = '<div style="color: red;">Plain styled</div>';

      const result = window.TechStackDetector.detectCSSFramework();

      expect(result).toBeNull();
    });
  });

  describe('detectStateManagement', () => {
    it('should detect Redux', () => {
      window.__REDUX_DEVTOOLS_EXTENSION__ = {};

      const result = window.TechStackDetector.detectStateManagement();

      expect(result).toContain('Redux');
    });

    it('should detect MobX', () => {
      window.__MOBX_DEVTOOLS_GLOBAL_HOOK__ = {};

      const result = window.TechStackDetector.detectStateManagement();

      expect(result).toContain('MobX');
    });

    it('should detect Apollo', () => {
      window.__APOLLO_CLIENT__ = {};

      const result = window.TechStackDetector.detectStateManagement();

      expect(result).toContain('Apollo');
    });

    it('should detect multiple state managers', () => {
      window.__REDUX_DEVTOOLS_EXTENSION__ = {};
      window.__APOLLO_CLIENT__ = {};

      const result = window.TechStackDetector.detectStateManagement();

      expect(result).toContain('Redux');
      expect(result).toContain('Apollo');
      expect(result.length).toBe(2);
    });

    it('should return empty array when no state management detected', () => {
      const result = window.TechStackDetector.detectStateManagement();

      expect(result).toEqual([]);
    });
  });

  describe('detectBuildTool', () => {
    it('should detect Webpack via webpackChunk', () => {
      window.webpackChunk = [];

      const result = window.TechStackDetector.detectBuildTool();

      expect(result).toBe('Webpack');
    });

    it('should detect Webpack via webpackJsonp', () => {
      window.webpackJsonp = [];

      const result = window.TechStackDetector.detectBuildTool();

      expect(result).toBe('Webpack');
    });

    it('should detect Next.js build', () => {
      window.__NEXT_DATA__ = { props: {} };

      const result = window.TechStackDetector.detectBuildTool();

      expect(result).toBe('Next.js Build');
    });

    it('should detect Vite via script', () => {
      document.body.innerHTML = '<script src="/@vite/client"></script>';

      const result = window.TechStackDetector.detectBuildTool();

      expect(result).toBe('Vite');
    });

    it('should detect Parcel', () => {
      window.parcelRequire = {};

      const result = window.TechStackDetector.detectBuildTool();

      expect(result).toBe('Parcel');
    });

    it('should return null when no build tool detected', () => {
      const result = window.TechStackDetector.detectBuildTool();

      expect(result).toBeNull();
    });
  });

  describe('detectHosting', () => {
    it('should detect Vercel', () => {
      const originalLocation = window.location;
      delete window.location;
      window.location = { hostname: 'myapp.vercel.app' };

      const result = window.TechStackDetector.detectHosting();

      expect(result).toBe('Vercel');

      window.location = originalLocation;
    });

    it('should detect Netlify', () => {
      const originalLocation = window.location;
      delete window.location;
      window.location = { hostname: 'myapp.netlify.app' };

      const result = window.TechStackDetector.detectHosting();

      expect(result).toBe('Netlify');

      window.location = originalLocation;
    });

    it('should detect GitHub Pages', () => {
      const originalLocation = window.location;
      delete window.location;
      window.location = { hostname: 'username.github.io' };

      const result = window.TechStackDetector.detectHosting();

      expect(result).toBe('GitHub Pages');

      window.location = originalLocation;
    });

    it('should detect Cloudflare Pages', () => {
      const originalLocation = window.location;
      delete window.location;
      window.location = { hostname: 'mysite.pages.dev' };

      const result = window.TechStackDetector.detectHosting();

      expect(result).toBe('Cloudflare Pages');

      window.location = originalLocation;
    });
  });

  describe('detectCDN', () => {
    it('should detect Cloudflare CDN', () => {
      global.performance.getEntriesByType = vi.fn(() => [
        { name: 'https://cdn.cloudflare.com/script.js' }
      ]);

      const result = window.TechStackDetector.detectCDN();

      expect(result).toBe('Cloudflare');
    });

    it('should detect AWS CloudFront', () => {
      global.performance.getEntriesByType = vi.fn(() => [
        { name: 'https://d123.cloudfront.net/assets/main.js' }
      ]);

      const result = window.TechStackDetector.detectCDN();

      expect(result).toBe('AWS CloudFront');
    });

    it('should detect Fastly', () => {
      global.performance.getEntriesByType = vi.fn(() => [
        { name: 'https://assets.fastly.net/bundle.js' }
      ]);

      const result = window.TechStackDetector.detectCDN();

      expect(result).toBe('Fastly');
    });

    it('should return null when no CDN detected', () => {
      global.performance.getEntriesByType = vi.fn(() => [
        { name: 'https://example.com/script.js' }
      ]);

      const result = window.TechStackDetector.detectCDN();

      expect(result).toBeNull();
    });
  });

  describe('detectGlobalVariables', () => {
    it('should detect jQuery', () => {
      window.jQuery = {};

      const result = window.TechStackDetector.detectGlobalVariables();

      expect(result).toContain('jQuery');
    });

    it('should detect React global', () => {
      window.React = {};

      const result = window.TechStackDetector.detectGlobalVariables();

      expect(result).toContain('React (Global)');
    });

    it('should detect Vue global', () => {
      window.Vue = {};

      const result = window.TechStackDetector.detectGlobalVariables();

      expect(result).toContain('Vue (Global)');
    });

    it('should detect multiple globals', () => {
      window.jQuery = {};
      window.React = {};

      const result = window.TechStackDetector.detectGlobalVariables();

      expect(result).toContain('jQuery');
      expect(result).toContain('React (Global)');
    });

    it('should return empty array when no globals detected', () => {
      const result = window.TechStackDetector.detectGlobalVariables();

      expect(result).toEqual([]);
    });
  });

  describe('detect (full)', () => {
    it('should return complete tech stack object', () => {
      window.webpackChunk = [];
      window.jQuery = {};

      const result = window.TechStackDetector.detect();

      expect(result).toHaveProperty('cssFramework');
      expect(result).toHaveProperty('stateManagement');
      expect(result).toHaveProperty('buildTool');
      expect(result).toHaveProperty('hosting');
      expect(result).toHaveProperty('cdn');
      expect(result).toHaveProperty('globalVariables');

      expect(result.buildTool).toBe('Webpack');
      expect(result.globalVariables).toContain('jQuery');
    });

    it('should handle empty detection gracefully', () => {
      const result = window.TechStackDetector.detect();

      expect(result).toHaveProperty('cssFramework');
      expect(result).toHaveProperty('stateManagement');
      expect(Array.isArray(result.stateManagement)).toBe(true);
      expect(Array.isArray(result.globalVariables)).toBe(true);
    });
  });
});
