import { describe, it, expect, vi, beforeEach } from "vitest";
import { sql } from "@vercel/postgres";
import {
  insertAnalysis,
  getTotalStats,
  getRecentAnalyses,
  deleteAnalysis,
  AnalysisRecord,
} from "../db";

import {
  getTopDomains,
  getTopFrameworks,
  getPageTypeDistribution,
  getDevicePerformance,
  getDeviceTypeSummary,
  getContentComparisonStats,
  getCoreWebVitalsByRenderType,
} from "../db";
import { getTechStackStats, getSEOStats } from "../db-phase2";
import {
  getHydrationStats,
  getNavigationStats,
  getNavigationByRenderType,
} from "../db-phase3";

// Mock sql is set up in vitest.setup.ts
const mockSql = sql as unknown as ReturnType<typeof vi.fn>;

describe("public database boundary", () => {
  it("guards hybrid points without the obsolete percentage ceiling", async () => {
    mockSql.mockResolvedValueOnce({
      rows: [{ avg_hybrid_score: "120.5", hybrid_detected_count: "2" }],
    });
    expect(await getContentComparisonStats()).toEqual({
      avg_hybrid_score: "120.5",
      hybrid_detected_count: "2",
    });
    const statement = mockSql.mock.calls[0][0].join("");
    expect(statement).toMatch(
      /CASE WHEN jsonb_typeof\(value\) = 'number'\s+THEN value::numeric BETWEEN 0 AND 9007199254740991\s+ELSE false END/,
    );
    expect(statement).not.toContain("value::numeric <= 100");
    expect(statement).toContain(
      "AVG((performance_metrics::jsonb->>'hybridScore')::numeric)",
    );
  });
  it("projects historical records without losing order, count or pagination", async () => {
    mockSql.mockResolvedValueOnce({
      rows: [
        {
          id: 8,
          domain: "EXAMPLE.test",
          render_type: "SSR",
          confidence: 90,
          timestamp: new Date("2026-01-01T00:00:00Z"),
          frameworks: ["React", "PRIVATE_SENTINEL"],
          url: "/PRIVATE_SENTINEL",
          user_agent: "PRIVATE_SENTINEL",
          indicators: ["PRIVATE_SENTINEL"],
          seo_accessibility: { title: "PRIVATE_SENTINEL" },
          extra: "PRIVATE_SENTINEL",
          core_web_vitals: { lcp: 1, cls: null, extra: "PRIVATE_SENTINEL" },
          hydration_stats: {
            errorCount: 2,
            score: 90,
            errors: ["PRIVATE_SENTINEL"],
          },
          navigation_stats: {
            isSPA: true,
            clientRoutes: 1,
            routes: ["PRIVATE_SENTINEL"],
            softNavigations: { count: 1 },
          },
          tech_stack: { cssFramework: "Tailwind", extra: "PRIVATE_SENTINEL" },
          device_info: { country: "pl", language: "PRIVATE_SENTINEL" },
        },
        {
          id: 7,
          domain: "PRIVATE_SENTINEL/path",
          render_type: "PRIVATE_SENTINEL",
          confidence: "PRIVATE_SENTINEL",
          timestamp: "PRIVATE_SENTINEL",
          frameworks: [7],
          core_web_vitals: { lcp: "PRIVATE_SENTINEL" },
          hydration_stats: [],
          navigation_stats: { isSPA: "PRIVATE_SENTINEL" },
          tech_stack: { cssFramework: "PRIVATE_SENTINEL" },
          device_info: { country: "PRIVATE_SENTINEL" },
        },
      ],
    });
    const result = await getRecentAnalyses(2, 9);
    expect(result.map((row) => row.id)).toEqual([8, 7]);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
    expect(result[0]).toEqual({
      id: 8,
      domain: "example.test",
      render_type: "SSR",
      confidence: 90,
      timestamp: "2026-01-01T00:00:00.000Z",
      frameworks: ["react"],
      core_web_vitals: { lcp: 1, cls: null },
      hydration_stats: { errorCount: 2, score: 90 },
      navigation_stats: { isSPA: true, clientRoutes: 1 },
      tech_stack: { cssFramework: "Tailwind" },
      device_info: { country: "PL" },
    });
    expect(result[1]).toMatchObject({
      domain: "unknown",
      render_type: "Other",
      confidence: 0,
      frameworks: [],
      core_web_vitals: null,
      hydration_stats: null,
      navigation_stats: null,
      tech_stack: null,
      device_info: { country: null },
    });
    expect(mockSql.mock.calls[0].slice(1)).toEqual([2, 9]);
    expect(mockSql.mock.calls[0][0].join("")).not.toContain("SELECT *");
  });

  it.each([
    getTopDomains,
    getTopFrameworks,
    getPageTypeDistribution,
    getDevicePerformance,
    getDeviceTypeSummary,
  ])(
    "does not return arbitrary historical categories from %s",
    async (query) => {
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            domain: "PRIVATE_SENTINEL/path",
            most_common_type: "PRIVATE_SENTINEL",
            framework: "PRIVATE_SENTINEL",
            page_type: "PRIVATE_SENTINEL",
            device_type: "PRIVATE_SENTINEL",
            connection_type: "PRIVATE_SENTINEL",
            count: "1",
            total_count: "1",
            sample_count: "1",
          },
        ],
      });
      expect(JSON.stringify(await query())).not.toContain("PRIVATE_SENTINEL");
    },
  );
  it("filters tech aggregate labels", async () => {
    mockSql.mockResolvedValue({
      rows: [
        { name: "PRIVATE_SENTINEL", count: "1" },
        { name: "Vite", count: "2" },
      ],
    });
    expect(await getTechStackStats()).toEqual({
      cssFrameworks: {},
      buildTools: { Vite: 2 },
      hosting: {},
    });
  });
  it.each([
    getContentComparisonStats,
    getCoreWebVitalsByRenderType,
    getDevicePerformance,
    getSEOStats,
    getHydrationStats,
    getNavigationStats,
    getNavigationByRenderType,
  ])("guards historical JSON metric casts in %s", async (query) => {
    mockSql.mockResolvedValue({ rows: [] });
    await query();
    const statement = mockSql.mock.calls[0][0].join("");
    expect(statement).toContain("jsonb_typeof");
    expect(statement).toMatch(/BETWEEN 0 AND (9007199254740991|100)/);
    expect(statement).not.toContain("::boolean");
    expect(statement).not.toContain("::int");
  });
});

describe("db functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("insertAnalysis", () => {
    it("should insert analysis and return id", async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 123 }],
      });

      const data: AnalysisRecord = {
        url: "https://example.com",
        domain: "example.com",
        render_type: "Server-Side Rendered (SSR)",
        confidence: 85,
        frameworks: ["react", "nextjs"],
        performance_metrics: {
          domReady: 150,
          fcp: 300,
        },
        indicators: ["framework hydration markers"],
        extension_version: "3.5.0",
      };

      const result = await insertAnalysis(data);

      expect(result).toEqual({ id: 123 });
      expect(mockSql).toHaveBeenCalled();
    });

    it("should throw on database error", async () => {
      mockSql.mockRejectedValueOnce(new Error("Database connection failed"));

      const data: AnalysisRecord = {
        url: "https://example.com",
        domain: "example.com",
        render_type: "SSR",
        confidence: 85,
        frameworks: [],
        performance_metrics: {},
        indicators: [],
        extension_version: "3.5.0",
      };

      await expect(insertAnalysis(data)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });

  describe("getTotalStats", () => {
    it("should return aggregated statistics", async () => {
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            total_analyses: 100,
            ssr_count: 60,
            csr_count: 30,
            hybrid_count: 10,
            avg_confidence: 75.5,
          },
        ],
      });

      const result = await getTotalStats();

      expect(result).toEqual({
        total_analyses: 100,
        ssr_count: 60,
        csr_count: 30,
        hybrid_count: 10,
        avg_confidence: 75.5,
      });
    });

    it("should throw on database error", async () => {
      mockSql.mockRejectedValueOnce(new Error("Query failed"));

      await expect(getTotalStats()).rejects.toThrow("Query failed");
    });
  });

  describe("getRecentAnalyses", () => {
    it("should return recent analyses with default limit", async () => {
      const mockRows = [
        { id: 1, domain: "example.com", render_type: "SSR" },
        { id: 2, domain: "test.com", render_type: "CSR" },
      ];

      mockSql.mockResolvedValueOnce({ rows: mockRows });

      const result = await getRecentAnalyses();

      expect(result).toMatchObject(mockRows);
      expect(mockSql).toHaveBeenCalled();
    });

    it("should support custom limit and offset", async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });

      await getRecentAnalyses(10, 5);

      expect(mockSql).toHaveBeenCalled();
    });

    it("should throw on database error", async () => {
      mockSql.mockRejectedValueOnce(new Error("Query failed"));

      await expect(getRecentAnalyses()).rejects.toThrow("Query failed");
    });
  });

  describe("deleteAnalysis", () => {
    it("should delete analysis and return id", async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 123 }],
      });

      const result = await deleteAnalysis(123);

      expect(result).toEqual({ id: 123 });
      expect(mockSql).toHaveBeenCalled();
    });

    it("should return undefined when id not found", async () => {
      mockSql.mockResolvedValueOnce({
        rows: [],
      });

      const result = await deleteAnalysis(999);

      expect(result).toBeUndefined();
    });

    it("should throw on database error", async () => {
      mockSql.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(deleteAnalysis(123)).rejects.toThrow("Delete failed");
    });
  });
});
