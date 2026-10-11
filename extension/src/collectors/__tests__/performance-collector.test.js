import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import performanceSource from '../performance-collector.js?raw';

let lcpEntries;
let visibilityEntries;
let activationStart;

function setPerformanceObserver(supportedEntryTypes) {
  const MockPerformanceObserver = vi.fn(function (callback) {
    return {
      observe: vi.fn(({ type }) => {
        callback({
          getEntries: () =>
            type === 'largest-contentful-paint' ? lcpEntries : []
        });
      }),
      disconnect: vi.fn()
    };
  });
  MockPerformanceObserver.supportedEntryTypes = supportedEntryTypes;
  window.PerformanceObserver = MockPerformanceObserver;
  globalThis.PerformanceObserver = MockPerformanceObserver;
}

async function collectLcp() {
  const result = window.collectCoreWebVitals();
  await vi.runAllTimersAsync();
  return (await result).lcp;
}

beforeEach(() => {
  vi.useFakeTimers();
  lcpEntries = [];
  visibilityEntries = [];
  activationStart = 0;
  setPerformanceObserver(['largest-contentful-paint', 'visibility-state']);
  window.performance.getEntriesByType = vi.fn((type) => {
    if (type === 'visibility-state') return visibilityEntries;
    if (type === 'navigation') {
      return [
        {
          activationStart,
          responseStart: 100,
          requestStart: 0,
          domInteractive: 200,
          fetchStart: 0,
          loadEventEnd: 300
        }
      ];
    }
    return [];
  });
  window.eval(performanceSource);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Largest Contentful Paint collection', () => {
  it('uses the last LCP entry while the page stays visible', async () => {
    lcpEntries = [{ startTime: 1200 }, { startTime: 2500 }];

    await expect(collectLcp()).resolves.toBe(2500);
  });

  it('ignores LCP entries when the page starts hidden', async () => {
    visibilityEntries = [{ name: 'hidden', startTime: 0 }];
    lcpEntries = [{ startTime: 1200 }];

    await expect(collectLcp()).resolves.toBeNull();
  });

  it('keeps only LCP entries before the first hidden transition', async () => {
    visibilityEntries = [{ name: 'hidden', startTime: 5000 }];
    lcpEntries = [{ startTime: 1200 }, { startTime: 9000 }];

    await expect(collectLcp()).resolves.toBe(1200);
  });

  it.each([
    [1500, 700],
    [300, 0]
  ])(
    'rebases an LCP entry at %i by the prerender activation time',
    async (startTime, expected) => {
      activationStart = 800;
      lcpEntries = [{ startTime }];

      await expect(collectLcp()).resolves.toBe(expected);
    }
  );

  it('reads firstHiddenTime from the probe snapshot when visibility-state is unsupported', async () => {
    setPerformanceObserver(['largest-contentful-paint']);
    lcpEntries = [{ startTime: 1500 }, { startTime: 2500 }];
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const bridge = document.createElement('meta');
    bridge.id = 'ssr-detector-probe-data';
    bridge.setAttribute(
      'data-ssr-detector-snapshot',
      JSON.stringify({ firstHiddenTime: 2000 })
    );
    document.head.appendChild(bridge);

    await expect(collectLcp()).resolves.toBe(1500);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ssr-detector-request-data' })
    );
  });

  it('returns null when there are no LCP entries', async () => {
    await expect(collectLcp()).resolves.toBeNull();
  });
});
