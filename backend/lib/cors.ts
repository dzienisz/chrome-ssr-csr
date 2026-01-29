import { NextResponse } from 'next/server';

type CorsMethod = 'GET' | 'POST' | 'DELETE' | 'OPTIONS';

/**
 * Generate CORS headers for API responses
 * @param methods - HTTP methods to allow (e.g., ['GET', 'OPTIONS'])
 * @returns CORS headers object
 */
export function getCorsHeaders(methods: CorsMethod[] = ['GET', 'OPTIONS']): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods.join(', '),
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
  };
}

/**
 * Create an OPTIONS response for CORS preflight
 * @param methods - HTTP methods to allow
 */
export function corsOptionsResponse(methods: CorsMethod[] = ['GET', 'OPTIONS']): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(methods),
  });
}
