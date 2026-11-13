import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import performanceSource from '../performance-collector.js?raw';

let lcpEntries;
let layoutShiftEntries;
let visibilityEntries;
let activationStart;

function setPerformanceObserver(supportedEntryTypes) {
  const MockPerformanceObserver = vi.fn(function (callback) {
    return {
      observe: vi.fn(({ type }) => {
        callback({
          getEntries: () => {
            if (type === 'largest-contentful-paint') return lcpEntries;
            if (type === 'layout-shift') return layoutShiftEntries;
            return [];
          }
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

async function collectCls() {
  const result = window.collectCoreWebVitals();
  await vi.runAllTimersAsync();
  return (await result).cls;
}

/** A layout shift of `value` at `startTime`, uncaused by the user. */
function shift(startTime, value) {
  return { startTime, value, hadRecentInput: false };
}

beforeEach(() => {
  vi.useFakeTimers();
  lcpEntries = [];
  layoutShiftEntries = [];
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

  it('ignores a prerender hidden entry before activation', async () => {
    activationStart = 800;
    visibilityEntries = [
      { name: 'hidden', startTime: 0 },
      { name: 'visible', startTime: 800 }
    ];
    lcpEntries = [{ startTime: 1500 }];

    await expect(collectLcp()).resolves.toBe(700);
  });

  it('filters by the first hidden entry after prerender activation', async () => {
    activationStart = 800;
    visibilityEntries = [
      { name: 'hidden', startTime: 0 },
      { name: 'visible', startTime: 800 },
      { name: 'hidden', startTime: 3000 }
    ];
    lcpEntries = [{ startTime: 1500 }, { startTime: 4000 }];

    await expect(collectLcp()).resolves.toBe(700);
  });

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

describe('Cumulative Layout Shift collection', () => {
  it('reports the largest session window rather than the lifetime sum', async () => {
    // Two bursts, a clear pause apart. The sum would be 0.24; CLS is 0.14.
    layoutShiftEntries = [
      shift(0, 0.05),
      shift(500, 0.05),
      shift(3000, 0.07),
      shift(3500, 0.07)
    ];

    await expect(collectCls()).resolves.toBe(0.14);
  });

  it('opens a new window when more than a second passes between shifts', async () => {
    layoutShiftEntries = [shift(0, 0.1), shift(1500, 0.1)];

    await expect(collectCls()).resolves.toBe(0.1);
  });

  it('closes a window five seconds after its first shift', async () => {
    // Shifts every 900ms never pause, so only the 5s cap can end the window:
    // the six up to 4500ms belong to it, the one at 5400ms starts the next.
    layoutShiftEntries = [0, 900, 1800, 2700, 3600, 4500, 5400].map((startTime) =>
      shift(startTime, 0.05)
    );

    await expect(collectCls()).resolves.toBe(0.3);
  });

  it('ignores shifts the user caused and does not let them extend a window', async () => {
    layoutShiftEntries = [
      shift(0, 0.05),
      { startTime: 500, value: 5, hadRecentInput: true },
      shift(1600, 0.05)
    ];

    await expect(collectCls()).resolves.toBe(0.05);
  });

  it('reports zero for a page that never shifted', async () => {
    await expect(collectCls()).resolves.toBe(0);
  });
});
