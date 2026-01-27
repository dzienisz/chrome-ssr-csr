import { NextResponse } from 'next/server';
import { getHydrationStats, getNavigationStats } from '@/lib/db-phase3';

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
    const [hydration, navigation] = await Promise.all([
      getHydrationStats(),
      getNavigationStats()
    ]);

    return NextResponse.json({
      hydration,
      navigation
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching Phase 3 stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Phase 3 statistics' },
      { status: 500, headers: corsHeaders }
    );
  }
}
