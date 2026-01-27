import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    console.log('Running Phase 1 migration...');

    // Add new columns
    await sql`
      ALTER TABLE analyses 
      ADD COLUMN IF NOT EXISTS core_web_vitals JSONB,
      ADD COLUMN IF NOT EXISTS page_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS device_info JSONB;
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_page_type ON analyses(page_type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_device_type ON analyses((device_info->>'deviceType'));`;
    await sql`CREATE INDEX IF NOT EXISTS idx_lcp ON analyses(((core_web_vitals->>'lcp')::numeric));`;

    console.log('Phase 1 migration complete!');

    return NextResponse.json({
      success: true,
      message: 'Phase 1 migration complete!',
      columns_added: ['core_web_vitals', 'page_type', 'device_info'],
      indexes_created: ['idx_page_type', 'idx_device_type', 'idx_lcp']
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
