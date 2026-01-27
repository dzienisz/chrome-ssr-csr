import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Create analyses table
    await sql`
      CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        url TEXT NOT NULL,
        domain VARCHAR(255) NOT NULL,
        render_type VARCHAR(50) NOT NULL,
        confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
        frameworks JSONB DEFAULT '[]'::jsonb,
        performance_metrics JSONB DEFAULT '{}'::jsonb,
        indicators JSONB DEFAULT '[]'::jsonb,
        extension_version VARCHAR(20),
        user_agent TEXT,
        -- Phase 1 columns
        core_web_vitals JSONB,
        page_type VARCHAR(50),
        device_info JSONB
      );
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_timestamp ON analyses(timestamp);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_domain ON analyses(domain);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_render_type ON analyses(render_type);`;
    
    // Phase 1 indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_page_type ON analyses(page_type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_device_type ON analyses((device_info->>'deviceType'));`;
    await sql`CREATE INDEX IF NOT EXISTS idx_lcp ON analyses(((core_web_vitals->>'lcp')::numeric));`;

    return NextResponse.json({
      success: true,
      message: 'Database setup complete! Tables and indexes created.',
      tables: ['analyses'],
      indexes: ['idx_timestamp', 'idx_domain', 'idx_render_type', 'idx_page_type', 'idx_device_type', 'idx_lcp']
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
