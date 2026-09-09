import { describe, it, expect, afterEach, vi } from "vitest";
import "../telemetry-collector.js";

afterEach(() => vi.unstubAllGlobals());
describe("hydration orchestration boundary", () => {
  it("does not forward nonnumeric aggregate values", async () => {
    vi.stubGlobal("HydrationDetector", {
      detect: () => ({
        errorCount: { message: "PRIVATE_SENTINEL" },
        score: 100,
      }),
    });
    const result = await window.collectTelemetryData({});
    expect(result.hydrationData).toBeNull();
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
  });
  it("projects a collector stub with raw extra fields", async () => {
    vi.stubGlobal("HydrationDetector", {
      detect: () => ({
        errorCount: 2,
        score: 90,
        errors: ["PRIVATE_SENTINEL"],
        extra: "PRIVATE_SENTINEL",
      }),
    });
    const result = await window.collectTelemetryData({});
    expect(result.hydrationData).toEqual({ errorCount: 2, score: 90 });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
  });
  it("keeps absent collector data null", async () => {
    vi.stubGlobal("HydrationDetector", undefined);
    expect((await window.collectTelemetryData({})).hydrationData).toBeNull();
  });
});
