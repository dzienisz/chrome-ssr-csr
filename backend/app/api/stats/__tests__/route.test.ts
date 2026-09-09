import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.stubGlobal("React", React);
import { NextRequest } from "next/server";
import { sql } from "@vercel/postgres";
import { GET } from "../route";
import Dashboard from "@/app/dashboard/page";

vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }));
const mockSql = vi.mocked(sql);

beforeEach(() => {
  mockSql.mockImplementation(async (strings: TemplateStringsArray) => {
    const query = strings.join("");
    if (query.includes("ORDER BY timestamp DESC") && query.includes("OFFSET"))
      return {
        rows: [
          {
            id: 1,
            domain: "example.test",
            render_type: "SSR",
            confidence: 90,
            timestamp: new Date("2026-01-01"),
            url: "/PRIVATE_SENTINEL",
            frameworks: ["react"],
            hydration_stats: {
              errorCount: 1,
              score: 95,
              errors: ["PRIVATE_SENTINEL"],
            },
            navigation_stats: { isSPA: true, routes: ["PRIVATE_SENTINEL"] },
            seo_accessibility: { title: "PRIVATE_SENTINEL" },
          },
        ],
      } as unknown as Awaited<ReturnType<typeof sql>>;
    return { rows: [] } as unknown as Awaited<ReturnType<typeof sql>>;
  });
});

describe("stats public reads", () => {
  it.each(["recent", "all"])(
    "projects historical rows through %s",
    async (type) => {
      const response = await GET(
        new NextRequest("http://localhost/api/stats?type=" + type),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(JSON.stringify(body)).not.toContain("PRIVATE_SENTINEL");
      const rows = type === "recent" ? body : body.recent;
      expect(rows).toHaveLength(1);
      expect(rows[0].hydration_stats).toEqual({ errorCount: 1, score: 95 });
      expect(Object.keys(rows[0]).sort()).toEqual(
        [
          "id",
          "domain",
          "render_type",
          "confidence",
          "timestamp",
          "frameworks",
          "core_web_vitals",
          "tech_stack",
          "hydration_stats",
          "navigation_stats",
          "device_info",
        ].sort(),
      );
    },
  );
  it("passes only projected records to the SSR dashboard", async () => {
    const element = await Dashboard();
    expect(JSON.stringify(element.props)).not.toContain("PRIVATE_SENTINEL");
    expect(element.props.children.props.initialData.recent).toHaveLength(1);
  });
  for (const [key, values] of Object.entries({
    limit: ["0", "-1", "101", "1.5", "2junk", ""],
    offset: ["-1", "100001", "1.2", "1junk", ""],
    days: ["0", "-1", "366", "1.1", "1junk", ""],
  })) {
    it.each(values)(`rejects ${key}=%s before SQL`, async (value) => {
      const response = await GET(
        new NextRequest(
          `http://localhost/api/stats?type=recent&${key}=${value}`,
        ),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: "Invalid query parameters",
      });
      expect(mockSql).not.toHaveBeenCalled();
    });
  }
  it.each(["limit=1&offset=0&days=1", "limit=100&offset=100000&days=365"])(
    "accepts query bounds %s",
    async (query) => {
      expect(
        (
          await GET(
            new NextRequest("http://localhost/api/stats?type=recent&" + query),
          )
        ).status,
      ).toBe(200);
    },
  );
});
