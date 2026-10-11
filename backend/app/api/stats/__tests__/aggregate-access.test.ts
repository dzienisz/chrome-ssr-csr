import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getPublicStats } from "../route";
import { GET as getAdminStats } from "@/app/api/admin/stats/route";
import {
  getRecentAnalyses,
  getTopDomains,
  getTotalStats,
  getVerdictsByVersion,
} from "@/lib/db";
import { resetPublicAggregatesCache } from "@/lib/public-stats";

vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }));

vi.mock("@/lib/db", () => ({
  getTotalStats: vi.fn(async () => ({
    total_analyses: 5,
    ssr_count: 3,
    csr_count: 2,
  })),
  getVerdictsByVersion: vi.fn(async () => [
    {
      version: "4.1.0",
      count: 21,
      ssr_count: 12,
      csr_count: 6,
      hybrid_count: 3,
      avg_confidence: 88.1,
    },
  ]),
  getTopFrameworks: vi.fn(async () => [{ framework: "React", count: 2 }]),
  getTopDomains: vi.fn(async () => [{ domain: "example.com", count: 2 }]),
  getAnalysesByDate: vi.fn(async () => []),
  getRecentAnalyses: vi.fn(async () => [{ id: 1, domain: "example.com" }]),
  getLatestAnalysisTime: vi.fn(async () => "2026-01-01T00:00:00.000Z"),
  getContentComparisonStats: vi.fn(async () => ({})),
  getCoreWebVitalsByRenderType: vi.fn(async () => [
    {
      render_category: "SSR",
      sample_count: "20",
      p75_lcp: "2920",
      p75_cls: "0.055",
      p75_inp: "180",
      p75_ttfb: "696",
    },
  ]),
}));

vi.mock("@/lib/db-phase2", () => ({
  getTechStackStats: vi.fn(async () => ({})),
  getSEOStats: vi.fn(async () => ({})),
}));

vi.mock("@/lib/db-phase3", () => ({
  getNavigationByRenderType: vi.fn(async () => []),
}));

const request = (type: string) =>
  new NextRequest(`http://localhost/api/stats?type=${type}`);

beforeEach(() => {
  vi.clearAllMocks();
  resetPublicAggregatesCache();
});

describe("stats endpoint access", () => {
  it.each(["domains", "recent"])(
    "rejects public type=%s without querying domain data",
    async (type) => {
      const response = await getPublicStats(request(type));

      expect(response.status).toBe(403);
      expect(response.headers.get("Cache-Control")).toBe(
        "no-store, no-cache, must-revalidate",
      );
      expect(await response.json()).toEqual({
        success: false,
        error: "Admin only",
      });
      expect(getTopDomains).not.toHaveBeenCalled();
      expect(getRecentAnalyses).not.toHaveBeenCalled();
    },
  );

  it("returns only aggregates publicly and skips domain queries", async () => {
    const response = await getPublicStats(request("all"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    expect(body).toHaveProperty("total");
    expect(body.coreWebVitals).toEqual([
      {
        render_category: "SSR",
        sample_count: "20",
        p75_lcp: "2920",
        p75_cls: "0.055",
        p75_inp: "180",
        p75_ttfb: "696",
      },
    ]);
    expect(body).not.toHaveProperty("domains");
    expect(body).not.toHaveProperty("recent");
    expect(getTopDomains).not.toHaveBeenCalled();
    expect(getRecentAnalyses).not.toHaveBeenCalled();
  });

  it("preserves public totals", async () => {
    const response = await getPublicStats(request("total"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
    expect(await response.json()).toEqual({
      total_analyses: 5,
      ssr_count: 3,
      csr_count: 2,
    });
    expect(getTotalStats).toHaveBeenCalledOnce();
  });

  it("returns public version verdicts without caching the slice", async () => {
    const response = await getPublicStats(request("versions"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
    expect(await response.json()).toEqual([
      {
        version: "4.1.0",
        count: 21,
        ssr_count: 12,
        csr_count: 6,
        hybrid_count: 3,
        avg_confidence: 88.1,
      },
    ]);
    expect(getVerdictsByVersion).toHaveBeenCalledWith(8);
  });

  it("returns version verdicts in the admin slice with the requested limit", async () => {
    const response = await getAdminStats(
      new NextRequest("http://localhost/api/admin/stats?type=versions&limit=16"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
    expect(getVerdictsByVersion).toHaveBeenCalledWith(16);
  });

  it("includes domain and recent data in the admin all response", async () => {
    const response = await getAdminStats(request("all"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
    expect(body.domains).toEqual([{ domain: "example.com", count: 2 }]);
    expect(body.recent).toEqual([{ id: 1, domain: "example.com" }]);
    expect(getTopDomains).toHaveBeenCalledOnce();
    expect(getRecentAnalyses).toHaveBeenCalledOnce();
  });
});
