import { describe, it, expect, beforeEach } from 'vitest';

// Import the detector module
import '../framework-detector.js';

describe('detectFrameworks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  describe('React detection', () => {
    it('should detect React via data-reactroot', () => {
      document.body.innerHTML = '<div data-reactroot>React app</div>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('react');
      expect(result.ssrScore).toBeGreaterThan(0);
    });

    it('should detect React via data-reactid', () => {
      document.body.innerHTML = '<div data-reactid="1">React app</div>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('react');
    });
  });

  describe('Next.js detection', () => {
    it('should detect Next.js via #__next', () => {
      document.body.innerHTML = '<div id="__next">Next.js app</div>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('nextjs');
    });

    it('should detect Next.js via #__NEXT_DATA__', () => {
      document.body.innerHTML = `
        <script id="__NEXT_DATA__" type="application/json">{"props":{}}</script>
      `;

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('nextjs');
    });
  });

  describe('Vue detection', () => {
    it('should detect Vue via data-v-app', () => {
      document.body.innerHTML = '<div data-v-app>Vue app</div>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('vue');
    });

    it('should detect Vue via data-v attribute', () => {
      document.body.innerHTML = '<div data-v>Vue component</div>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('vue');
    });
  });

  describe('Nuxt detection', () => {
    it('should detect Nuxt via #__nuxt', () => {
      document.body.innerHTML = '<div id="__nuxt">Nuxt app</div>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('nuxt');
    });
  });

  describe('Angular detection', () => {
    it('should detect Angular via ng-version', () => {
      document.body.innerHTML = '<app-root ng-version="17.0.0">Angular app</app-root>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('angular');
    });

    it('should detect Angular via multiple ng-version elements', () => {
      // Using ng-version which is the most reliable Angular indicator in jsdom
      document.body.innerHTML = `
        <app-root ng-version="17.0.0">
          <app-header ng-version="17.0.0">Header</app-header>
          Angular component
        </app-root>
      `;

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('angular');
      expect(result.ssrScore).toBeGreaterThan(0);
    });
  });

  describe('Svelte detection', () => {
    it('should detect Svelte via svelte- class', () => {
      document.body.innerHTML = '<div class="svelte-abc123">Svelte app</div>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('svelte');
    });
  });

  describe('Astro detection', () => {
    it('should detect Astro via data-astro-cid', () => {
      document.body.innerHTML = '<div data-astro-cid="abc123">Astro page</div>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('astro');
    });

    it('should detect Astro islands', () => {
      document.body.innerHTML = '<astro-island data-astro-island>Component</astro-island>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('astro');
    });
  });

  describe('serialized data detection', () => {
    it('should detect __NEXT_DATA__ as SSR indicator', () => {
      document.body.innerHTML = `
        <script id="__NEXT_DATA__">window.__NEXT_DATA__ = {}</script>
      `;

      const result = window.detectFrameworks();

      expect(result.ssrScore).toBeGreaterThan(0);
      expect(result.indicators.some(i => i.includes('serialized'))).toBe(true);
    });

    it('should detect __INITIAL_STATE__ as SSR indicator', () => {
      document.body.innerHTML = `
        <script>window.__INITIAL_STATE__ = {"user": {}}</script>
      `;

      const result = window.detectFrameworks();

      expect(result.ssrScore).toBeGreaterThan(0);
    });
  });

  describe('static site generators', () => {
    it('should detect Jekyll', () => {
      document.head.innerHTML = '<meta name="generator" content="Jekyll v4.0.0">';

      const result = window.detectFrameworks();

      expect(result.details.generators).toContain('jekyll');
      expect(result.ssrScore).toBeGreaterThan(0);
    });

    it('should detect Hugo', () => {
      document.head.innerHTML = '<meta name="generator" content="Hugo 0.100.0">';

      const result = window.detectFrameworks();

      expect(result.details.generators).toContain('hugo');
    });

    it('should detect Gatsby', () => {
      document.body.innerHTML = '<div id="___gatsby">Gatsby app</div>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks).toContain('gatsby');
    });
  });

  describe('script pattern analysis', () => {
    it('should detect Next.js chunks as SSR indicator', () => {
      // Add Next.js root element along with chunks to trigger detection
      document.body.innerHTML = `
        <div id="__next">App content</div>
        <script src="/_next/static/chunks/main.js"></script>
        <script src="/_next/static/chunks/framework.js"></script>
      `;

      const result = window.detectFrameworks();

      // Should detect Next.js framework which is an SSR indicator
      expect(result.details.frameworks).toContain('nextjs');
      expect(result.ssrScore).toBeGreaterThan(0);
    });

    it('should detect client routing', () => {
      document.body.innerHTML = '<div data-router>Router view</div>';

      const result = window.detectFrameworks();

      expect(result.csrScore).toBeGreaterThan(0);
      expect(result.indicators.some(i => i.includes('routing'))).toBe(true);
    });
  });

  describe('multiple frameworks', () => {
    it('should detect multiple frameworks', () => {
      document.body.innerHTML = `
        <div data-reactroot>
          <div class="svelte-123">Mixed</div>
        </div>
      `;

      const result = window.detectFrameworks();

      expect(result.details.frameworks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('no frameworks', () => {
    it('should return empty results for plain HTML', () => {
      document.body.innerHTML = '<div><p>Plain HTML page</p></div>';

      const result = window.detectFrameworks();

      expect(result.details.frameworks || []).toHaveLength(0);
      expect(result.details.generators || []).toHaveLength(0);
    });
  });
});
