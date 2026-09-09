import { describe, it, expect, beforeEach } from "vitest";

import "../navigation-detector.js";

function stubProbe(navigations) {
  window.HydrationDetector = {
    getProbeData: () => ({ navigations, hydrationErrors: [] }),
  };
}

describe("NavigationDetector", () => {
  it.each([0, 150, Number.MAX_SAFE_INTEGER])(
    "uses valid total %s and retains last-five timing-only output",
    (total) => {
      const navigations = Array.from({ length: 100 }, (_, i) => ({
        type: "pushState",
        time: i,
        source: "history",
        view: "/PRIVATE_SENTINEL/" + i,
      }));
      window.HydrationDetector = {
        getProbeData: () => ({ navigationCount: total, navigations }),
      };
      const result = window.NavigationDetector.detect();
      expect(result.clientRoutes).toBe(total);
      expect(result.routes).toEqual(
        navigations
          .slice(-5)
          .map(({ type, time, source }) => ({ type, time, source })),
      );
      expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
    },
  );
  it.each([
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    "150",
    null,
    undefined,
    {},
  ])("falls back for invalid total %j", (total) => {
    window.HydrationDetector = {
      getProbeData: () => ({
        navigationCount: total,
        navigations: [{}, {}, {}],
      }),
    };
    expect(window.NavigationDetector.detect().clientRoutes).toBe(3);
  });
  it("handles absent legacy samples safely", () => {
    window.HydrationDetector = { getProbeData: () => ({}) };
    expect(window.NavigationDetector.detect().clientRoutes).toBe(0);
  });
  beforeEach(() => {
    delete window.navigation;
    window.HydrationDetector = undefined;
  });

  describe("telemetry privacy", () => {
    it("should not emit page paths in routes", () => {
      stubProbe([
        {
          type: "pushState",
          view: "/account/orders/1234",
          time: 900,
          source: "history",
        },
        {
          type: "push",
          view: "/checkout",
          time: 1800,
          source: "navigation-api",
        },
      ]);

      const result = window.NavigationDetector.detect();

      expect(result.clientRoutes).toBe(2);
      expect(result.routes).toHaveLength(2);
      result.routes.forEach((route) =>
        expect(route).not.toHaveProperty("view"),
      );
      // The privacy policy lists page paths as not collected
      expect(JSON.stringify(result)).not.toContain("/checkout");
      expect(JSON.stringify(result)).not.toContain("/account/orders/1234");
    });

    it("should keep route type and timing", () => {
      stubProbe([
        { type: "pushState", view: "/a", time: 500, source: "history" },
      ]);

      const result = window.NavigationDetector.detect();

      expect(result.routes[0]).toEqual({
        type: "pushState",
        time: 500,
        source: "history",
      });
    });
  });

  describe("Navigation API entries", () => {
    it("should ignore cross-document entries when counting client routes", () => {
      // An ordinary same-origin MPA visit: two document loads, no SPA routing
      window.navigation = {
        entries: () => [{ sameDocument: false }, { sameDocument: true }],
      };
      stubProbe([]);

      const result = window.NavigationDetector.detect();

      expect(result.navigationApi.clientEntries).toBe(0);
      expect(result.isSPA).toBe(false);
    });

    it("should count same-document entries as client routing", () => {
      window.navigation = {
        entries: () => [
          { sameDocument: true },
          { sameDocument: true },
          { sameDocument: true },
        ],
      };
      stubProbe([]);

      const result = window.NavigationDetector.detect();

      expect(result.navigationApi.clientEntries).toBe(2);
      expect(result.isSPA).toBe(true);
    });

    it("should report the API as unsupported when absent", () => {
      stubProbe([]);

      const result = window.NavigationDetector.detect();

      expect(result.navigationApi).toEqual({
        supported: false,
        clientEntries: 0,
      });
    });
  });
});
