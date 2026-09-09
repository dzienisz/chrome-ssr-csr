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
  return JSON.parse(page.document.getElementById('ssr-detector-probe-data').textContent);
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
