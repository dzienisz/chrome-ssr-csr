import { describe, it, expect, beforeEach } from 'vitest';

// Import the detector module
import '../framework-detector.js';

// Build a raw (pre-JS) document the way comparison-detector does
function parseRaw(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('detectFrameworks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  describe('React detection', () => {
    it('should detect React via data-reactroot', () => {
      document.body.innerHTML = '<div data-reactroot>React app</div>';

      const result = window.detectFrameworks(parseRaw('<div data-reactroot>React app</div>'));

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

    it('should detect the App Router through the streamed RSC payload', () => {
      // No #__next and no __NEXT_DATA__: that is what App Router pages emit
      const html = '<script>self.__next_f.push([1,"chunk"])</script><main>Docs</main>';
      document.body.innerHTML = html;

      const result = window.detectFrameworks(parseRaw(html));

      expect(result.details.frameworks).toContain('nextjs');
      expect(result.ssrScore).toBeGreaterThan(0);
      expect(result.indicators.some(i => i.includes('raw HTML'))).toBe(true);
    });

    it('should not credit an App Router marker that only exists after boot', () => {
      const rendered = '<script>self.__next_f.push([1,"chunk"])</script><main>App</main>';
      document.body.innerHTML = rendered;

      const result = window.detectFrameworks(parseRaw('<div id="app"></div>'));

      expect(result.details.frameworks).toContain('nextjs');
      expect(result.ssrScore).toBe(0);
    });
  });

  describe('React Router / Remix detection', () => {
    it('should detect Remix v2 via data-remix-managed-head', () => {
      const html = '<div data-remix-managed-head>Remix</div>';
      document.body.innerHTML = html;

      const result = window.detectFrameworks(parseRaw(html));

      expect(result.details.frameworks).toContain('remix');
    });

    it('should detect React Router 7 via __reactRouterContext', () => {
      const html = '<script>window.__reactRouterContext = {};</script><main>Page</main>';
      document.body.innerHTML = html;

      const result = window.detectFrameworks(parseRaw(html));

      expect(result.details.frameworks).toContain('remix');
    });
  });

  describe('Angular hydration detection', () => {
    it('should detect Angular SSR via the ngh annotation', () => {
      const html = '<app-root ngh="0">Server rendered</app-root>';
      document.body.innerHTML = html;

      const result = window.detectFrameworks(parseRaw(html));

      expect(result.details.frameworks).toContain('angular');
      expect(result.ssrScore).toBeGreaterThan(0);
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
      const html = `
        <app-root ng-version="17.0.0">
          <app-header ng-version="17.0.0">Header</app-header>
          Angular component
        </app-root>
      `;
      document.body.innerHTML = html;

      const result = window.detectFrameworks(parseRaw(html));

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
      const html = `
        <div id="__next">App content</div>
        <script src="/_next/static/chunks/main.js"></script>
        <script src="/_next/static/chunks/framework.js"></script>
      `;
      document.body.innerHTML = html;

      const result = window.detectFrameworks(parseRaw(html));

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

  describe('raw HTML requirement for hydration credit', () => {
    it('should give SSR credit when markers exist in the raw HTML', () => {
      document.body.innerHTML = '<div data-reactroot>Hydrated app</div>';
      const rawDoc = parseRaw('<div data-reactroot>Server-rendered app</div>');

      const result = window.detectFrameworks(rawDoc);

      expect(result.ssrScore).toBeGreaterThan(0);
      expect(result.indicators.some(i => i.includes('hydration markers in raw HTML'))).toBe(true);
    });

    it('should give no SSR credit when markers exist only in the rendered DOM', () => {
      // A booted CSR app: framework markers in the live DOM, empty raw shell
      document.body.innerHTML = '<div data-reactroot>Client-rendered app</div>';
      const rawDoc = parseRaw('<div id="root"></div>');

      const result = window.detectFrameworks(rawDoc);

      expect(result.details.frameworks).toContain('react');
      expect(result.ssrScore).toBe(0);
      expect(result.indicators.some(i => i.includes('only in rendered DOM'))).toBe(true);
    });

    it('should give no SSR credit when the raw document is unavailable', () => {
      document.body.innerHTML = '<div data-reactroot>App</div>';

      const result = window.detectFrameworks(null);

      expect(result.details.frameworks).toContain('react');
      expect(result.ssrScore).toBe(0);
    });

    it('should still list rendered-only frameworks for telemetry', () => {
      document.body.innerHTML = '<div class="svelte-1abc23">Svelte CSR app</div>';
      const rawDoc = parseRaw('<div id="app"></div>');

      const result = window.detectFrameworks(rawDoc);

      expect(result.details.frameworks).toContain('svelte');
      expect(result.ssrScore).toBe(0);
    });
  });
});

describe('v4 stack coverage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  describe('server-rendered stacks that enhance markup', () => {
    // Every one of these puts its markers in the HTML the server sends, so the
    // raw-evidence rule should credit them as SSR rather than as a client app.
    //
    // Selectors with a colon in the attribute name (Livewire's `wire:id`,
    // Qwik's `q:container`) are missing here on purpose: jsdom's selector
    // engine does not match them at all, in any escaping. They are covered by
    // the ssr-enhanced fixture in the real-browser harness instead
    // (scripts/fixtures/pages.mjs).
    const cases = [
      ['turbo', '<turbo-frame id="messages">Inbox</turbo-frame>'],
      ['phoenix', '<div data-phx-main>LiveView</div>'],
      ['htmx', '<button hx-get="/more">Load more</button>'],
      ['unpoly', '<a up-follow href="/next">Next</a>'],
      ['stimulus', '<div data-controller="dropdown" data-action="click->dropdown#toggle">Menu</div>'],
      ['marko', '<div data-marko-key="@0">Marko</div>'],
    ];

    it.each(cases)('detects %s from the served markup', (framework, markup) => {
      document.body.innerHTML = markup;

      const result = window.detectFrameworks(parseRaw(markup));

      expect(result.details.frameworks).toContain(framework);
      expect(result.indicators.join(' ')).toContain('hydration markers in raw HTML');
    });
  });

  describe('frameworks identified from script contents', () => {
    const cases = [
      ['sveltekit', '<script>__sveltekit_1a2b3c = { base: "" };</script>'],
      ['fresh', '<script id="__FRSH_STATE" type="application/json">{}</script>'],
      ['vike', '<script id="vike_pageContext" type="application/json">{}</script>'],
      ['tanstackStart', '<script>window.__TSR_SSR__ = {};</script>'],
    ];

    it.each(cases)('detects %s from an inline payload', (framework, markup) => {
      document.body.innerHTML = markup;

      const result = window.detectFrameworks(parseRaw(markup));

      expect(result.details.frameworks).toContain(framework);
    });
  });

  it('detects Blazor from the path its runtime loads from', () => {
    // Blazor leaves no element and no inline script — only a src, which is why
    // collectScriptSource reads src attributes as well as script text.
    const markup = '<script src="_framework/blazor.web.js"></script>';
    document.body.innerHTML = markup;

    const result = window.detectFrameworks(parseRaw(markup));

    expect(result.details.frameworks).toContain('blazor');
  });

  it('detects Angular SSR from ng-server-context', () => {
    const raw = parseRaw('<html ng-server-context="ssr"><body><app-root>Hi</app-root></body></html>');
    document.documentElement.setAttribute('ng-server-context', 'ssr');

    try {
      const result = window.detectFrameworks(raw);
      expect(result.details.frameworks).toContain('angular');
    } finally {
      document.documentElement.removeAttribute('ng-server-context');
    }
  });

  it('does not credit a framework that only appears after scripts run', () => {
    document.body.innerHTML = '<turbo-frame id="messages">Inbox</turbo-frame>';

    const result = window.detectFrameworks(parseRaw('<div id="app"></div>'));

    expect(result.details.frameworks).toContain('turbo');
    expect(result.ssrScore).toBe(0);
    expect(result.indicators.join(' ')).toContain('only in rendered DOM');
  });

  it('emits a structured signal alongside every indicator it scores', () => {
    const markup = '<turbo-frame id="messages">Inbox</turbo-frame>';
    document.body.innerHTML = markup;

    const result = window.detectFrameworks(parseRaw(markup));

    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals[0]).toMatchObject({ impact: 'ssr', weight: expect.any(Number) });
  });
});

describe('static site generators', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it.each([
    ['astro', 'Astro v4.10.2'],
    ['gatsby', 'Gatsby 5.13.0'],
    ['vitepress', 'VitePress v1.2.0'],
    ['zola', 'Zola v0.18.0'],
    ['quarto', 'Quarto-1.4.550'],
  ])('detects %s from its generator meta tag', (generator, content) => {
    document.head.innerHTML = `<meta name="generator" content="${content}">`;

    const result = window.detectFrameworks(parseRaw(''));

    expect(result.details.generators).toContain(generator);
  });
});
