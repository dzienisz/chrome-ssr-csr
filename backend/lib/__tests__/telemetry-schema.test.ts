import { describe, expect, it } from "vitest";
import { parseTelemetry, RENDER_TYPES } from "../telemetry-schema";

const base = {
  url: "https://Example.test/private?q=SENTINEL#SENTINEL",
  domain: "different.test",
  renderType: "SSR",
  confidence: 0,
};

describe("telemetry ingress projection", () => {
  it.each([undefined, null])('retains server country without deviceInfo %s', deviceInfo => {
    expect(parseTelemetry({ ...base, deviceInfo }, 'pl').device_info).toEqual({ country: 'PL' });
  });
  it.each([undefined, null, 'bad', 'P1'])('keeps device info null without valid server country %s', country => {
    expect(parseTelemetry(base, country).device_info).toBeNull();
  });
  it('ignores submitted country regardless of server enrichment', () => {
    expect(parseTelemetry({ ...base, deviceInfo: { country: 'US' } }, 'PL').device_info).toEqual({ country: 'PL' });
    expect(parseTelemetry({ ...base, deviceInfo: { country: 'US' } }).device_info).toEqual({ country: null });
  });
  it.each([0, 101, 140, 140.5, Number.MAX_SAFE_INTEGER])(
    "preserves unnormalized hybrid points %s",
    (hybridScore) => {
      expect(
        parseTelemetry({ ...base, performanceMetrics: { hybridScore } })
          .performance_metrics?.hybridScore,
      ).toBe(hybridScore);
    },
  );
  it.each([-1, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid hybrid points %s",
    (hybridScore) => {
      expect(() =>
        parseTelemetry({ ...base, performanceMetrics: { hybridScore } }),
      ).toThrow("Invalid telemetry");
    },
  );
  it.each(["https://[::1]/private", "https://example.test./private"])(
    "accepts valid HTTP host forms %s",
    (url) => {
      expect(parseTelemetry({ ...base, url }).domain).toBe(
        new URL(url).hostname,
      );
    },
  );
  it.each([
    "SSR",
    "CSR",
    "Hybrid",
    "Mixed",
    "Server-Side Rendered (SSR)",
    "Client-Side Rendered (CSR)",
    "Likely SSR with Hydration",
    "Likely CSR/SPA",
    "Hybrid/Islands Architecture",
    "Hybrid/Mixed Rendering",
  ])("accepts %s and zero confidence", (renderType) => {
    const result = parseTelemetry({ ...base, renderType });
    expect(result.url).toBe("https://example.test");
    expect(result.domain).toBe("example.test");
    expect(result.confidence).toBe(0);
    expect(RENDER_TYPES).toContain(renderType);
  });
  it("accepts all current groups while excluding raw and unknown fields", () => {
    const result = parseTelemetry(
      {
        ...base,
        confidence: 100,
        version: "3.11.2",
        frameworks: ["React", "Next.js", "react", "SENTINEL"],
        pageType: "blog",
        indicators: ["SENTINEL"],
        performanceMetrics: {
          domReady: 1,
          fcp: 2,
          contentRatio: 0.5,
          rawHtmlLength: 10,
          renderedLength: 20,
          hybridScore: 100,
        },
        coreWebVitals: {
          lcp: 1,
          cls: 0.1,
          inp: null,
          fid: 1,
          ttfb: 2,
          tti: 3,
          tbt: 4,
          pageLoadTime: 5,
          resourceCount: 6,
          totalTransferSize: 7,
          cachedResources: 1,
          cacheHitRate: 100,
          loafCount: 1,
          loafBlockingDuration: 0,
          loafLongestFrame: 50,
        },
        deviceInfo: {
          deviceType: "desktop",
          screenWidth: 1920,
          screenHeight: 1080,
          devicePixelRatio: 2,
          isTouchDevice: false,
          browserName: "Chrome",
          browserVersion: "151.0",
          engineName: "Blink",
          connectionType: "wifi",
          effectiveType: "4g",
          downlink: null,
          rtt: 10,
          saveData: false,
          timezone: "Europe/Warsaw",
          language: "pl-PL",
          prefersReducedMotion: false,
          prefersDarkMode: true,
          cpuCores: 8,
          country: "SENTINEL",
          userAgent: "SENTINEL",
        },
        techStack: {
          cssFramework: "Tailwind",
          stateManagement: ["Redux"],
          buildTool: "Vite",
          hosting: "Vercel",
          cdn: "Cloudflare",
          globalVariables: ["React (Global)"],
        },
        seoAccessibility: {
          seo: {
            titleLength: 10,
            hasMetaDescription: true,
            title: "SENTINEL",
            structuredDataTypes: ["SENTINEL"],
          },
          accessibility: {
            altTextCoverage: 100,
            hasSkipLinks: false,
            language: "SENTINEL",
          },
        },
        hydrationData: {
          errorCount: 2,
          score: 60,
          errors: [{ message: "SENTINEL" }],
        },
        navigationData: {
          isSPA: true,
          clientRoutes: 2,
          routes: ["SENTINEL"],
          softNavigations: { supported: true, count: 1, entries: ["SENTINEL"] },
          navigationApi: { supported: true, clientEntries: 1 },
        },
      },
      "PL",
    );
    expect(JSON.stringify(result)).not.toContain("SENTINEL");
    expect(result.frameworks).toEqual(["react", "nextjs"]);
    expect(result.indicators).toEqual([]);
    expect(result).not.toHaveProperty("user_agent");
    expect(result.hydration_stats).toEqual({ errorCount: 2, score: 60 });
    expect(result.device_info?.country).toBe("PL");
    expect(result.navigation_stats).toEqual({
      isSPA: true,
      clientRoutes: 2,
      softNavigations: { supported: true, count: 1 },
      navigationApi: { supported: true, clientEntries: 1 },
    });
  });
  it("normalizes IDN, unknown classifications and version", () => {
    const result = parseTelemetry({
      ...base,
      url: "https://BÜCHER.example/path",
      pageType: "SENTINEL",
      version: "SENTINEL",
    });
    expect(result.domain).toBe("xn--bcher-kva.example");
    expect(result.page_type).toBe("other");
    expect(result.extension_version).toBe("unknown");
  });
  for (const group of [
    "performanceMetrics",
    "coreWebVitals",
    "deviceInfo",
    "techStack",
    "seoAccessibility",
    "hydrationData",
    "navigationData",
  ]) {
    it.each([[], "bad", 1, true].map((value) => ({ value })))(
      `rejects invalid ${group}: %j`,
      ({ value }) => {
        expect(() => parseTelemetry({ ...base, [group]: value })).toThrow(
          "Invalid telemetry",
        );
      },
    );
    it(`accepts missing/null ${group}`, () => {
      expect(() => parseTelemetry({ ...base, [group]: null })).not.toThrow();
      expect(() => parseTelemetry(base)).not.toThrow();
    });
  }
  it.each([null, [], "bad", 5].map((value) => ({ value })))(
    "rejects root %j",
    ({ value }) => expect(() => parseTelemetry(value)).toThrow(),
  );
  it.each([
    { url: 12 },
    { url: "/relative" },
    { url: "file:///etc/file" },
    { url: "https://u:p@example.test" },
    { url: `https://${"a".repeat(64)}.test` },
    { domain: 3 },
    { renderType: "Analysis Error" },
    { renderType: "SENTINEL" },
    { confidence: null },
    { confidence: NaN },
    { confidence: Infinity },
    { confidence: -1 },
    { confidence: 101 },
    { confidence: "1" },
    { frameworks: "react" },
    { frameworks: [1] },
    { frameworks: Array(33).fill("react") },
    { coreWebVitals: { lcp: "2" } },
    { coreWebVitals: { lcp: Infinity } },
    { coreWebVitals: { resourceCount: 0.5 } },
    { coreWebVitals: { cacheHitRate: 101 } },
    { performanceMetrics: { domReady: null } },
    { performanceMetrics: { rawHtmlLength: -1 } },
    { hydrationData: { score: 101 } },
    { hydrationData: { errorCount: 1.5 } },
    { hydrationData: { errorCount: Number.MAX_SAFE_INTEGER + 1 } },
    { hydrationData: { score: -1 } },
    { navigationData: { isSPA: 1 } },
    { navigationData: { softNavigations: [] } },
    { navigationData: { navigationApi: { clientEntries: -1 } } },
    { deviceInfo: { language: "not a locale" } },
    { deviceInfo: { timezone: "SENTINEL" } },
    { deviceInfo: { browserVersion: "SENTINEL" } },
    { deviceInfo: { browserName: "SENTINEL" } },
    { deviceInfo: { screenWidth: -1 } },
    { deviceInfo: { isTouchDevice: "false" } },
    { techStack: { cssFramework: "SENTINEL" } },
    { techStack: { stateManagement: ["SENTINEL"] } },
    { seoAccessibility: { seo: { titleLength: "2" } } },
    { seoAccessibility: { accessibility: { altTextCoverage: 101 } } },
  ])("rejects malformed retained fields %j", (patch) =>
    expect(() => parseTelemetry({ ...base, ...patch })).toThrow(
      "Invalid telemetry",
    ),
  );
  it("accepts safe numeric upper bounds, unknown browser version and null optional metrics", () => {
    const result = parseTelemetry(
      {
        ...base,
        hydrationData: { errorCount: Number.MAX_SAFE_INTEGER, score: 0 },
        coreWebVitals: { lcp: Number.MAX_SAFE_INTEGER, cls: null },
        deviceInfo: {
          browserVersion: "Unknown",
          downlink: null,
          cpuCores: null,
        },
      },
      "INVALID",
    );
    expect(result.device_info?.country).toBeNull();
    expect(result.device_info?.browserVersion).toBe("unknown");
    expect(result.core_web_vitals).toEqual({
      lcp: Number.MAX_SAFE_INTEGER,
      cls: null,
    });
  });
});
