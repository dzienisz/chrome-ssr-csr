import { describe, it, expect, afterEach, vi } from "vitest";
import "../hydration-detector.js";

afterEach(() => vi.restoreAllMocks());

describe('probe snapshot reader', () => {
  function bridge(attribute, legacy) {
    const node = document.createElement('div');
    node.id = 'ssr-detector-probe-data';
    if (attribute !== null) node.setAttribute('data-ssr-detector-snapshot', attribute);
    node.textContent = legacy;
    document.body.appendChild(node);
    return node;
  }
  it('prefers an attribute snapshot and keeps hydration output aggregate-only', () => {
    bridge(JSON.stringify({ hydrationErrorCount: 9, hydrationErrors: [{ msg: 'PRIVATE_SENTINEL' }] }), JSON.stringify({ hydrationErrorCount: 1 }));
    expect(window.HydrationDetector.getProbeData().hydrationErrorCount).toBe(9);
    expect(window.HydrationDetector.detect()).toEqual({ errorCount: 9, score: 55 });
    expect(JSON.stringify(window.HydrationDetector.detect())).not.toContain('PRIVATE_SENTINEL');
  });
  it('accepts attribute-only metadata bridges', () => {
    const node = document.createElement('meta');
    node.id = 'ssr-detector-probe-data';
    node.setAttribute('data-ssr-detector-snapshot', JSON.stringify({ navigationCount: 150, hydrationErrorCount: 0 }));
    document.head.appendChild(node);
    expect(window.HydrationDetector.getProbeData()).toEqual({ navigationCount: 150, hydrationErrorCount: 0 });
  });
  it('reads legacy text only when the attribute is absent', () => {
    bridge(null, JSON.stringify({ hydrationErrors: [{}, {}], navigations: [] }));
    expect(window.HydrationDetector.detect()).toEqual({ errorCount: 2, score: 90 });
  });
  it.each(['', '{invalid'])('returns null for malformed attribute %j without legacy fallback', attribute => {
    bridge(attribute, JSON.stringify({ hydrationErrorCount: 1 }));
    expect(window.HydrationDetector.getProbeData()).toBeNull();
  });
  it('returns null for malformed legacy text', () => {
    bridge(null, '{invalid');
    expect(window.HydrationDetector.getProbeData()).toBeNull();
  });
  it('returns null when no bridge exists', () => {
    expect(window.HydrationDetector.getProbeData()).toBeNull();
  });
});
describe("hydration telemetry", () => {
  it.each([0, 9, 150, Number.MAX_SAFE_INTEGER])(
    "uses total %s instead of retained samples",
    (total) => {
      vi.spyOn(window.HydrationDetector, "getProbeData").mockReturnValue({
        hydrationErrorCount: total,
        hydrationErrors: Array(5).fill({ message: "PRIVATE_SENTINEL" }),
      });
      expect(window.HydrationDetector.detect()).toEqual({
        errorCount: total,
        score: Math.max(0, 100 - total * 5),
      });
    },
  );
  it.each([
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "9",
    null,
    undefined,
    {},
  ])("falls back for invalid total %j", (total) => {
    vi.spyOn(window.HydrationDetector, "getProbeData").mockReturnValue({
      hydrationErrorCount: total,
      hydrationErrors: [{}, {}],
    });
    expect(window.HydrationDetector.detect()).toEqual({
      errorCount: 2,
      score: 90,
    });
  });
  it("handles absent legacy samples safely", () => {
    vi.spyOn(window.HydrationDetector, "getProbeData").mockReturnValue({});
    expect(window.HydrationDetector.detect()).toEqual({
      errorCount: 0,
      score: 100,
    });
  });
  it("returns only aggregates without a probe", () => {
    vi.spyOn(window.HydrationDetector, "getProbeData").mockReturnValue(null);
    expect(window.HydrationDetector.detect()).toEqual({
      errorCount: 0,
      score: 100,
    });
  });
  it.each([0, 1, 4, 21])(
    "preserves count/score for %i errors without messages",
    (errorCount) => {
      vi.spyOn(window.HydrationDetector, "getProbeData").mockReturnValue({
        hydrationErrors: Array(errorCount).fill({
          message: "PRIVATE_SENTINEL",
          stack: "PRIVATE_SENTINEL",
        }),
      });
      const result = window.HydrationDetector.detect();
      expect(result).toEqual({
        errorCount,
        score: Math.max(0, 100 - errorCount * 5),
      });
      expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
    },
  );
});
