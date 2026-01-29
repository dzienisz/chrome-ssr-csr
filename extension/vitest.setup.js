import { vi, beforeEach } from 'vitest';

// Load the config module
import CONFIG from './src/core/config.js';

// Polyfill innerText for jsdom (it doesn't implement innerText)
if (!('innerText' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'innerText', {
    get() {
      return this.textContent;
    },
    set(value) {
      this.textContent = value;
    }
  });
}

// Setup browser globals
beforeEach(() => {
  // Reset document
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // Make CONFIG available on window
  window.DETECTOR_CONFIG = CONFIG;

  // Mock fetch
  global.fetch = vi.fn();

  // Mock PerformanceObserver
  global.PerformanceObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => [])
  }));

  // Mock performance.getEntriesByType
  global.performance.getEntriesByType = vi.fn(() => []);

  // Mock navigator
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
      connection: {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50
      }
    },
    writable: true
  });
});
