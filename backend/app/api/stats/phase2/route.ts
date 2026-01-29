import { NextResponse } from 'next/server';
import { getTechStackStats, getSEOStats } from '@/lib/db-phase2';
import { getCorsHeaders, corsOptionsResponse } from '@/lib/cors';

export const dynamic = 'force-dynamic';

const corsHeaders = getCorsHeaders(['GET', 'OPTIONS']);

export async function OPTIONS() {
  return corsOptionsResponse(['GET', 'OPTIONS']);
}

export async function GET() {
  try {
    const [techStack, seoStats] = await Promise.all([
      getTechStackStats(),
      getSEOStats()
    ]);

    return NextResponse.json({
      techStack,
      seoStats
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching Phase 2 stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Phase 2 statistics' },
      { status: 500, headers: corsHeaders }
    );
  }
}
