import { describe, it, expect, beforeEach, vi } from 'vitest';

// Real scoring + analyzer; detector modules are stubbed per test
import '../scoring.js';
import '../analyzer.js';

const emptyResult = { ssrScore: 0, csrScore: 0, indicators: [], details: {} };

function stubDetectors(overrides = {}) {
  window.analyzeContent = vi.fn(() => overrides.content || emptyResult);
  window.detectFrameworks = vi.fn(() => overrides.frameworks || emptyResult);
  window.analyzeMeta = vi.fn(() => overrides.meta || emptyResult);
  window.analyzePerformance = vi.fn(() => overrides.performance || emptyResult);
  window.detectCSRPatterns = vi.fn(() => overrides.csrPatterns || emptyResult);
  window.detectHybridPatterns = vi.fn(
    () => overrides.hybrid || { hybridScore: 0, indicators: [], details: {} }
  );
  window.compareInitialVsRendered = vi.fn(async () =>
    'comparison' in overrides ? overrides.comparison : null
  );
}

describe('pageAnalyzer', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p>test page</p>';
  });

  describe('decisive CSR override', () => {
    it('should cap rendered-DOM SSR signals when raw HTML is nearly empty', async () => {
      // Polished CSR app: soft SSR signals stack to 80 points post-JS, but the
      // server sent <10% of the visible text
      stubDetectors({
        content: { ssrScore: 50, csrScore: 0, indicators: ['rich initial content structure (SSR)'], details: {} },
        meta: { ssrScore: 30, csrScore: 0, indicators: ['rich meta tags (SSR)'], details: {} },
        comparison: {
          rawLength: 10, renderedLength: 5000, contentRatio: 0,
          isLikelyCSR: true, isLikelySSR: false, isDecisiveCSR: true,
          rawDocument: document.implementation.createHTMLDocument()
        }
      });

      const result = await window.pageAnalyzer();

      expect(result.detailedInfo.ssrScore).toBe(window.DETECTOR_CONFIG.scoring.decisiveCsrSsrCap);
      expect(result.renderType).toBe('Client-Side Rendered (CSR)');
      expect(result.indicators.some(i => i.includes('SSR signals capped'))).toBe(true);
    });

    it('should not cap SSR signals on a normal likely-CSR result', async () => {
      stubDetectors({
        content: { ssrScore: 50, csrScore: 0, indicators: [], details: {} },
        comparison: {
          rawLength: 500, renderedLength: 4000, contentRatio: 0.13,
          isLikelyCSR: true, isLikelySSR: false, isDecisiveCSR: false,
          rawDocument: document.implementation.createHTMLDocument()
        }
      });

      const result = await window.pageAnalyzer();

      expect(result.detailedInfo.ssrScore).toBe(50);
    });
  });

  describe('comparison unavailable', () => {
    it('should cap confidence and avoid definitive verdicts when the fetch fails', async () => {
      stubDetectors({
        content: { ssrScore: 60, csrScore: 0, indicators: ['a', 'b', 'c'], details: {} },
        meta: { ssrScore: 40, csrScore: 0, indicators: ['d', 'e'], details: {} },
        comparison: null
      });

      const result = await window.pageAnalyzer();

      expect(result.renderType).toBe('Likely SSR with Hydration');
      expect(result.confidence).toBeLessThanOrEqual(
        window.DETECTOR_CONFIG.confidence.maxConfidenceNoComparison
      );
      expect(result.indicators.some(i => i.includes('comparison unavailable'))).toBe(true);
    });

    it('should pass null raw document to detectFrameworks when the fetch fails', async () => {
      stubDetectors({ comparison: null });

      await window.pageAnalyzer();

      expect(window.detectFrameworks).toHaveBeenCalledWith(null);
    });
  });

  it('should pass the parsed raw document to detectFrameworks', async () => {
    const rawDocument = document.implementation.createHTMLDocument();
    stubDetectors({
      comparison: {
        rawLength: 500, renderedLength: 600, contentRatio: 0.83,
        isLikelyCSR: false, isLikelySSR: true, isDecisiveCSR: false,
        rawDocument
      }
    });

    await window.pageAnalyzer();

    expect(window.detectFrameworks).toHaveBeenCalledWith(rawDocument);
  });

  it('should keep the raw document out of the returned result', async () => {
    stubDetectors({
      comparison: {
        rawLength: 500, renderedLength: 600, contentRatio: 0.83,
        isLikelyCSR: false, isLikelySSR: true, isDecisiveCSR: false,
        rawDocument: document.implementation.createHTMLDocument()
      }
    });

    const result = await window.pageAnalyzer();

    // Result must stay JSON-serializable (it crosses executeScript boundaries)
    expect(result.detailedInfo.contentComparison).toEqual({
      rawLength: 500,
      renderedLength: 600,
      ratio: 0.83
    });
    expect(JSON.parse(JSON.stringify(result))).toBeTruthy();
  });
});
