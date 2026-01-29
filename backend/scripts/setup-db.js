/**
 * Database Setup Script
 * Run this once after deploying to Vercel to create the tables
 *
 * Usage: node scripts/setup-db.js
 *
 * Requires POSTGRES_URL environment variable to be set.
 * You can run this locally with:
 *   POSTGRES_URL="your-connection-string" node scripts/setup-db.js
 */

const { sql } = require('@vercel/postgres');

async function setupDatabase() {
  try {
    console.log('Creating analyses table...');

    // Full schema including all Phase 1-3 fields (v3.5.0)
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

        -- Phase 1 fields (v3.3.0): Core Web Vitals, Page Type, Device Info
        core_web_vitals JSONB DEFAULT NULL,
        page_type VARCHAR(50) DEFAULT NULL,
        device_info JSONB DEFAULT NULL,

        -- Phase 2 fields (v3.4.0): Tech Stack, SEO & Accessibility
        tech_stack JSONB DEFAULT NULL,
        seo_accessibility JSONB DEFAULT NULL,

        -- Phase 3 fields (v3.5.0): Hydration, Navigation
        hydration_stats JSONB DEFAULT NULL,
        navigation_stats JSONB DEFAULT NULL
      );
    `;

    console.log('Creating indexes...');

    await sql`CREATE INDEX IF NOT EXISTS idx_timestamp ON analyses(timestamp);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_domain ON analyses(domain);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_render_type ON analyses(render_type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_page_type ON analyses(page_type);`;

    console.log('Database setup complete!');
    console.log('');
    console.log('Table created: analyses');
    console.log('');
    console.log('Columns:');
    console.log('  Core:');
    console.log('    - id, timestamp, url, domain, render_type, confidence');
    console.log('    - frameworks, performance_metrics, indicators');
    console.log('    - extension_version, user_agent');
    console.log('  Phase 1 (v3.3.0):');
    console.log('    - core_web_vitals (JSONB): LCP, CLS, FID, TTFB, etc.');
    console.log('    - page_type (VARCHAR): blog, ecommerce, docs, etc.');
    console.log('    - device_info (JSONB): device type, browser, connection');
    console.log('  Phase 2 (v3.4.0):');
    console.log('    - tech_stack (JSONB): CSS framework, state mgmt, build tool');
    console.log('    - seo_accessibility (JSONB): meta tags, heading structure');
    console.log('  Phase 3 (v3.5.0):');
    console.log('    - hydration_stats (JSONB): errors, timing');
    console.log('    - navigation_stats (JSONB): SPA/MPA, routes');
    console.log('');
    console.log('Indexes: idx_timestamp, idx_domain, idx_render_type, idx_page_type');

  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
