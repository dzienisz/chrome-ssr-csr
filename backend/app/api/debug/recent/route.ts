import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Get recent analyses with Phase 1 data
    const result = await sql`
      SELECT 
        id,
        timestamp,
        domain,
        render_type,
        extension_version,
        core_web_vitals IS NOT NULL as has_cwv,
        page_type,
        device_info IS NOT NULL as has_device_info,
        core_web_vitals,
        device_info
      FROM analyses
      ORDER BY timestamp DESC
      LIMIT 10;
    `;

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      recent: result.rows
    });
  } catch (error) {
    console.error('Recent check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
