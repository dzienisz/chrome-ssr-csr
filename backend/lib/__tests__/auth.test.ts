import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyApiKey } from '../auth';
import { NextRequest } from 'next/server';

describe('verifyApiKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return true when no API key is configured', () => {
    delete process.env.API_SECRET_KEY;

    const request = new NextRequest('http://localhost/api/analyze', {
      headers: {}
    });

    expect(verifyApiKey(request)).toBe(true);
  });

  it('should return true when API key matches', () => {
    process.env.API_SECRET_KEY = 'test-secret-key';

    const request = new NextRequest('http://localhost/api/analyze', {
      headers: {
        'x-api-key': 'test-secret-key'
      }
    });

    expect(verifyApiKey(request)).toBe(true);
  });

  it('should return false when API key does not match', () => {
    process.env.API_SECRET_KEY = 'test-secret-key';

    const request = new NextRequest('http://localhost/api/analyze', {
      headers: {
        'x-api-key': 'wrong-key'
      }
    });

    expect(verifyApiKey(request)).toBe(false);
  });

  it('should return false when API key is missing but configured', () => {
    process.env.API_SECRET_KEY = 'test-secret-key';

    const request = new NextRequest('http://localhost/api/analyze', {
      headers: {}
    });

    expect(verifyApiKey(request)).toBe(false);
  });
});
