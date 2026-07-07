import { describe, it, expect } from 'vitest';
import { classifyMetric } from '../cwv-thresholds';

describe('classifyMetric', () => {
  describe('lcp', () => {
    it('should rate a good value as good', () => {
      expect(classifyMetric('lcp', 1200)).toBe('good');
    });

    it('should rate a mid-range value as needs-improvement', () => {
      expect(classifyMetric('lcp', 3000)).toBe('needs-improvement');
    });

    it('should rate a high value as poor', () => {
      expect(classifyMetric('lcp', 5000)).toBe('poor');
    });

    it('should rate the good boundary as needs-improvement', () => {
      expect(classifyMetric('lcp', 2500)).toBe('needs-improvement');
    });

    it('should rate the poor boundary as poor', () => {
      expect(classifyMetric('lcp', 4000)).toBe('poor');
    });
  });

  describe('cls', () => {
    it('should rate a good value as good', () => {
      expect(classifyMetric('cls', 0.05)).toBe('good');
    });

    it('should rate a mid-range value as needs-improvement', () => {
      expect(classifyMetric('cls', 0.15)).toBe('needs-improvement');
    });

    it('should rate a high value as poor', () => {
      expect(classifyMetric('cls', 0.3)).toBe('poor');
    });

    it('should rate the good boundary as needs-improvement', () => {
      expect(classifyMetric('cls', 0.1)).toBe('needs-improvement');
    });

    it('should rate the poor boundary as poor', () => {
      expect(classifyMetric('cls', 0.25)).toBe('poor');
    });
  });
});
