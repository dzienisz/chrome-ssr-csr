import { sql } from "@vercel/postgres";
import { afterEach, describe, expect, it, vi } from "vitest";
import { insertAnalysis, type AnalysisRecord } from "../db";

const mockSql = sql as unknown as ReturnType<typeof vi.fn>;

const data: AnalysisRecord = {
  url: "https://example.com",
  domain: "example.com",
  render_type: "SSR",
  confidence: 85,
  frameworks: [],
  performance_metrics: {},
  indicators: [],
  extension_version: "5.0.0",
  algorithm_version: 5,
  confidence_level: "high",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("optional analysis columns", () => {
  it("falls back to the legacy insert when ALTER fails and retries later", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockSql.mockRejectedValueOnce(new Error("ALTER denied"));
    mockSql.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    mockSql.mockResolvedValueOnce({ rows: [] });
    mockSql.mockResolvedValueOnce({ rows: [] });
    mockSql.mockResolvedValueOnce({ rows: [{ id: 2 }] });

    await expect(insertAnalysis(data)).resolves.toEqual({ id: 1 });
    await expect(insertAnalysis(data)).resolves.toEqual({ id: 2 });

    expect(warning).toHaveBeenCalledOnce();
    expect(mockSql).toHaveBeenCalledTimes(5);
    const query = (index: number) => mockSql.mock.calls[index][0].join("");
    expect(query(0)).toContain("ADD COLUMN IF NOT EXISTS algorithm_version");
    expect(query(1)).toContain("INSERT INTO analyses");
    expect(query(1)).not.toContain("algorithm_version");
    expect(query(1)).not.toContain("confidence_level");
    expect(query(2)).toContain("ADD COLUMN IF NOT EXISTS algorithm_version");
    expect(query(3)).toContain("ADD COLUMN IF NOT EXISTS confidence_level");
    expect(query(4)).toContain("algorithm_version, confidence_level");
  });
});
