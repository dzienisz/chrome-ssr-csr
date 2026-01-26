import { NextRequest } from 'next/server';

export function verifyApiKey(request: NextRequest): boolean {
  const validKey = process.env.API_SECRET_KEY;

  // If no API key is configured, allow all requests (rely on CORS + rate limiting)
  if (!validKey) {
    return true;
  }

  const apiKey = request.headers.get('x-api-key');
  return apiKey === validKey;
}

export function rateLimit(identifier: string): boolean {
  // Simple in-memory rate limiting
  // In production, use Redis (Upstash) for distributed rate limiting
  // This is a placeholder - implement proper rate limiting with Upstash Redis
  return true;
}
