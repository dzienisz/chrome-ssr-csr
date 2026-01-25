import { NextRequest } from 'next/server';

export function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validKey = process.env.API_SECRET_KEY;

  if (!validKey) {
    console.error('API_SECRET_KEY not configured');
    return false;
  }

  return apiKey === validKey;
}

export function rateLimit(identifier: string): boolean {
  // Simple in-memory rate limiting
  // In production, use Redis (Upstash) for distributed rate limiting
  // This is a placeholder - implement proper rate limiting with Upstash Redis
  return true;
}
