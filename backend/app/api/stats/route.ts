import { NextRequest, NextResponse } from 'next/server';
import {
  getTotalStats,
  getTopFrameworks,
  getTopDomains,
  getAnalysesByDate,
  getRecentAnalyses,
  getLatestAnalysisTime,
} from '@/lib/db';

// Mark as dynamic to prevent static optimization errors
export const dynamic = 'force-dynamic';

const cacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';

    switch (type) {
      case 'total':
        const totalStats = await getTotalStats();
        return NextResponse.json(totalStats, { headers: cacheHeaders });

      case 'frameworks':
        const limit = parseInt(searchParams.get('limit') || '10');
        const frameworks = await getTopFrameworks(limit);
        return NextResponse.json(frameworks, { headers: cacheHeaders });

      case 'domains':
        const domainLimit = parseInt(searchParams.get('limit') || '20');
        const domains = await getTopDomains(domainLimit);
        return NextResponse.json(domains, { headers: cacheHeaders });

      case 'timeline':
        const days = parseInt(searchParams.get('days') || '30');
        const timeline = await getAnalysesByDate(days);
        return NextResponse.json(timeline, { headers: cacheHeaders });

      case 'recent':
        const recentLimit = parseInt(searchParams.get('limit') || '100');
        const recent = await getRecentAnalyses(recentLimit);
        return NextResponse.json(recent, { headers: cacheHeaders });

      case 'all':
      default:
        const [total, topFrameworks, topDomains, timelineData, recentAnalyses, latestTime] = await Promise.all([
          getTotalStats(),
          getTopFrameworks(10),
          getTopDomains(10),
          getAnalysesByDate(30),
          getRecentAnalyses(20),
          getLatestAnalysisTime(),
        ]);

        return NextResponse.json({
          total,
          frameworks: topFrameworks,
          domains: topDomains,
          timeline: timelineData,
          recent: recentAnalyses,
          latestTime,
        }, { headers: cacheHeaders });
    }
  } catch (error) {
    console.error('Stats query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: cacheHeaders }
    );
  }
}
