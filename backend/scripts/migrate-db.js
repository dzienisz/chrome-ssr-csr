/**
 * Database Migration Script
 * Run this to add Phase 1-3 columns to an existing database
 *
 * Usage: node scripts/migrate-db.js
 *
 * This script is idempotent - safe to run multiple times.
 * It only adds columns that don't exist yet.
 *
 * Requires POSTGRES_URL environment variable to be set.
 */

const { sql } = require('@vercel/postgres');

async function migrateDatabase() {
  try {
    console.log('Starting database migration...\n');

    // Phase 1 columns (v3.3.0)
    console.log('Phase 1 (v3.3.0): Adding Core Web Vitals, Page Type, Device Info...');

    await sql`
      ALTER TABLE analyses
      ADD COLUMN IF NOT EXISTS core_web_vitals JSONB DEFAULT NULL;
    `;
    console.log('  ✓ core_web_vitals');

    await sql`
      ALTER TABLE analyses
      ADD COLUMN IF NOT EXISTS page_type VARCHAR(50) DEFAULT NULL;
    `;
    console.log('  ✓ page_type');

    await sql`
      ALTER TABLE analyses
      ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT NULL;
    `;
    console.log('  ✓ device_info');

    // Phase 2 columns (v3.4.0)
    console.log('\nPhase 2 (v3.4.0): Adding Tech Stack, SEO & Accessibility...');

    await sql`
      ALTER TABLE analyses
      ADD COLUMN IF NOT EXISTS tech_stack JSONB DEFAULT NULL;
    `;
    console.log('  ✓ tech_stack');

    await sql`
      ALTER TABLE analyses
      ADD COLUMN IF NOT EXISTS seo_accessibility JSONB DEFAULT NULL;
    `;
    console.log('  ✓ seo_accessibility');

    // Phase 3 columns (v3.5.0)
    console.log('\nPhase 3 (v3.5.0): Adding Hydration, Navigation...');

    await sql`
      ALTER TABLE analyses
      ADD COLUMN IF NOT EXISTS hydration_stats JSONB DEFAULT NULL;
    `;
    console.log('  ✓ hydration_stats');

    await sql`
      ALTER TABLE analyses
      ADD COLUMN IF NOT EXISTS navigation_stats JSONB DEFAULT NULL;
    `;
    console.log('  ✓ navigation_stats');

    // Add index for page_type if it doesn't exist
    console.log('\nAdding indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_page_type ON analyses(page_type);`;
    console.log('  ✓ idx_page_type');

    console.log('\n✅ Migration complete!');
    console.log('\nYour database now supports all Phase 1-3 features.');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateDatabase();
