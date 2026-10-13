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

describe('decision metadata', () => {
  beforeEach(() => {
    document.title = 'Example page';
    document.body.innerHTML = `<p>${'visible text '.repeat(40)}</p>`;
  });

  function fetchComparison(overrides = {}) {
    return {
      source: 'fetch',
      measure: 'words',
      rawLength: 1000,
      renderedLength: 1000,
      contentRatio: 1,
      wordCoverage: 0.5,
      rawWordCount: 100,
      renderedWordCount: 100,
      matchedWordCount: 50,
      isLikelyCSR: false,
      isPartialCSR: false,
      isLikelySSR: false,
      isDecisiveCSR: false,
      ...overrides,
    };
  }

  it('records the fetch CSR rule, decisive cap, measurement, and score', async () => {
    stubDetectors({
      content: {
        ssrScore: 80,
        csrScore: 0,
        indicators: ['rich initial content'],
        details: {},
      },
      comparison: fetchComparison({
        rawLength: 800,
        renderedLength: 1600,
        wordCoverage: 0.11,
        matchedWordCount: 22,
        renderedWordCount: 193,
        isLikelyCSR: true,
        isDecisiveCSR: true,
      }),
    });

    const result = await window.pageAnalyzer();

    expect(result.algorithmVersion).toBe(2);
    expect(result.decision).toMatchObject({
      algorithmVersion: 2,
      gate: { passed: true, reason: null, visibleChars: 1600 },
      measurement: {
        source: 'fetch',
        measure: 'words',
        value: 0.11,
        matched: 22,
        total: 193,
        snapshotReason: null,
        band: 'csr',
        bandLimits: { csr: 0.2, partial: 0.4, ssr: 0.7 },
        points: { side: 'csr', value: 40 },
      },
      cap: { kind: 'decisive', from: 80, to: 10 },
      score: { ssr: 10, csr: 40, ssrPercentage: 20, hybridScore: 0 },
      rule: 'csr',
      threshold: 25,
      downgraded: false,
      confidenceCap: null,
    });
  });

  it('records partial-band points and the partial SSR cap', async () => {
    stubDetectors({
      content: {
        ssrScore: 80,
        csrScore: 0,
        indicators: ['rich initial content'],
        details: {},
      },
      comparison: fetchComparison({
        wordCoverage: 0.3,
        matchedWordCount: 30,
        isPartialCSR: true,
      }),
    });

    const result = await window.pageAnalyzer();

    expect(result.decision).toMatchObject({
      measurement: {
        band: 'partial',
        points: { side: 'csr', value: 40 },
      },
      cap: { kind: 'partial', from: 80, to: 50 },
      score: { ssr: 50, csr: 40, ssrPercentage: 56, hybridScore: 0 },
      rule: 'balancedHybrid',
      threshold: { min: 41, max: 59 },
    });
  });

  it.each([
    [
      'neutral',
      fetchComparison({ wordCoverage: 0.55 }),
      { band: 'neutral', points: null },
    ],
    [
      'SSR',
      fetchComparison({
        wordCoverage: 0.8,
        matchedWordCount: 80,
        isLikelySSR: true,
      }),
      { band: 'ssr', points: { side: 'ssr', value: 30 } },
    ],
    [
      'short',
      fetchComparison({
        rawLength: 100,
        renderedLength: 200,
        contentRatio: 0.5,
        wordCoverage: 0.5,
      }),
      { band: 'short', points: null },
    ],
  ])('records the %s comparison band', async (_name, comparison, expected) => {
    stubDetectors({ comparison });

    const result = await window.pageAnalyzer();

    expect(result.decision.measurement).toMatchObject(expected);
  });

  it.each(['title', 'no-shared-words', 'refused'])(
    'records the parser-snapshot reason %s',
    async (snapshotReason) => {
      stubDetectors({
        comparison: {
          source: 'parser-snapshot',
          measure: 'length',
          rawLength: 1200,
          renderedLength: 5400,
          contentRatio: 0.22,
          wordCoverage: null,
          isLikelyCSR: false,
          isPartialCSR: true,
          isLikelySSR: false,
          isDecisiveCSR: false,
          refetchMismatch: snapshotReason !== 'refused',
          refetchMismatchReason:
            snapshotReason === 'refused' ? null : snapshotReason,
        },
      });

      const result = await window.pageAnalyzer();

      expect(result.decision.measurement).toMatchObject({
        source: 'parser-snapshot',
        measure: 'length',
        value: 0.22,
        matched: 1200,
        total: 5400,
        snapshotReason,
      });
    },
  );

  it('records the Likely downgrade and confidence cap when comparison is unavailable', async () => {
    stubDetectors({
      content: {
        ssrScore: 80,
        csrScore: 0,
        indicators: ['rich content'],
        details: {},
      },
      comparison: null,
    });

    const result = await window.pageAnalyzer();

    expect(result.renderType).toBe('Likely SSR with Hydration');
    expect(result.decision).toMatchObject({
      measurement: null,
      rule: 'ssr',
      threshold: 75,
      downgraded: true,
      confidenceCap: 60,
    });
  });

  it('records a failed quality gate for Cannot assess', async () => {
    document.body.textContent = 'x'.repeat(120);
    stubDetectors({ comparison: null });

    const result = await window.pageAnalyzer();

    expect(result.renderType).toBe('Cannot assess');
    expect(result.decision.gate).toEqual({
      passed: false,
      reason: 'too-little-text',
      visibleChars: 120,
    });
  });

  it('returns a null decision for analysis errors', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    stubDetectors();
    window.compareInitialVsRendered = vi.fn(() => {
      throw new Error('comparison failed');
    });

    const result = await window.pageAnalyzer();

    expect(result.algorithmVersion).toBe(2);
    expect(result.decision).toBeNull();
    expect(result.confidenceLevel).toBeNull();
    expect(result.confidenceLevelReason).toBeNull();
    errorLog.mockRestore();
  });
});

describe('confidence level', () => {
  beforeEach(() => {
    document.title = 'Example page';
    document.body.innerHTML = `<p>${'visible text '.repeat(80)}</p>`;
  });

  function fetchBand(wordCoverage, overrides = {}) {
    return {
      source: 'fetch',
      measure: 'words',
      rawLength: 1000,
      renderedLength: 5000,
      contentRatio: 0.2,
      wordCoverage,
      rawWordCount: Math.round(wordCoverage * 250),
      renderedWordCount: 250,
      matchedWordCount: Math.round(wordCoverage * 250),
      isLikelyCSR: false,
      isPartialCSR: false,
      isLikelySSR: false,
      isDecisiveCSR: false,
      ...overrides,
    };
  }

  it('returns null for Cannot assess', async () => {
    document.body.textContent = 'x'.repeat(120);
    stubDetectors({ comparison: null });

    const result = await window.pageAnalyzer();

    expect(result.confidenceLevel).toBeNull();
    expect(result.confidenceLevelReason).toBeNull();
    expect(result.decision.confidenceLevel).toBeNull();
    expect(result.decision.confidenceLevelReason).toBeNull();
  });

  it('uses low / no-measurement when the HTML cannot be compared', async () => {
    stubDetectors({ comparison: null });

    const result = await window.pageAnalyzer();

    expect(result).toMatchObject({
      confidenceLevel: 'low',
      confidenceLevelReason: 'no-measurement',
      decision: {
        confidenceLevel: 'low',
        confidenceLevelReason: 'no-measurement',
        confidenceScore: result.confidence,
        confidenceLevels: { minWords: 50, clearCsr: 0.1, clearSsr: 0.8 },
      },
    });
  });

  it('uses low / verdict-contradicts-measurement for a strong-hybrid verdict against CSR coverage', async () => {
    stubDetectors({
      hybrid: { hybridScore: 35, indicators: ['islands'], details: {} },
      comparison: fetchBand(0.15, {
        isLikelyCSR: true,
        isDecisiveCSR: true,
      }),
    });

    const result = await window.pageAnalyzer();

    expect(result.renderType).toMatch(/Hybrid/);
    expect(result.decision.measurement.band).toBe('csr');
    expect(result.confidenceLevel).toBe('low');
    expect(result.confidenceLevelReason).toBe('verdict-contradicts-measurement');
  });

  it('uses low / inconclusive-band for neutral measurements', async () => {
    stubDetectors({ comparison: fetchBand(0.55) });

    const result = await window.pageAnalyzer();

    expect(result.decision.measurement.band).toBe('neutral');
    expect(result.confidenceLevel).toBe('low');
    expect(result.confidenceLevelReason).toBe('inconclusive-band');
  });

  it('uses low / few-words for the short band', async () => {
    stubDetectors({
      comparison: fetchBand(0.5, {
        renderedLength: 200,
        renderedWordCount: 50,
        matchedWordCount: 25,
      }),
    });

    const result = await window.pageAnalyzer();

    expect(result.decision.gate.passed).toBe(true);
    expect(result.decision.measurement.band).toBe('short');
    expect(result.confidenceLevel).toBe('low');
    expect(result.confidenceLevelReason).toBe('few-words');
  });

  it('uses medium / length-only for an agreeing parser snapshot', async () => {
    stubDetectors({
      comparison: {
        source: 'parser-snapshot',
        measure: 'length',
        rawLength: 4500,
        renderedLength: 5000,
        contentRatio: 0.9,
        isLikelyCSR: false,
        isPartialCSR: false,
        isLikelySSR: true,
        isDecisiveCSR: false,
      },
    });

    const result = await window.pageAnalyzer();

    expect(result.decision.measurement.band).toBe('ssr');
    expect(result.confidenceLevel).toBe('medium');
    expect(result.confidenceLevelReason).toBe('length-only');
  });

  it.each([
    [49, 'low', 'few-words'],
    [50, 'medium', 'near-threshold'],
  ])('applies the %i-word fetch floor before near-threshold confidence', async (words, level, reason) => {
    stubDetectors({
      comparison: fetchBand(0.15, {
        isLikelyCSR: true,
        isDecisiveCSR: true,
        renderedWordCount: words,
        matchedWordCount: Math.round(words * 0.15),
      }),
    });

    const result = await window.pageAnalyzer();

    expect(result.confidenceLevel).toBe(level);
    expect(result.confidenceLevelReason).toBe(reason);
  });

  it('classifies the 193-word skeleton measurement as medium / near-threshold', async () => {
    stubDetectors({
      comparison: fetchBand(0.11, {
        isLikelyCSR: true,
        isDecisiveCSR: true,
        renderedWordCount: 193,
        matchedWordCount: 22,
      }),
    });

    const result = await window.pageAnalyzer();

    expect(result.decision.measurement).toMatchObject({
      value: 0.11,
      total: 193,
      band: 'csr',
    });
    expect(result.confidenceLevel).toBe('medium');
    expect(result.confidenceLevelReason).toBe('near-threshold');
  });

  it('uses medium / partial-band for an agreeing partial measurement with enough words', async () => {
    stubDetectors({
      comparison: fetchBand(0.3, {
        isPartialCSR: true,
        matchedWordCount: 75,
      }),
    });

    const result = await window.pageAnalyzer();

    expect(result.decision.measurement.band).toBe('partial');
    expect(result.confidenceLevel).toBe('medium');
    expect(result.confidenceLevelReason).toBe('partial-band');
  });

  it.each([
    [0.15, 'csr', 'medium', 'near-threshold'],
    [0.1, 'csr', 'high', 'clear-measurement'],
    [0.75, 'ssr', 'medium', 'near-threshold'],
    [0.8, 'ssr', 'high', 'clear-measurement'],
    [1, 'ssr', 'high', 'clear-measurement'],
  ])('classifies %s coverage in the %s band as %s / %s', async (coverage, band, level, reason) => {
    stubDetectors({
      comparison: fetchBand(coverage, {
        isLikelyCSR: band === 'csr',
        isDecisiveCSR: band === 'csr',
        isLikelySSR: band === 'ssr',
      }),
    });

    const result = await window.pageAnalyzer();

    expect(result.decision.measurement.band).toBe(band);
    expect(result.confidenceLevel).toBe(level);
    expect(result.confidenceLevelReason).toBe(reason);
  });
});
