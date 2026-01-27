import { NextResponse } from 'next/server';
import { 
  getCoreWebVitalsByRenderType,
  getPageTypeDistribution,
  getDevicePerformance,
  getDeviceTypeSummary
} from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [
      coreWebVitals,
      pageTypes,
      devicePerformance,
      deviceSummary
    ] = await Promise.all([
      getCoreWebVitalsByRenderType(),
      getPageTypeDistribution(),
      getDevicePerformance(),
      getDeviceTypeSummary()
    ]);

    return NextResponse.json({
      coreWebVitals,
      pageTypes,
      devicePerformance,
      deviceSummary
    });
  } catch (error) {
    console.error('Phase 1 stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Phase 1 statistics' },
      { status: 500 }
    );
  }
}
