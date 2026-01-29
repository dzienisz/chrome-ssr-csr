import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  insertAnalysis: vi.fn()
}));

vi.mock('@/lib/auth', () => ({
  verifyApiKey: vi.fn()
}));

vi.mock('@/lib/cors', () => ({
  getCorsHeaders: vi.fn(() => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
  })),
  corsOptionsResponse: vi.fn()
}));

import { insertAnalysis } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

const mockInsertAnalysis = insertAnalysis as ReturnType<typeof vi.fn>;
const mockVerifyApiKey = verifyApiKey as ReturnType<typeof vi.fn>;

function createRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
}

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyApiKey.mockReturnValue(true);
  });

  describe('authentication', () => {
    it('should return 401 when API key verification fails', async () => {
      mockVerifyApiKey.mockReturnValue(false);

      const request = createRequest({
        url: 'https://example.com',
        domain: 'example.com',
        renderType: 'SSR',
        confidence: 85
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('validation', () => {
    it('should return 400 when url is missing', async () => {
      const request = createRequest({
        domain: 'example.com',
        renderType: 'SSR',
        confidence: 85
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 when domain is missing', async () => {
      const request = createRequest({
        url: 'https://example.com',
        renderType: 'SSR',
        confidence: 85
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 when renderType is missing', async () => {
      const request = createRequest({
        url: 'https://example.com',
        domain: 'example.com',
        confidence: 85
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 when confidence is missing', async () => {
      const request = createRequest({
        url: 'https://example.com',
        domain: 'example.com',
        renderType: 'SSR'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 when confidence is not a number', async () => {
      const request = createRequest({
        url: 'https://example.com',
        domain: 'example.com',
        renderType: 'SSR',
        confidence: 'high'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid confidence value');
    });

    it('should return 400 when confidence is negative', async () => {
      const request = createRequest({
        url: 'https://example.com',
        domain: 'example.com',
        renderType: 'SSR',
        confidence: -5
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid confidence value');
    });

    it('should return 400 when confidence is above 100', async () => {
      const request = createRequest({
        url: 'https://example.com',
        domain: 'example.com',
        renderType: 'SSR',
        confidence: 150
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid confidence value');
    });
  });

  describe('success cases', () => {
    it('should insert analysis and return success', async () => {
      mockInsertAnalysis.mockResolvedValue({ id: 123 });

      const request = createRequest({
        url: 'https://example.com/page',
        domain: 'example.com',
        renderType: 'Server-Side Rendered (SSR)',
        confidence: 85,
        frameworks: ['react', 'nextjs'],
        indicators: ['framework hydration markers'],
        version: '3.5.0'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.id).toBe(123);
      expect(mockInsertAnalysis).toHaveBeenCalled();
    });

    it('should handle minimal required fields', async () => {
      mockInsertAnalysis.mockResolvedValue({ id: 456 });

      const request = createRequest({
        url: 'https://example.com',
        domain: 'example.com',
        renderType: 'CSR',
        confidence: 70
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle all optional Phase 1-3 fields', async () => {
      mockInsertAnalysis.mockResolvedValue({ id: 789 });

      const request = createRequest({
        url: 'https://example.com',
        domain: 'example.com',
        renderType: 'SSR',
        confidence: 90,
        frameworks: ['nextjs'],
        indicators: ['SSR markers'],
        version: '3.5.0',
        performanceMetrics: {
          domReady: 150,
          fcp: 300,
          contentRatio: 0.85
        },
        coreWebVitals: {
          lcp: 1500,
          cls: 0.05,
          ttfb: 200
        },
        pageType: 'article',
        deviceInfo: {
          deviceType: 'desktop',
          browserName: 'Chrome'
        },
        techStack: {
          cssFramework: 'Tailwind',
          buildTool: 'Webpack'
        },
        seoAccessibility: {
          metaDescription: true,
          hasCanonical: true
        },
        hydrationData: {
          errorCount: 0,
          hydrationTime: 50
        },
        navigationData: {
          isSPA: true,
          clientRoutes: 5
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockInsertAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com',
          domain: 'example.com',
          render_type: 'SSR',
          confidence: 90,
          core_web_vitals: { lcp: 1500, cls: 0.05, ttfb: 200 },
          tech_stack: { cssFramework: 'Tailwind', buildTool: 'Webpack' }
        })
      );
    });
  });

  describe('error handling', () => {
    it('should return 500 on database error', async () => {
      mockInsertAnalysis.mockRejectedValue(new Error('Database connection failed'));

      const request = createRequest({
        url: 'https://example.com',
        domain: 'example.com',
        renderType: 'SSR',
        confidence: 85
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});
