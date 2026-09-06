import { describe, it, expect, beforeEach } from 'vitest';

import '../navigation-detector.js';

function stubProbe(navigations) {
  window.HydrationDetector = {
    getProbeData: () => ({ navigations, hydrationErrors: [] })
  };
}

describe('NavigationDetector', () => {
  beforeEach(() => {
    delete window.navigation;
    window.HydrationDetector = undefined;
  });

  describe('telemetry privacy', () => {
    it('should not emit page paths in routes', () => {
      stubProbe([
        { type: 'pushState', view: '/account/orders/1234', time: 900, source: 'history' },
        { type: 'push', view: '/checkout', time: 1800, source: 'navigation-api' }
      ]);

      const result = window.NavigationDetector.detect();

      expect(result.clientRoutes).toBe(2);
      expect(result.routes).toHaveLength(2);
      result.routes.forEach(route => expect(route).not.toHaveProperty('view'));
      // The privacy policy lists page paths as not collected
      expect(JSON.stringify(result)).not.toContain('/checkout');
      expect(JSON.stringify(result)).not.toContain('/account/orders/1234');
    });

    it('should keep route type and timing', () => {
      stubProbe([{ type: 'pushState', view: '/a', time: 500, source: 'history' }]);

      const result = window.NavigationDetector.detect();

      expect(result.routes[0]).toEqual({ type: 'pushState', time: 500, source: 'history' });
    });
  });

  describe('Navigation API entries', () => {
    it('should ignore cross-document entries when counting client routes', () => {
      // An ordinary same-origin MPA visit: two document loads, no SPA routing
      window.navigation = {
        entries: () => [
          { sameDocument: false },
          { sameDocument: true }
        ]
      };
      stubProbe([]);

      const result = window.NavigationDetector.detect();

      expect(result.navigationApi.clientEntries).toBe(0);
      expect(result.isSPA).toBe(false);
    });

    it('should count same-document entries as client routing', () => {
      window.navigation = {
        entries: () => [
          { sameDocument: true },
          { sameDocument: true },
          { sameDocument: true }
        ]
      };
      stubProbe([]);

      const result = window.NavigationDetector.detect();

      expect(result.navigationApi.clientEntries).toBe(2);
      expect(result.isSPA).toBe(true);
    });

    it('should report the API as unsupported when absent', () => {
      stubProbe([]);

      const result = window.NavigationDetector.detect();

      expect(result.navigationApi).toEqual({ supported: false, clientEntries: 0 });
    });
  });
});
