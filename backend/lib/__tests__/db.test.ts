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

import { TECH_LABELS, PAGE_TYPES, DEVICE_TYPES, EFFECTIVE_TYPES } from '../telemetry-schema';

// Mock sql is set up in vitest.setup.ts
const mockSql = sql as unknown as ReturnType<typeof vi.fn>;

describe('canonical aggregate categories', () => {
  it('filters tech labels in parameterized SQL before top-ten selection', async () => {
    mockSql.mockResolvedValue({ rows: [] });
    await getTechStackStats();
    for (const [index, labels] of Object.entries([TECH_LABELS.cssFramework, TECH_LABELS.buildTool, TECH_LABELS.hosting])) {
      const [parts, allowed] = mockSql.mock.calls[Number(index)];
      const query = parts.join('?');
      expect(JSON.parse(allowed)).toEqual(labels);
      expect(query).toMatch(/WHERE[\s\S]*IN \(SELECT jsonb_array_elements_text\(/);
      expect(query.indexOf('WHERE')).toBeLessThan(query.indexOf('GROUP BY'));
      expect(query.indexOf('GROUP BY')).toBeLessThan(query.indexOf('LIMIT 10'));
    }
  });
  it('merges framework aliases and excludes unknowns before the final limit', async () => {
    mockSql.mockResolvedValue({ rows: [{ framework: 'PRIVATE_SENTINEL', count: '50' }, { framework: 'React', count: '3' }, { framework: 'react', count: '5' }, { framework: 'Next.js', count: '2' }, { framework: 'nextjs', count: '1' }] });
    expect(await getTopFrameworks(1)).toEqual([{ framework: 'react', count: 8 }]);
    expect(await getTopFrameworks(10)).toEqual([{ framework: 'react', count: 8 }, { framework: 'nextjs', count: 3 }]);
    expect(mockSql.mock.calls[0][0].join('')).toContain('GROUP BY framework');
    expect(mockSql.mock.calls[0][0].join('')).not.toContain('LIMIT');
  });
  it('merges safe domain groups with weighted confidence and combined render modes before top N', async () => {
    mockSql.mockResolvedValue({ rows: [
      { domain: 'invalid.test/PRIVATE_SENTINEL', render_type: 'SSR', count: '99', confidence_sum: '9900', confidence_count: '99' },
      { domain: 'EXAMPLE.test', render_type: 'SSR', count: '2', confidence_sum: '160', confidence_count: '2' },
      { domain: 'example.test', render_type: 'CSR', count: '3', confidence_sum: '150', confidence_count: '2' },
      { domain: 'competitor.test', render_type: 'SSR', count: '4', confidence_sum: '360', confidence_count: '4' },
      { domain: 'BÜCHER.test', render_type: 'SSR', count: '1', confidence_sum: '100', confidence_count: '1' },
      { domain: 'xn--bcher-kva.test', render_type: 'CSR', count: '2', confidence_sum: '100', confidence_count: '2' },
      { domain: '[0:0:0:0:0:0:0:1]', render_type: 'SSR', count: '2', confidence_sum: '100', confidence_count: '2' },
      { domain: '[::1]', render_type: 'SSR', count: '2', confidence_sum: '200', confidence_count: '2' }
    ] });
    expect(await getTopDomains(1)).toEqual([{ domain: 'example.test', count: 5, avg_confidence: 77.5, most_common_type: 'CSR' }]);
    const all = await getTopDomains(10);
    expect(all).toHaveLength(4);
    expect(all).toContainEqual({ domain: '[::1]', count: 4, avg_confidence: 75, most_common_type: 'SSR' });
    expect(all).toContainEqual({ domain: 'xn--bcher-kva.test', count: 3, avg_confidence: 200 / 3, most_common_type: 'CSR' });
    expect(JSON.stringify(all)).not.toContain('PRIVATE_SENTINEL');
    const query = mockSql.mock.calls[0][0].join('');
    expect(query).toContain('GROUP BY domain, render_type');
    expect(query).toContain('SUM(confidence)');
    expect(query).toContain('COUNT(confidence)');
    expect(query).not.toContain('LIMIT');
    expect(query).not.toContain('SELECT *');
  });
  it('groups unknown page labels once before computing rates and limiting', async () => {
    mockSql.mockResolvedValueOnce({ rows: [{ page_type: 'other', total_count: '5', ssr_count: '2', csr_count: '3', hybrid_count: '0', ssr_percentage: '40', csr_percentage: '60', hybrid_percentage: '0' }] });
    expect(await getPageTypeDistribution()).toEqual([{ page_type: 'other', total_count: 5, ssr_count: 2, csr_count: 3, hybrid_count: 0, ssr_percentage: 40, csr_percentage: 60, hybrid_percentage: 0 }]);
    const [parts, labels] = mockSql.mock.calls[0];
    const query = parts.join('?');
    expect(JSON.parse(labels)).toEqual(PAGE_TYPES);
    expect(query).toContain('WITH categorized_analyses AS');
    expect(query).toContain("ELSE 'other' END AS page_type");
    expect(query).toContain('FROM categorized_analyses');
    expect(query.indexOf("ELSE 'other'")).toBeLessThan(query.indexOf('GROUP BY page_type'));
  });
  it('uses validated flat connection first and legacy fallback before grouping device performance', async () => {
    mockSql.mockResolvedValueOnce({ rows: [{ device_type: 'desktop', connection_type: '3g', sample_count: '6', avg_lcp: '1000', avg_cls: '0.05', avg_ttfb: '100', pass_rate: '100' }] });
    expect((await getDevicePerformance())[0]).toMatchObject({ device_type: 'desktop', connection_type: '3g', sample_count: 6 });
    const [parts, devices, flat, legacy] = mockSql.mock.calls[0];
    expect(JSON.parse(devices)).toEqual(DEVICE_TYPES);
    expect(JSON.parse(flat)).toEqual(EFFECTIVE_TYPES);
    expect(JSON.parse(legacy)).toEqual(EFFECTIVE_TYPES);
    const query = parts.join('?');
    expect(query.indexOf("device_info->>'effectiveType'")).toBeLessThan(query.indexOf("device_info->'connection'->>'effectiveType'"));
    expect(query).toContain("ELSE 'unknown' END AS connection_type");
    expect(query).toContain("ELSE 'unknown' END AS device_type");
    expect(query.indexOf("ELSE 'unknown' END AS connection_type")).toBeLessThan(query.indexOf('GROUP BY device_type, connection_type'));
    expect(query).toContain('HAVING COUNT(*) >= 5');
  });
  it('groups unknown device labels before computing percentages', async () => {
    mockSql.mockResolvedValueOnce({ rows: [{ device_type: 'unknown', count: '5', percentage: '50' }] });
    expect(await getDeviceTypeSummary()).toEqual([{ device_type: 'unknown', count: 5, percentage: 50 }]);
    const [parts, labels] = mockSql.mock.calls[0];
    expect(JSON.parse(labels)).toEqual(DEVICE_TYPES);
    expect(parts.join('?')).toContain("ELSE 'unknown' END AS device_type");
  });
});

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
