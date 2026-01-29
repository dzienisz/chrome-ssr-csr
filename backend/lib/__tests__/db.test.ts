import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sql } from '@vercel/postgres';
import {
  insertAnalysis,
  getTotalStats,
  getRecentAnalyses,
  deleteAnalysis,
  AnalysisRecord
} from '../db';

// Mock sql is set up in vitest.setup.ts
const mockSql = sql as unknown as ReturnType<typeof vi.fn>;

describe('db functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('insertAnalysis', () => {
    it('should insert analysis and return id', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 123 }]
      });

      const data: AnalysisRecord = {
        url: 'https://example.com',
        domain: 'example.com',
        render_type: 'Server-Side Rendered (SSR)',
        confidence: 85,
        frameworks: ['react', 'nextjs'],
        performance_metrics: {
          domReady: 150,
          fcp: 300
        },
        indicators: ['framework hydration markers'],
        extension_version: '3.5.0'
      };

      const result = await insertAnalysis(data);

      expect(result).toEqual({ id: 123 });
      expect(mockSql).toHaveBeenCalled();
    });

    it('should throw on database error', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database connection failed'));

      const data: AnalysisRecord = {
        url: 'https://example.com',
        domain: 'example.com',
        render_type: 'SSR',
        confidence: 85,
        frameworks: [],
        performance_metrics: {},
        indicators: [],
        extension_version: '3.5.0'
      };

      await expect(insertAnalysis(data)).rejects.toThrow('Database connection failed');
    });
  });

  describe('getTotalStats', () => {
    it('should return aggregated statistics', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{
          total_analyses: 100,
          ssr_count: 60,
          csr_count: 30,
          hybrid_count: 10,
          avg_confidence: 75.5
        }]
      });

      const result = await getTotalStats();

      expect(result).toEqual({
        total_analyses: 100,
        ssr_count: 60,
        csr_count: 30,
        hybrid_count: 10,
        avg_confidence: 75.5
      });
    });

    it('should throw on database error', async () => {
      mockSql.mockRejectedValueOnce(new Error('Query failed'));

      await expect(getTotalStats()).rejects.toThrow('Query failed');
    });
  });

  describe('getRecentAnalyses', () => {
    it('should return recent analyses with default limit', async () => {
      const mockRows = [
        { id: 1, domain: 'example.com', render_type: 'SSR' },
        { id: 2, domain: 'test.com', render_type: 'CSR' }
      ];

      mockSql.mockResolvedValueOnce({ rows: mockRows });

      const result = await getRecentAnalyses();

      expect(result).toEqual(mockRows);
      expect(mockSql).toHaveBeenCalled();
    });

    it('should support custom limit and offset', async () => {
      mockSql.mockResolvedValueOnce({ rows: [] });

      await getRecentAnalyses(10, 5);

      expect(mockSql).toHaveBeenCalled();
    });

    it('should throw on database error', async () => {
      mockSql.mockRejectedValueOnce(new Error('Query failed'));

      await expect(getRecentAnalyses()).rejects.toThrow('Query failed');
    });
  });

  describe('deleteAnalysis', () => {
    it('should delete analysis and return id', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 123 }]
      });

      const result = await deleteAnalysis(123);

      expect(result).toEqual({ id: 123 });
      expect(mockSql).toHaveBeenCalled();
    });

    it('should return undefined when id not found', async () => {
      mockSql.mockResolvedValueOnce({
        rows: []
      });

      const result = await deleteAnalysis(999);

      expect(result).toBeUndefined();
    });

    it('should throw on database error', async () => {
      mockSql.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(deleteAnalysis(123)).rejects.toThrow('Delete failed');
    });
  });
});
