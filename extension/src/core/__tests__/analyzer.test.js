import { describe, it, expect, beforeEach, vi } from 'vitest';

// Real scoring + analyzer; detector modules are stubbed per test
import '../scoring.js';
import '../../detectors/comparison-detector.js';
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
  window.detectPlatformSignals = vi.fn(() => overrides.platform || emptyResult);
  window.compareInitialVsRendered = vi.fn(async () =>
    'comparison' in overrides ? overrides.comparison : null
  );
}

describe('parser-snapshot comparison', () => {
  beforeEach(() => {
    document.body.innerHTML = `<p>${'test page '.repeat(30)}</p>`;
  });

  it('explains when a successful re-fetch was a different page', async () => {
    stubDetectors({
      comparison: {
        rawLength: 500, renderedLength: 500, contentRatio: 1,
        isLikelyCSR: false, isLikelySSR: true, isDecisiveCSR: false,
        source: 'parser-snapshot', refetchMismatch: true,
        refetchMismatchReason: 'title',
        responseHeaders: null, rawDocument: null, rawHTML: null
      }
    });

    const result = await window.pageAnalyzer();
    const snapshotSignal = result.signals.find((s) => s.id === 'comparison.parserSnapshot');

    expect(snapshotSignal.detail).toBe(
      'The second copy of the HTML was a different page (its title did not match), so the comparison uses the text present when the browser finished parsing it, before deferred scripts ran.'
    );
  });

  it('explains when a successful re-fetch shared no words with the page', async () => {
    stubDetectors({
      comparison: {
        rawLength: 500, renderedLength: 500, contentRatio: 1,
        isLikelyCSR: false, isLikelySSR: true, isDecisiveCSR: false,
        source: 'parser-snapshot', refetchMismatch: true,
        refetchMismatchReason: 'no-shared-words',
        responseHeaders: null, rawDocument: null, rawHTML: null
      }
    });

    const result = await window.pageAnalyzer();
    const snapshotSignal = result.signals.find((s) => s.id === 'comparison.parserSnapshot');

    expect(snapshotSignal.detail).toBe(
      'The second copy of the HTML shared no words with the page on screen, so it was treated as a different document and the comparison uses the text present when the browser finished parsing it, before deferred scripts ran.'
    );
  });

  it('scores it like a fetched comparison and says where it came from', async () => {
    stubDetectors({
      content: { ssrScore: 50, csrScore: 0, indicators: ['rich initial content structure (SSR)'], details: {} },
      comparison: {
        rawLength: 10, renderedLength: 5000, contentRatio: 0,
        isLikelyCSR: true, isLikelySSR: false, isDecisiveCSR: true,
        source: 'parser-snapshot', responseHeaders: null, rawDocument: null, rawHTML: null
      }
    });

    const result = await window.pageAnalyzer();

    expect(result.renderType).toBe('Client-Side Rendered (CSR)');
    expect(result.detailedInfo.contentComparison.source).toBe('parser-snapshot');
    expect(result.detailedInfo.contentComparison.measure).toBe('length');
    expect(result.detailedInfo.contentComparison.wordCoverage).toBeNull();
    expect(result.signals.some((s) => s.id === 'comparison.parserSnapshot')).toBe(true);
    expect(result.indicators.some((i) => i.includes('comparison unavailable'))).toBe(false);
  });
});

describe('fetch comparison signals', () => {
  it.each([
    [
      { isLikelyCSR: true, isPartialCSR: false, isLikelySSR: false, wordCoverage: 0.05, matchedWordCount: 5 },
      'comparison.mismatch',
      '5 of 100 visible words (5%) arrived in the HTML.',
      'raw HTML much smaller than rendered (word coverage 0.05) - CSR',
    ],
    [
      { isLikelyCSR: false, isPartialCSR: true, isLikelySSR: false, wordCoverage: 0.3, matchedWordCount: 30 },
      'comparison.partial',
      '30 of 100 visible words (30%) were in the initial response; JavaScript added the rest.',
      'raw HTML holds under 40% of rendered content (word coverage 0.3) - partial CSR',
    ],
    [
      { isLikelyCSR: false, isPartialCSR: false, isLikelySSR: true, wordCoverage: 1, matchedWordCount: 100 },
      'comparison.match',
      '100 of 100 visible words were in the initial response.',
      'raw HTML matches rendered content (word coverage 1) - SSR',
    ],
  ])('uses word counts for %s', async (flags, signalId, detail, indicator) => {
    stubDetectors({
      comparison: {
        rawLength: 300,
        renderedLength: 1000,
        contentRatio: 0.3,
        rawWordCount: 30,
        renderedWordCount: 100,
        matchedWordCount: flags.matchedWordCount,
        measure: 'words',
        ...flags,
      },
    });

    const result = await window.pageAnalyzer();
    const signal = result.signals.find((item) => item.id === signalId);

    expect(signal.detail).toBe(detail);
    expect(result.indicators).toContain(indicator);
    expect(result.detailedInfo.contentComparison).toMatchObject({
      wordCoverage: flags.wordCoverage,
      rawWords: 30,
      renderedWords: 100,
      matchedWords: flags.matchedWordCount,
      measure: 'words',
    });
  });
});

describe('pageAnalyzer', () => {
  beforeEach(() => {
    document.body.innerHTML = `<p>${'test page '.repeat(30)}</p>`;
    document.title = 'Example page';
  });

  describe('quality gate', () => {
    it('rejects a short page with a bot-challenge title', async () => {
      document.title = 'Just a moment...';
      document.body.textContent = 'Please wait while we verify your browser.';
      stubDetectors();

      const result = await window.pageAnalyzer();

      expect(result).toMatchObject({
        renderType: 'Cannot assess',
        confidence: 0,
        assessable: false,
        unassessableReason: 'bot-challenge',
      });
      expect(result.signals[0].id).toBe('gate.botChallenge');
    });

    it('rejects 120 visible characters as too little text', async () => {
      document.body.textContent = 'x'.repeat(120);
      stubDetectors();

      const result = await window.pageAnalyzer();

      expect(result.assessable).toBe(false);
      expect(result.unassessableReason).toBe('too-little-text');
      expect(result.signals[0].id).toBe('gate.tooLittleText');
    });

    it('does not mistake a long page containing "captcha" for a challenge', async () => {
      document.body.textContent = `captcha ${'A detailed article about rendering. '.repeat(150)}`;
      stubDetectors();

      const result = await window.pageAnalyzer();

      expect(result.renderType).not.toBe('Cannot assess');
      expect(result.assessable).toBe(true);
      expect(result).not.toHaveProperty('unassessableReason');
    });

    it('marks a normal page assessable', async () => {
      stubDetectors();

      const result = await window.pageAnalyzer();

      expect(result.assessable).toBe(true);
      expect(result).not.toHaveProperty('unassessableReason');
    });
  });

  describe('decisive CSR override', () => {
    it('should cap rendered-DOM SSR signals when raw HTML is nearly empty', async () => {
      // Polished CSR app: soft SSR signals stack to 80 points post-JS, but the
      // server sent <20% of the visible text
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

    it('caps SSR signals at the partial-band limit without the decisive override', async () => {
      stubDetectors({
        content: { ssrScore: 80, csrScore: 0, indicators: [], details: {} },
        comparison: {
          rawLength: 1000, renderedLength: 4000, contentRatio: 0.25,
          wordCoverage: 0.25, rawWordCount: 25, renderedWordCount: 100,
          matchedWordCount: 25, measure: 'words',
          isLikelyCSR: false, isPartialCSR: true, isLikelySSR: false,
          isDecisiveCSR: false,
          rawDocument: document.implementation.createHTMLDocument()
        }
      });

      const result = await window.pageAnalyzer();
      const cap = result.signals.find((signal) => signal.id === 'comparison.partialCap');

      expect(result.detailedInfo.ssrScore).toBe(window.DETECTOR_CONFIG.scoring.partialCsrSsrCap);
      expect(cap.weight).toBe(-30);
      expect(result.signals.some((signal) => signal.id === 'comparison.decisiveCsr')).toBe(false);
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

  it('should pass the raw document to detectFrameworks and the source to platform signals', async () => {
    const rawDocument = document.implementation.createHTMLDocument();
    stubDetectors({
      comparison: {
        rawLength: 500, renderedLength: 600, contentRatio: 0.83,
        wordCoverage: 0.83, rawWordCount: 50, renderedWordCount: 60,
        matchedWordCount: 50, measure: 'words',
        isLikelyCSR: false, isLikelySSR: true, isDecisiveCSR: false,
        rawDocument, rawHTML: '<html><body>raw</body></html>'
      }
    });

    await window.pageAnalyzer();

    expect(window.detectFrameworks).toHaveBeenCalledWith(rawDocument);
    expect(window.detectPlatformSignals).toHaveBeenCalledWith(rawDocument, '<html><body>raw</body></html>');
  });

  it('should keep the raw document and source out of the returned result', async () => {
    stubDetectors({
      comparison: {
        rawLength: 500, renderedLength: 600, contentRatio: 0.83,
        wordCoverage: 0.83, rawWordCount: 50, renderedWordCount: 60,
        matchedWordCount: 50, measure: 'words',
        isLikelyCSR: false, isLikelySSR: true, isDecisiveCSR: false,
        rawDocument: document.implementation.createHTMLDocument(),
        rawHTML: '<html><body>raw</body></html>'
      }
    });

    const result = await window.pageAnalyzer();

    // Result must stay JSON-serializable (it crosses executeScript boundaries)
    expect(result.detailedInfo.contentComparison).toEqual({
      rawLength: 500,
      renderedLength: 600,
      ratio: 0.83,
      source: 'fetch',
      wordCoverage: 0.83,
      rawWords: 50,
      renderedWords: 60,
      matchedWords: 50,
      measure: 'words',
    });
    expect(JSON.stringify(result)).not.toContain('<html>');
    expect(JSON.parse(JSON.stringify(result))).toBeTruthy();
  });
});
