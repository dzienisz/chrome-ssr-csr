import { NextResponse } from 'next/server';
import { getTechStackStats, getSEOStats } from '@/lib/db-phase2';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
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
      { error: 'Failed to fetch Phase 2 statistics' },
      { status: 500, headers: corsHeaders }
    );
  }
}
