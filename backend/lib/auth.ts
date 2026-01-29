import { NextRequest } from 'next/server';

export function verifyApiKey(request: NextRequest): boolean {
  const validKey = process.env.API_SECRET_KEY;

  // If no API key is configured, allow all requests (rely on CORS)
  if (!validKey) {
    return true;
  }

  const apiKey = request.headers.get('x-api-key');
  return apiKey === validKey;
}
