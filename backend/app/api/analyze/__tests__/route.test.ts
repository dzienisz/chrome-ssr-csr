import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  insertAnalysis: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyApiKey: vi.fn(),
}));

vi.mock("@/lib/cors", () => ({
  getCorsHeaders: vi.fn(() => ({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  })),
  corsOptionsResponse: vi.fn(),
}));

import { insertAnalysis } from "@/lib/db";
import { verifyApiKey } from "@/lib/auth";

const mockInsertAnalysis = insertAnalysis as ReturnType<typeof vi.fn>;
const mockVerifyApiKey = verifyApiKey as ReturnType<typeof vi.fn>;

function createRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyApiKey.mockReturnValue(true);
  });

  describe("authentication", () => {
    it("should return 401 when API key verification fails", async () => {
      mockVerifyApiKey.mockReturnValue(false);

      const request = createRequest({
        url: "https://example.com",
        domain: "example.com",
        renderType: "SSR",
        confidence: 85,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("validation", () => {
    it("should return 400 when url is missing", async () => {
      const request = createRequest({
        domain: "example.com",
        renderType: "SSR",
        confidence: 85,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid telemetry");
    });

    it("should return 400 when domain is missing", async () => {
      const request = createRequest({
        url: "https://example.com",
        renderType: "SSR",
        confidence: 85,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid telemetry");
    });

    it("should return 400 when renderType is missing", async () => {
      const request = createRequest({
        url: "https://example.com",
        domain: "example.com",
        confidence: 85,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid telemetry");
    });

    it("should return 400 when confidence is missing", async () => {
      const request = createRequest({
        url: "https://example.com",
        domain: "example.com",
        renderType: "SSR",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid telemetry");
    });

    it("should return 400 when confidence is not a number", async () => {
      const request = createRequest({
        url: "https://example.com",
        domain: "example.com",
        renderType: "SSR",
        confidence: "high",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid telemetry");
    });

    it("should return 400 when confidence is negative", async () => {
      const request = createRequest({
        url: "https://example.com",
        domain: "example.com",
        renderType: "SSR",
        confidence: -5,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid telemetry");
    });

    it("should return 400 when confidence is above 100", async () => {
      const request = createRequest({
        url: "https://example.com",
        domain: "example.com",
        renderType: "SSR",
        confidence: 150,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid telemetry");
    });
  });

  describe("success cases", () => {
    it("should insert analysis and return success", async () => {
      mockInsertAnalysis.mockResolvedValue({ id: 123 });

      const request = createRequest({
        url: "https://example.com/page",
        domain: "example.com",
        renderType: "Server-Side Rendered (SSR)",
        confidence: 85,
        frameworks: ["react", "nextjs"],
        indicators: ["framework hydration markers"],
        version: "3.5.0",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.id).toBe(123);
      expect(mockInsertAnalysis).toHaveBeenCalled();
    });

    it("should handle minimal required fields", async () => {
      mockInsertAnalysis.mockResolvedValue({ id: 456 });

      const request = createRequest({
        url: "https://example.com",
        domain: "example.com",
        renderType: "CSR",
        confidence: 70,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle all optional Phase 1-3 fields", async () => {
      mockInsertAnalysis.mockResolvedValue({ id: 789 });

      const request = createRequest({
        url: "https://example.com",
        domain: "example.com",
        renderType: "SSR",
        confidence: 90,
        frameworks: ["nextjs"],
        indicators: ["SSR markers"],
        version: "3.5.0",
        performanceMetrics: {
          domReady: 150,
          fcp: 300,
          contentRatio: 0.85,
        },
        coreWebVitals: {
          lcp: 1500,
          cls: 0.05,
          ttfb: 200,
        },
        pageType: "blog",
        deviceInfo: {
          deviceType: "desktop",
          browserName: "Chrome",
        },
        techStack: {
          cssFramework: "Tailwind",
          buildTool: "Webpack",
        },
        seoAccessibility: {
          seo: { hasMetaDescription: true, hasCanonicalURL: true },
        },
        hydrationData: {
          errorCount: 0,
          score: 100,
        },
        navigationData: {
          isSPA: true,
          clientRoutes: 5,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockInsertAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://example.com",
          domain: "example.com",
          render_type: "SSR",
          confidence: 90,
          core_web_vitals: { lcp: 1500, cls: 0.05, ttfb: 200 },
          tech_stack: { cssFramework: "Tailwind", buildTool: "Webpack" },
        }),
      );
    });
  });

  describe("privacy boundary", () => {
    it('stores country-only enrichment for a client without device information', async () => {
      const response = await POST(createRequest({ url: 'https://example.test', domain: 'example.test', renderType: 'SSR', confidence: 90 }, { 'x-vercel-ip-country': 'pl' }));
      expect(response.status).toBe(200);
      expect(mockInsertAnalysis).toHaveBeenCalledWith(expect.objectContaining({ device_info: { country: 'PL' } }));
    });
    it.each([101, 140])(
      "inserts hybrid points %s without clamping",
      async (hybridScore) => {
        const response = await POST(
          createRequest({
            url: "https://example.test",
            domain: "example.test",
            renderType: "Hybrid/Islands Architecture",
            confidence: 90,
            performanceMetrics: { hybridScore },
          }),
        );
        expect(response.status).toBe(200);
        expect(mockInsertAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({ performance_metrics: { hybridScore } }),
        );
      },
    );
    beforeEach(() => mockInsertAnalysis.mockResolvedValue({ id: 1 }));

    it("normalizes URL and strips raw nested data even for older clients", async () => {
      const response = await POST(
        createRequest(
          {
            url: "https://EXAMPLE.test/SENTINEL?q=SENTINEL#SENTINEL",
            domain: "other.test",
            renderType: "SSR",
            confidence: 0,
            indicators: ["SENTINEL"],
            hydrationData: { errorCount: 1, score: 80, errors: ["SENTINEL"] },
            navigationData: {
              isSPA: true,
              clientRoutes: 1,
              routes: ["SENTINEL"],
            },
            seoAccessibility: { title: "SENTINEL" },
          },
          { "user-agent": "SENTINEL" },
        ),
      );
      expect(response.status).toBe(200);
      expect(JSON.stringify(mockInsertAnalysis.mock.calls)).not.toContain(
        "SENTINEL",
      );
      expect(mockInsertAnalysis.mock.calls[0][0]).toMatchObject({
        url: "https://example.test",
        domain: "example.test",
        confidence: 0,
        indicators: [],
      });
    });

    it.each(
      [
        null,
        [],
        { url: 12, domain: "example.test", renderType: "SSR", confidence: 10 },
        {
          url: "https://example.test",
          domain: "example.test",
          renderType: "SSR",
          confidence: 10,
          coreWebVitals: { lcp: "SENTINEL" },
        },
      ].map((body) => ({ body })),
    )("rejects malformed payload %j without insertion", async ({ body }) => {
      const response = await POST(createRequest(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        success: false,
        error: "Invalid telemetry",
      });
      expect(mockInsertAnalysis).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid JSON", async () => {
      const response = await POST(
        new NextRequest("http://localhost/api/analyze", {
          method: "POST",
          body: "{SENTINEL",
        }),
      );
      expect(response.status).toBe(400);
      expect(JSON.stringify(await response.json())).not.toContain("SENTINEL");
      expect(mockInsertAnalysis).not.toHaveBeenCalled();
    });

    it.each([{}, { "Content-Length": "1" }])(
      "enforces streaming UTF-8 byte cap with headers %j",
      async (headers) => {
        const cancel = vi.fn();
        let chunks = 0;
        const stream = new ReadableStream({
          pull(controller) {
            if (++chunks > 4) controller.close();
            else
              controller.enqueue(new TextEncoder().encode("é".repeat(20000)));
          },
          cancel,
        });
        const request = new NextRequest("http://localhost/api/analyze", {
          method: "POST",
          headers,
          body: stream,
          duplex: "half",
        } as ConstructorParameters<typeof NextRequest>[1]);
        const response = await POST(request);
        expect(response.status).toBe(413);
        expect(cancel).toHaveBeenCalledOnce();
        expect(mockInsertAnalysis).not.toHaveBeenCalled();
      },
    );
  });

  describe("error handling", () => {
    it("should return 500 on database error", async () => {
      mockInsertAnalysis.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = createRequest({
        url: "https://example.com",
        domain: "example.com",
        renderType: "SSR",
        confidence: 85,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });
  });
});
