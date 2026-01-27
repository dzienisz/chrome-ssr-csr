import { NextRequest, NextResponse } from 'next/server';
import { deleteAnalysis } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // For dashboard requests (same origin), we can skip the strict API key check
  // In a real app, you'd check for a session here
  const isSameOrigin = request.headers.get('referer')?.startsWith(request.nextUrl.origin);

  // Verify API key if not same origin
  if (!isSameOrigin && !verifyApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: corsHeaders }
    );
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Invalid ID' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const deleted = await deleteAnalysis(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, id: deleted.id }, { headers: corsHeaders });
  } catch (error) {
    console.error('Analysis deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
