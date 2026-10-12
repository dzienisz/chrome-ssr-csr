import { sql } from "@vercel/postgres";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getRecentAnalyses } from "../db";

const mockSql = sql as unknown as ReturnType<typeof vi.fn>;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("optional analysis columns on recent reads", () => {
  it("uses the legacy query when ALTER fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockSql.mockRejectedValueOnce(new Error("ALTER denied"));
    mockSql.mockResolvedValueOnce({
      rows: [
        {
          id: 8,
          domain: "example.test",
          render_type: "SSR",
          confidence: 90,
          timestamp: "2026-01-01T00:00:00.000Z",
          frameworks: [],
        },
      ],
    });

    const result = await getRecentAnalyses();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 8,
      domain: "example.test",
      algorithm_version: null,
      confidence_level: null,
    });
    expect(warning).toHaveBeenCalledOnce();
    expect(mockSql).toHaveBeenCalledTimes(2);
    const select = mockSql.mock.calls[1][0].join("");
    expect(select).toContain("SELECT id, domain");
    expect(select).not.toContain("algorithm_version");
    expect(select).not.toContain("confidence_level");
  });
});
