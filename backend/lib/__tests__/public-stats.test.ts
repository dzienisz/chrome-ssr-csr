import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTotalStats,
  getTopFrameworks,
  getAnalysesByDate,
  getLatestAnalysisTime,
  getContentComparisonStats,
  getCoreWebVitalsByRenderType,
} from "@/lib/db";
import { getTechStackStats, getSEOStats } from "@/lib/db-phase2";
import { getNavigationByRenderType } from "@/lib/db-phase3";
import {
  getPublicAggregates,
  PUBLIC_STATS_TTL_MS,
  resetPublicAggregatesCache,
} from "../public-stats";

vi.mock("@/lib/db", () => ({
  getTotalStats: vi.fn(),
  getTopFrameworks: vi.fn(),
  getAnalysesByDate: vi.fn(),
  getLatestAnalysisTime: vi.fn(),
  getContentComparisonStats: vi.fn(),
  getCoreWebVitalsByRenderType: vi.fn(),
}));

vi.mock("@/lib/db-phase2", () => ({
  getTechStackStats: vi.fn(),
  getSEOStats: vi.fn(),
}));

vi.mock("@/lib/db-phase3", () => ({
  getNavigationByRenderType: vi.fn(),
}));

const queryMocks = [
  vi.mocked(getTotalStats),
  vi.mocked(getTopFrameworks),
  vi.mocked(getAnalysesByDate),
  vi.mocked(getLatestAnalysisTime),
  vi.mocked(getContentComparisonStats),
  vi.mocked(getTechStackStats),
  vi.mocked(getSEOStats),
  vi.mocked(getCoreWebVitalsByRenderType),
  vi.mocked(getNavigationByRenderType),
];

beforeEach(() => {
  resetPublicAggregatesCache();
  vi.mocked(getTotalStats).mockResolvedValue({ total_analyses: 5 } as never);
  vi.mocked(getTopFrameworks).mockResolvedValue([
    { framework: "React", count: 2 },
  ]);
  vi.mocked(getAnalysesByDate).mockResolvedValue([]);
  vi.mocked(getLatestAnalysisTime).mockResolvedValue(null);
  vi.mocked(getContentComparisonStats).mockResolvedValue({} as never);
  vi.mocked(getTechStackStats).mockResolvedValue({} as never);
  vi.mocked(getSEOStats).mockResolvedValue({} as never);
  vi.mocked(getCoreWebVitalsByRenderType).mockResolvedValue([]);
  vi.mocked(getNavigationByRenderType).mockResolvedValue([]);
});

function expectOneQuerySet() {
  for (const query of queryMocks) expect(query).toHaveBeenCalledOnce();
}

describe("getPublicAggregates", () => {
  it("shares one result for calls within the TTL", async () => {
    const first = getPublicAggregates(10_000);
    const second = getPublicAggregates(10_000 + PUBLIC_STATS_TTL_MS - 1);

    expect(second).toBe(first);
    expect(await first).toEqual(await second);
    expectOneQuerySet();
  });

  it("runs the queries again after the TTL", async () => {
    const first = await getPublicAggregates(20_000);
    const second = await getPublicAggregates(20_000 + PUBLIC_STATS_TTL_MS);

    expect(second).toEqual(first);
    for (const query of queryMocks) expect(query).toHaveBeenCalledTimes(2);
  });

  it("shares one query set for concurrent calls", async () => {
    const first = getPublicAggregates(30_000);
    const second = getPublicAggregates(30_001);

    expect(second).toBe(first);
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(secondResult).toEqual(firstResult);
    expectOneQuerySet();
  });

  it("clears a rejected promise so the next call retries", async () => {
    const error = new Error("query failed");
    vi.mocked(getTotalStats).mockRejectedValueOnce(error);

    await expect(getPublicAggregates(40_000)).rejects.toBe(error);
    await expect(getPublicAggregates(40_001)).resolves.toMatchObject({
      frameworks: [{ framework: "React", count: 2 }],
    });

    for (const query of queryMocks) expect(query).toHaveBeenCalledTimes(2);
  });
});
