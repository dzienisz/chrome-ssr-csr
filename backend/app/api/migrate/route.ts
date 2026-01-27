import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    console.log('Running Phase 1 migration...');

    // Add Phase 1 columns
    await sql`
      ALTER TABLE analyses 
      ADD COLUMN IF NOT EXISTS core_web_vitals JSONB,
      ADD COLUMN IF NOT EXISTS page_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS device_info JSONB;
    `;

    // Add Phase 2 columns
    await sql`
      ALTER TABLE analyses 
      ADD COLUMN IF NOT EXISTS tech_stack JSONB,
      ADD COLUMN IF NOT EXISTS seo_accessibility JSONB;
    `;

    // Create indexes (Phase 1)
    await sql`CREATE INDEX IF NOT EXISTS idx_page_type ON analyses(page_type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_device_type ON analyses((device_info->>'deviceType'));`;
    await sql`CREATE INDEX IF NOT EXISTS idx_lcp ON analyses(((core_web_vitals->>'lcp')::numeric));`;

    // Create indexes (Phase 2)
    await sql`CREATE INDEX IF NOT EXISTS idx_css_framework ON analyses((tech_stack->>'cssFramework'));`;
    await sql`CREATE INDEX IF NOT EXISTS idx_build_tool ON analyses((tech_stack->>'buildTool'));`;
    await sql`CREATE INDEX IF NOT EXISTS idx_wcag_level ON analyses((seo_accessibility->>'wcagLevel'));`;

    console.log('Migration complete (Phase 1 + 2)!');

    return NextResponse.json({
      success: true,
      message: 'Migration complete (Phase 1 + 2)!',
      columns_added: [
        'core_web_vitals', 'page_type', 'device_info', 
        'tech_stack', 'seo_accessibility'
      ],
      indexes_created: [
        'idx_page_type', 'idx_device_type', 'idx_lcp',
        'idx_css_framework', 'idx_build_tool', 'idx_wcag_level'
      ]
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
