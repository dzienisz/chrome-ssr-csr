import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import probeSource from '../probe.js?raw';
import hydrationSource from '../collectors/hydration-detector.js?raw';

let realm;
let page;
let clock;
let originalError;
let originalPush;
function snapshot() {
  page.dispatchEvent(new page.Event('ssr-detector-request-data'));
  const node = page.document.getElementById('ssr-detector-probe-data');
  return JSON.parse(node.getAttribute('data-ssr-detector-snapshot') ?? node.textContent);
}
function navigate(path, sameDocument = true) {
  const event = new page.Event('navigate');
  Object.assign(event, { destination: { url: 'https://probe.test' + path, sameDocument }, navigationType: 'push' });
  page.navigation.dispatchEvent(event);
}
beforeEach(() => {
  realm = new JSDOM('<!doctype html><html><body><article>Fixture</article></body></html>', { url: 'https://probe.test/', runScripts: 'outside-only' });
  page = realm.window;
  clock = 1000;
  page.Date.now = () => clock;
  page.navigation = new page.EventTarget();
  originalError = vi.fn();
  page.console.error = originalError;
  originalPush = vi.spyOn(page.history, 'pushState');
  page.eval(probeSource);
});
afterEach(() => realm.window.close());

describe('probe bounded retention in a fresh realm', () => {
  it('publishes JSON only in a namespaced attribute on a head meta bridge', () => {
    const bodyHTML = page.document.body.innerHTML;
    const data = snapshot();
    const node = page.document.getElementById('ssr-detector-probe-data');
    expect(node.tagName).toBe('META');
    expect(node.parentElement).toBe(page.document.head);
    expect(node.textContent).toBe('');
    expect(JSON.parse(node.getAttribute('data-ssr-detector-snapshot'))).toEqual(data);
    expect(node.hasAttribute('name')).toBe(false);
    expect(node.hasAttribute('property')).toBe(false);
    expect(node.hasAttribute('content')).toBe(false);
    expect(page.document.body.innerHTML).toBe(bodyHTML);
  });
  it('falls back to the document element when head is absent', () => {
    page.document.head.remove();
    const bodyHTML = page.document.body.innerHTML;
    snapshot();
    const node = page.document.getElementById('ssr-detector-probe-data');
    expect(node.tagName).toBe('META');
    expect(node.parentElement).toBe(page.document.documentElement);
    expect(node.textContent).toBe('');
    expect(page.document.body.innerHTML).toBe(bodyHTML);
  });
  it('migrates only the existing reserved bridge on publication, preserving its identity', () => {
    const legacy = page.document.createElement('div');
    legacy.id = 'ssr-detector-probe-data';
    legacy.textContent = JSON.stringify({ navigationCount: 99, legacy: true });
    page.document.body.appendChild(legacy);
    const article = page.document.querySelector('article');
    const articleHTML = article.outerHTML;
    page.history.pushState(null, '', '/new');
    expect(legacy.textContent).toContain('legacy');
    expect(snapshot().navigationCount).toBe(1);
    expect(page.document.getElementById('ssr-detector-probe-data')).toBe(legacy);
    expect(legacy.textContent).toBe('');
    expect(legacy.hasAttribute('data-ssr-detector-snapshot')).toBe(true);
    expect(article.outerHTML).toBe(articleHTML);
    snapshot();
    expect(page.document.getElementById('ssr-detector-probe-data')).toBe(legacy);
  });
  it('starts empty and reuses one bridge across requests', () => {
    expect(snapshot()).toMatchObject({ navigationCount: 0, hydrationErrorCount: 0, navigations: [], hydrationErrors: [] });
    const node = page.document.getElementById('ssr-detector-probe-data');
    snapshot();
    expect(page.document.querySelectorAll('#ssr-detector-probe-data')).toHaveLength(1);
    expect(page.document.getElementById('ssr-detector-probe-data')).toBe(node);
    expect(node.dataset.status).toBe('ready');
    expect(node.style.display).toBe('none');
  });
  it('retains the latest 100 of 150 routes without losing total or original history behavior', () => {
    for (let i = 0; i < 150; i++) page.history.pushState({ i }, '', '/route-' + i);
    const data = snapshot();
    expect(data.navigationCount).toBe(150);
    expect(data.navigations).toHaveLength(100);
    expect(data.navigations[0].view).toBe('/route-50');
    expect(data.navigations.slice(-5).map(n => n.view)).toEqual([145, 146, 147, 148, 149].map(i => '/route-' + i));
    expect(data.navigations[99]).toMatchObject({ type: 'pushState', source: 'history', time: 0 });
    expect(originalPush).toHaveBeenCalledTimes(150);
    expect(page.history.state).toEqual({ i: 149 });
    expect(page.location.pathname).toBe('/route-149');
  });
  it('deduplicates paired sources after trimming, preserving the 50ms window', () => {
    for (let i = 0; i < 150; i++) {
      navigate('/route-' + i);
      page.history.pushState(null, '', '/route-' + i);
    }
    expect(snapshot().navigationCount).toBe(150);
    clock += 49;
    page.history.replaceState(null, '', '/route-149');
    expect(snapshot().navigationCount).toBe(150);
    clock += 1;
    page.history.replaceState(null, '', '/route-149');
    const data = snapshot();
    expect(data.navigationCount).toBe(151);
    expect(data.navigations).toHaveLength(100);
    expect(data.navigations.at(-1)).toMatchObject({ type: 'replaceState', source: 'history', view: '/route-149', time: 50 });
    navigate('/full-page', false);
    expect(snapshot().navigationCount).toBe(151);
  });
  it('counts every hydration error, keeps five samples and preserves original console arguments', () => {
    const detail = { fixture: true };
    for (let i = 0; i < 9; i++) page.console.error('Hydration failed ' + i + 'x'.repeat(300), detail);
    page.console.error('ordinary error', detail);
    const data = snapshot();
    expect(data.hydrationErrorCount).toBe(9);
    expect(data.hydrationErrors).toHaveLength(5);
    expect(data.hydrationErrors.every(error => error.msg.length <= 200)).toBe(true);
    expect(originalError).toHaveBeenCalledTimes(10);
    expect(originalError.mock.calls[0]).toEqual(['Hydration failed 0' + 'x'.repeat(300), detail]);
    page.eval(hydrationSource);
    expect(page.HydrationDetector.detect()).toEqual({ errorCount: 9, score: 55 });
  });
  it('does not install duplicate wrappers or listeners', () => {
    const wrappedPush = page.history.pushState;
    const wrappedError = page.console.error;
    page.eval(probeSource);
    expect(page.history.pushState).toBe(wrappedPush);
    expect(page.console.error).toBe(wrappedError);
    navigate('/one');
    page.console.error('Hydration failed');
    expect(snapshot()).toMatchObject({ navigationCount: 1, hydrationErrorCount: 1 });
    expect(originalError).toHaveBeenCalledOnce();
  });
  it('preserves history return values and exceptions', () => {
    expect(page.history.pushState({ ok: true }, '', '/ok')).toBeUndefined();
    expect(() => page.history.pushState(null, '', 'https://different.test/')).toThrow();
    expect(page.history.state).toEqual({ ok: true });
    expect(snapshot().navigationCount).toBe(1);
  });
});

describe('probe parse-time text snapshot', () => {
  function loadingRealm(body) {
    const r = new JSDOM(`<!doctype html><html><head></head><body>${body}</body></html>`, { url: 'https://probe.test/', runScripts: 'outside-only' });
    let state = 'loading';
    Object.defineProperty(r.window.document, 'readyState', { configurable: true, get: () => state });
    r.window.eval(probeSource);
    return { r, setState(next) { state = next; r.window.document.dispatchEvent(new r.window.Event('readystatechange')); } };
  }
  function read(w) {
    w.dispatchEvent(new w.Event('ssr-detector-request-data'));
    return JSON.parse(w.document.getElementById('ssr-detector-probe-data').getAttribute('data-ssr-detector-snapshot'));
  }

  it('records the visible text length when parsing finishes, not later', () => {
    const { r, setState } = loadingRealm('<div id="root">  Shell   text </div><script>var x = "script text";</script><style>p{}</style><noscript>Enable JS</noscript>');
    setState('interactive');
    r.window.document.getElementById('root').textContent = 'Rendered by a module script after parsing. '.repeat(10);
    setState('complete');
    expect(read(r.window).parsedTextLength).toBe('Shell text'.length);
    r.window.close();
  });

  it('records nothing when injected after parsing already ended', () => {
    const late = new JSDOM('<!doctype html><html><head></head><body><p>Late</p></body></html>', { url: 'https://probe.test/', runScripts: 'outside-only' });
    Object.defineProperty(late.window.document, 'readyState', { configurable: true, get: () => 'complete' });
    late.window.eval(probeSource);
    late.window.document.dispatchEvent(new late.window.Event('readystatechange'));
    expect(read(late.window).parsedTextLength).toBeUndefined();
    late.window.close();
  });

  it('keeps only a number, never the text', () => {
    const { r, setState } = loadingRealm('<p>Private account details</p>');
    setState('interactive');
    const raw = r.window.document.getElementById('ssr-detector-probe-data') || null;
    expect(raw).toBeNull();
    expect(JSON.stringify(read(r.window))).not.toContain('Private');
    r.window.close();
  });
});
