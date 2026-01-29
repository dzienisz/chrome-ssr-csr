import { NextResponse } from 'next/server';
import { getHydrationStats, getNavigationStats } from '@/lib/db-phase3';
import { getCorsHeaders, corsOptionsResponse } from '@/lib/cors';

export const dynamic = 'force-dynamic';

const corsHeaders = getCorsHeaders(['GET', 'OPTIONS']);

export async function OPTIONS() {
  return corsOptionsResponse(['GET', 'OPTIONS']);
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
      { success: false, error: 'Failed to fetch Phase 3 statistics' },
      { status: 500, headers: corsHeaders }
    );
  }
}
