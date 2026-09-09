import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import probeSource from '../../probe.js?raw';
import analyzerSource from '../../analyzer-bundle.js?raw';
import '../../detectors/comparison-detector.js';
import '../../detectors/content-detector.js';
import '../../detectors/framework-detector.js';
import '../../detectors/meta-detector.js';
import '../../detectors/performance-detector.js';
import '../../detectors/csr-pattern-detector.js';
import '../../detectors/hybrid-detector.js';
import '../../detectors/platform-detector.js';
import '../scoring.js';
import '../analyzer.js';
import '../../collectors/hydration-detector.js';

const article = 'The static article contains useful information for readers. '.repeat(8);
function fixture(html, raw = html) {
  document.body.innerHTML = html;
  const visible = window.extractVisibleText(document.body);
  Object.defineProperty(document.body, 'innerText', { configurable: true, get: () => visible });
  global.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => `<html><head></head><body>${raw}</body></html>` });
  performance.getEntriesByType = vi.fn(() => []);
}
function stable(result) {
  return { renderType: result.renderType, confidence: result.confidence, indicators: result.indicators, detailedInfo: result.detailedInfo };
}
function bridgeWith(size) {
  let bridge = document.getElementById('ssr-detector-probe-data');
  if (!bridge) {
    bridge = document.createElement('div');
    bridge.id = 'ssr-detector-probe-data';
    bridge.style.display = 'none';
    document.body.appendChild(bridge);
  }
  bridge.textContent = JSON.stringify({ hydrationErrors: [], navigations: [], marker: '__NEXT_DATA__ window.__STATE__ = loading spinner skeleton <!--$--> <!--/$-->', padding: 'x'.repeat(size) });
  return bridge;
}
async function assertIsolated(expectedType) {
  const baseline = stable(await window.pageAnalyzer());
  expect(baseline.renderType).not.toBe('Analysis Error');
  if (expectedType) expect(baseline.renderType).toBe(expectedType);
  for (const size of [100, 12000, 50000, 0]) {
    const bridge = bridgeWith(size);
    const snapshot = bridge.textContent;
    expect(stable(await window.pageAnalyzer())).toEqual(baseline);
    expect(bridge.isConnected).toBe(true);
    expect(bridge.textContent).toBe(snapshot);
    expect(window.HydrationDetector.getProbeData().padding).toHaveLength(size);
    expect(bridge.textContent).toBe(snapshot);
  }
}
afterEach(() => {
  delete document.body.innerText;
  vi.restoreAllMocks();
});

describe('real analyzer probe isolation', () => {
  for (const mode of ['author-important', 'display-mutation']) {
    it.each([49, 99, 199, 499])(`keeps ${mode} producer snapshots out of visible-text thresholds at %i characters`, async length => {
      const html = `<!doctype html><html><head>${mode === 'author-important' ? '<style>#ssr-detector-probe-data { display: block !important; }</style>' : ''}</head><body><article>${'a'.repeat(length)}</article><span style="display:none">HIDDEN_APPLICATION_TEXT</span>${'<button type="submit"></button>'.repeat(4)}</body></html>`;
      const realm = new JSDOM(html, { url: 'https://probe.test/', runScripts: 'outside-only' });
      const page = realm.window;
      try {
        page.fetch = vi.fn().mockResolvedValue({ ok: true, text: async () => html });
        page.performance.getEntriesByType = () => [];
        page.console.error = vi.fn();
        Object.defineProperty(page.document.body, 'innerText', { configurable: true, get: () => {
          const bridge = page.document.getElementById('ssr-detector-probe-data');
          const visibleBridge = bridge && page.document.body.contains(bridge) && (mode === 'author-important' || bridge.style.display === 'block');
          return 'a'.repeat(length) + (visibleBridge && bridge.textContent ? '\n' + bridge.textContent : '');
        } });
        page.eval(analyzerSource);
        page.eval(probeSource);
        const bodyHTML = page.document.body.innerHTML;
        const baseline = stable(await page.pageAnalyzer());
        expect(baseline.renderType).not.toBe('Analysis Error');
        expect(baseline.detailedInfo.contentLength).toBe(length);
        for (let i = 0; i < 150; i++) page.history.pushState(null, '', '/route-' + i);
        for (let i = 0; i < 9; i++) page.console.error('Hydration failed __NEXT_DATA__ spinner <!--$--> ' + 'x'.repeat(300));
        page.dispatchEvent(new page.Event('ssr-detector-request-data'));
        const bridge = page.document.getElementById('ssr-detector-probe-data');
        if (mode === 'display-mutation') bridge.style.display = 'block';
        const snapshot = bridge.outerHTML;
        expect(stable(await page.pageAnalyzer())).toEqual(baseline);
        expect(page.document.body.innerHTML).toBe(bodyHTML);
        expect(bridge.outerHTML).toBe(snapshot);
        expect(bridge.parentElement).toBe(page.document.head);
        expect(bridge.textContent).toBe('');
        const data = JSON.parse(bridge.getAttribute('data-ssr-detector-snapshot'));
        expect(data.navigationCount).toBe(150);
        expect(data.navigations).toHaveLength(100);
        expect(data.hydrationErrorCount).toBe(9);
        expect(data.hydrationErrors).toHaveLength(5);
        page.dispatchEvent(new page.Event('ssr-detector-request-data'));
        expect(page.document.getElementById('ssr-detector-probe-data')).toBe(bridge);
        expect(stable(await page.pageAnalyzer())).toEqual(baseline);
      } finally { page.close(); }
    });
  }
  it('preserves application text identical to normally hidden probe text', async () => {
    const json = JSON.stringify({ message: 'Application text' });
    fixture(`<article>${json}</article>`);
    const baseline = stable(await window.pageAnalyzer());
    const bridge = bridgeWith(0);
    bridge.textContent = json;
    expect(stable(await window.pageAnalyzer())).toEqual(baseline);
  });
  it('keeps SSR measurements, scores and verdict stable through bridge writes', async () => {
    fixture(`<article>${article}</article>`);
    await assertIsolated('Server-Side Rendered (SSR)');
  });
  it('keeps genuine CSR decisive when raw HTML is empty', async () => {
    fixture(`<div id="root"><article>${article}</article></div>`, '<div id="root"></div>');
    const root = document.getElementById('root');
    root._reactRootContainer = { synthetic: true };
    await assertIsolated('Client-Side Rendered (CSR)');
    expect(document.getElementById('root')).toBe(root);
    expect(root._reactRootContainer).toEqual({ synthetic: true });
    expect(window.detectFrameworks(null).details.frameworks).toContain('react');
  });
  it('keeps short-text loading and near-threshold script counts stable', async () => {
    fixture('<script>void 0;</script><div><p>Short article</p></div>');
    expect(window.analyzeContent().details.scriptRatio).toBe(0.17);
    await assertIsolated();
  });
  it('keeps rich-content child counts stable at the three-child boundary', async () => {
    fixture(`<article>${Array(6).fill(`<p>${article}</p>`).join('')}</article><div></div><div></div>`);
    expect(window.analyzeContent().details.childrenCount).toBe(3);
    await assertIsolated('Server-Side Rendered (SSR)');
  });
});
