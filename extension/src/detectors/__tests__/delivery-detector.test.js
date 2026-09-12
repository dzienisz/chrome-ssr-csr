import { describe, it, expect, beforeEach, vi } from "vitest";

import "../delivery-detector.js";

/** Headers as the comparison fetch hands them over: lowercased keys. */
function run(headers) {
  return window.detectDelivery(headers);
}

describe("detectDelivery", () => {
  beforeEach(() => {
    global.performance.getEntriesByType = vi.fn(() => []);
  });

  describe("mode classification", () => {
    it("reports a Next.js prerender as built ahead of the request", () => {
      const { details } = run({ "x-nextjs-prerender": "1", "x-vercel-id": "fra1::abc" });

      expect(details.delivery.mode).toBe("prerendered");
      expect(details.delivery.cdn).toBe("Vercel");
    });

    it("reports a warm CDN cache hit as edge-cached", () => {
      const { details } = run({ "x-vercel-cache": "HIT", age: "120" });

      expect(details.delivery.mode).toBe("edge-cached");
      expect(details.delivery.cacheState).toBe("HIT");
      expect(details.delivery.age).toBe(120);
    });

    it("treats a STALE hit as edge-cached and says so", () => {
      const { details } = run({ "cf-cache-status": "STALE", "cf-ray": "abc" });

      expect(details.delivery.mode).toBe("edge-cached");
      expect(details.delivery.modeLabel).toMatch(/stale/i);
    });

    it("reports a cache miss as an origin render", () => {
      const { details } = run({ "cf-cache-status": "MISS", "cf-ray": "abc" });

      expect(details.delivery.mode).toBe("origin");
    });

    it("reports no-store as a dynamic response", () => {
      const { details } = run({ "cache-control": "private, no-store" });

      expect(details.delivery.mode).toBe("dynamic");
    });

    it("treats s-maxage without a cache header as edge-cacheable", () => {
      const { details } = run({ "cache-control": "public, s-maxage=600" });

      expect(details.delivery.mode).toBe("edge-cached");
      expect(details.delivery.sMaxAge).toBe(600);
    });

    // `public, max-age=0, s-maxage=86400` is the canonical ISR header pair:
    // browsers revalidate, shared caches hold it for a day. Reading the
    // max-age=0 first would file every incrementally regenerated page under
    // "dynamic" — the opposite of what those headers mean.
    it("does not let max-age=0 mask a positive s-maxage", () => {
      const { details } = run({
        "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=59",
      });

      expect(details.delivery.mode).toBe("edge-cached");
      expect(details.delivery.sMaxAge).toBe(86400);
    });

    it("still treats a bare max-age=0 as revalidate-on-every-visit", () => {
      const { details } = run({ "cache-control": "public, max-age=0" });

      expect(details.delivery.mode).toBe("dynamic");
      expect(details.delivery.modeLabel).toMatch(/revalidat/i);
    });

    it("keeps no-store and private as dynamic overrides even with s-maxage", () => {
      expect(run({ "cache-control": "no-store, s-maxage=600" }).details.delivery.mode).toBe(
        "dynamic",
      );
      expect(run({ "cache-control": "private, s-maxage=600" }).details.delivery.mode).toBe(
        "dynamic",
      );
    });

    it("treats vary: cookie as a per-visitor response", () => {
      const { details } = run({ vary: "Cookie, Accept-Encoding" });

      expect(details.delivery.mode).toBe("dynamic");
      expect(details.delivery.modeLabel).toMatch(/per-visitor/i);
    });

    it("treats a validator pair with no cache directives as a static file", () => {
      const { details } = run({ etag: '"abc"', "last-modified": "Tue, 02 Sep 2026 10:00:00 GMT" });

      expect(details.delivery.mode).toBe("static");
    });

    it("stays at unknown when the response says nothing useful", () => {
      const { details } = run({ "content-type": "text/html" });

      expect(details.delivery.mode).toBe("unknown");
    });

    it("marks delivery unavailable when there are no headers at all", () => {
      const { details, signals } = run(null);

      expect(details.delivery.available).toBe(false);
      expect(signals).toEqual([]);
    });
  });

  describe("host and runtime identification", () => {
    const cases = [
      [{ "x-vercel-id": "1" }, "Vercel"],
      [{ "x-nf-request-id": "1" }, "Netlify"],
      [{ "cf-ray": "1" }, "Cloudflare"],
      [{ "x-served-by": "cache-fra-1" }, "Fastly"],
      [{ "x-amz-cf-id": "1" }, "CloudFront"],
      [{ server: "GitHub.com", "x-github-request-id": "1" }, "GitHub Pages"],
      [{ "fly-request-id": "1" }, "Fly.io"],
      [{ "x-fh-requestid": "1" }, "Firebase Hosting"],
    ];

    it.each(cases)("identifies %o as %s", (headers, expected) => {
      expect(run(headers).details.delivery.cdn).toBe(expected);
    });

    it("identifies the origin runtime from x-powered-by", () => {
      expect(run({ "x-powered-by": "Next.js" }).details.delivery.runtime).toBe("Next.js");
      expect(run({ "x-powered-by": "PHP/8.2.1" }).details.delivery.runtime).toBe("PHP");
      expect(run({ server: "nginx/1.25" }).details.delivery.runtime).toBe("nginx");
    });
  });

  describe("scoring", () => {
    it("never moves the SSR/CSR score", () => {
      const result = run({ "x-vercel-cache": "HIT", age: "500", "x-nextjs-prerender": "1" });

      expect(result.ssrScore).toBe(0);
      expect(result.csrScore).toBe(0);
    });

    it("never adds to the scored indicator channel", () => {
      expect(run({ "cf-cache-status": "HIT", "cf-ray": "x" }).indicators).toEqual([]);
    });

    it("emits only informational signals", () => {
      const { signals } = run({ "x-vercel-cache": "MISS", "x-vercel-id": "1" });

      expect(signals.length).toBeGreaterThan(0);
      expect(signals.every((signal) => signal.impact === "info")).toBe(true);
      expect(signals.every((signal) => signal.weight === 0)).toBe(true);
    });
  });

  describe("navigation timings", () => {
    it("rebases TTFB on activationStart so a prerender is not reported as instant", () => {
      global.performance.getEntriesByType = vi.fn(() => [
        { responseStart: 900, activationStart: 800, serverTiming: [] },
      ]);

      expect(run({ "cache-control": "no-store" }).details.delivery.ttfb).toBe(100);
    });

    it("ignores a non-positive TTFB rather than reporting a nonsense number", () => {
      global.performance.getEntriesByType = vi.fn(() => [
        { responseStart: 100, activationStart: 400, serverTiming: [] },
      ]);

      expect(run({ "cache-control": "no-store" }).details.delivery.ttfb).toBeNull();
    });

    it("passes Server-Timing entries through", () => {
      global.performance.getEntriesByType = vi.fn(() => [
        {
          responseStart: 120,
          activationStart: 0,
          serverTiming: [{ name: "cache", duration: 3.7, description: "HIT" }],
        },
      ]);

      const { serverTiming } = run({ "cache-control": "no-store" }).details.delivery;
      expect(serverTiming).toEqual([{ name: "cache", duration: 4, description: "HIT" }]);
    });
  });

  describe("parseCacheControl", () => {
    it("reads the directives that decide the mode", () => {
      const parsed = window.parseCacheControl(
        "public, max-age=0, s-maxage=86400, stale-while-revalidate=59, immutable",
      );

      expect(parsed).toMatchObject({
        maxAge: 0,
        sMaxAge: 86400,
        revalidate: 59,
        immutable: true,
        noStore: false,
        private: false,
      });
    });

    it("does not read s-maxage as max-age", () => {
      expect(window.parseCacheControl("s-maxage=600").maxAge).toBeNull();
    });

    it("returns empty directives for a missing header", () => {
      expect(window.parseCacheControl(undefined).sMaxAge).toBeNull();
    });
  });

  describe("normalizeCacheState", () => {
    it.each([
      ["HIT", "HIT"],
      ["Hit from cloudfront", "HIT"],
      ["MISS", "MISS"],
      ["REVALIDATED", "STALE"],
      ["DYNAMIC", "BYPASS"],
      ["PRERENDER", "PRERENDER"],
    ])("normalizes %s to %s", (input, expected) => {
      expect(window.normalizeCacheState(input)).toBe(expected);
    });

    it("returns null for something it does not recognize", () => {
      expect(window.normalizeCacheState("banana")).toBeNull();
    });
  });
});
