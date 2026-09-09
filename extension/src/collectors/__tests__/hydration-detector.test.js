import { describe, it, expect, afterEach, vi } from "vitest";
import "../hydration-detector.js";

afterEach(() => vi.restoreAllMocks());
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
