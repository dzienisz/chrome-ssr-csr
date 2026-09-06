import { describe, it, expect } from 'vitest';

import '../platform-detector.js';

function parseRaw(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('detectPlatformSignals', () => {
  describe('speculation rules', () => {
    it('should credit speculation rules found in the raw HTML', () => {
      const html = `<script type="speculationrules">
        {"prerender":[{"where":{"href_matches":"/*"}}]}
      </script><main>Article</main>`;

      const result = window.detectPlatformSignals(parseRaw(html), html);

      expect(result.details.speculationRules).toBe(1);
      expect(result.ssrScore).toBe(window.DETECTOR_CONFIG.scoring.speculationRules);
      expect(result.indicators.some(i => i.includes('multi-page'))).toBe(true);
    });

    it('should ignore speculation rules when there is no raw document', () => {
      const result = window.detectPlatformSignals(null, null);

      expect(result.details.speculationRules).toBeUndefined();
      expect(result.ssrScore).toBe(0);
    });
  });

  describe('cross-document view transitions', () => {
    it('should credit the @view-transition navigation rule', () => {
      const html = '<style>@view-transition { navigation: auto; }</style><main>Page</main>';

      const result = window.detectPlatformSignals(parseRaw(html), html);

      expect(result.details.crossDocumentViewTransitions).toBe(true);
      expect(result.ssrScore).toBe(window.DETECTOR_CONFIG.scoring.crossDocViewTransition);
    });

    it('should not fire on same-document view transition styling alone', () => {
      const html = '<style>::view-transition-old(root) { animation: none; }</style>';

      const result = window.detectPlatformSignals(parseRaw(html), html);

      expect(result.details.crossDocumentViewTransitions).toBeUndefined();
      expect(result.ssrScore).toBe(0);
    });
  });

  describe('declarative partial updates', () => {
    it('should detect out-of-order streaming markers with their templates', () => {
      const html = '<div><?start slot?><p>placeholder</p><?end?></div>' +
                   '<template for="slot"><p>streamed in</p></template>';

      const result = window.detectPlatformSignals(parseRaw(html), html);

      expect(result.details.declarativePartialUpdates).toBe(true);
      expect(result.ssrScore).toBe(window.DETECTOR_CONFIG.scoring.declarativePartialUpdate);
    });

    it('should not fire on a plain template element', () => {
      const html = '<template id="row"><li></li></template>';

      const result = window.detectPlatformSignals(parseRaw(html), html);

      expect(result.details.declarativePartialUpdates).toBeUndefined();
      expect(result.ssrScore).toBe(0);
    });
  });

  describe('navigation context', () => {
    it('should report a normal navigation as reliable', () => {
      global.performance.getEntriesByType = () => [
        { activationStart: 0, deliveryType: '' }
      ];

      const context = window.getNavigationContext();

      expect(context.wasPrerendered).toBe(false);
      expect(context.wasPrefetched).toBe(false);
      expect(context.timingIsReliable).toBe(true);
    });

    it('should flag an activated prerender as unreliable for timing', () => {
      global.performance.getEntriesByType = () => [
        { activationStart: 1200, deliveryType: '' }
      ];

      const context = window.getNavigationContext();

      expect(context.wasPrerendered).toBe(true);
      expect(context.activationStart).toBe(1200);
      expect(context.timingIsReliable).toBe(false);
    });

    it('should flag a prefetched navigation as unreliable for timing', () => {
      global.performance.getEntriesByType = () => [
        { activationStart: 0, deliveryType: 'navigational-prefetch' }
      ];

      const context = window.getNavigationContext();

      expect(context.wasPrefetched).toBe(true);
      expect(context.timingIsReliable).toBe(false);
    });
  });
});
