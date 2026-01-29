import { describe, it, expect, beforeEach } from 'vitest';

// Import the detector module
import '../content-detector.js';

describe('analyzeContent', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('rich content detection', () => {
    it('should detect rich initial content as SSR indicator', () => {
      document.body.innerHTML = `
        <header>
          <h1>Welcome to Our Site</h1>
          <nav><a href="/">Home</a><a href="/about">About</a></nav>
        </header>
        <main>
          <article>
            <h2>Article Title</h2>
            <section>
              <p>This is a paragraph with substantial content that indicates
                 server-side rendering was used to generate the initial HTML.
                 The content is meaningful and visible immediately.</p>
              <p>Another paragraph with more content to ensure we have enough
                 text to trigger the rich content detection logic.</p>
            </section>
            <section>
              <h3>Subsection</h3>
              <p>Even more meaningful content here that demonstrates this page
                 was pre-rendered on the server.</p>
            </section>
          </article>
        </main>
        <footer>Footer content</footer>
      `;

      const result = window.analyzeContent();

      expect(result.ssrScore).toBeGreaterThan(0);
      expect(result.indicators.some(i => i.includes('rich') || i.includes('SSR'))).toBe(true);
    });

    it('should include content details', () => {
      document.body.innerHTML = `
        <div>
          <p>Some content</p>
          <p>More content</p>
        </div>
        <script>console.log("hi")</script>
      `;

      const result = window.analyzeContent();

      expect(result.details).toHaveProperty('contentLength');
      expect(result.details).toHaveProperty('childrenCount');
      expect(result.details).toHaveProperty('scriptRatio');
      expect(typeof result.details.contentLength).toBe('number');
    });
  });

  describe('minimal content detection', () => {
    it('should detect minimal content as CSR indicator', () => {
      document.body.innerHTML = '<div id="root"></div>';

      const result = window.analyzeContent();

      expect(result.csrScore).toBeGreaterThan(0);
      expect(result.indicators.some(i =>
        i.includes('minimal') || i.includes('CSR')
      )).toBe(true);
    });

    it('should detect app shell pattern', () => {
      document.body.innerHTML = `
        <div id="app">
          <div class="loading">Loading...</div>
        </div>
      `;

      const result = window.analyzeContent();

      // Should show CSR signals for loading state with minimal content
      expect(result.details.contentLength).toBeLessThan(100);
    });
  });

  describe('loading states detection', () => {
    it('should detect loading text as CSR indicator', () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="loading">Loading...</div>
        </div>
      `;

      const result = window.analyzeContent();

      expect(result.csrScore).toBeGreaterThan(0);
    });

    it('should detect spinner class as loading indicator', () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="spinner"></div>
        </div>
      `;

      const result = window.analyzeContent();

      expect(result.csrScore).toBeGreaterThan(0);
    });

    it('should detect skeleton screens', () => {
      document.body.innerHTML = `
        <div id="root">
          <div class="skeleton">
            <div class="skeleton-item"></div>
          </div>
        </div>
      `;

      const result = window.analyzeContent();

      expect(result.csrScore).toBeGreaterThan(0);
    });
  });

  describe('script ratio analysis', () => {
    it('should detect high script ratio as CSR indicator', () => {
      // Create many script elements relative to content
      document.body.innerHTML = `
        <div>A</div>
        <script>1</script>
        <script>2</script>
        <script>3</script>
        <script>4</script>
        <script>5</script>
      `;

      const result = window.analyzeContent();

      expect(result.details.scriptRatio).toBeGreaterThan(0.15);
    });

    it('should detect low script ratio as SSR indicator', () => {
      document.body.innerHTML = `
        <article>
          <h1>Title</h1>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
          <p>Paragraph 3</p>
          <div>More content</div>
          <section>Section</section>
          <aside>Sidebar</aside>
          <footer>Footer</footer>
          <nav>Navigation</nav>
          <header>Header</header>
        </article>
        <script>single</script>
      `;

      const result = window.analyzeContent();

      expect(result.details.scriptRatio).toBeLessThan(0.15);
    });
  });

  describe('semantic elements', () => {
    it('should count semantic elements', () => {
      document.body.innerHTML = `
        <article>
          <h1>Main Title</h1>
          <h2>Subtitle</h2>
          <p>First paragraph</p>
          <section>
            <h3>Section Title</h3>
            <p>Section content</p>
          </section>
        </article>
      `;

      const result = window.analyzeContent();

      // Rich semantic structure should boost SSR score
      expect(result.ssrScore).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty body', () => {
      document.body.innerHTML = '';

      const result = window.analyzeContent();

      expect(result).toHaveProperty('ssrScore');
      expect(result).toHaveProperty('csrScore');
      expect(result).toHaveProperty('indicators');
      expect(result).toHaveProperty('details');
    });

    it('should handle whitespace-only content', () => {
      document.body.innerHTML = '   \n\t   ';

      const result = window.analyzeContent();

      expect(result.details.contentLength).toBe(0);
    });

    it('should return all expected properties', () => {
      document.body.innerHTML = '<div>Test</div>';

      const result = window.analyzeContent();

      expect(result).toHaveProperty('ssrScore');
      expect(result).toHaveProperty('csrScore');
      expect(result).toHaveProperty('indicators');
      expect(result).toHaveProperty('details');
      expect(Array.isArray(result.indicators)).toBe(true);
    });
  });
});
