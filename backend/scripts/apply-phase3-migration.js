// using node --env-file=.env.local
const { sql } = require('@vercel/postgres');

async function migrate() {
  try {
    console.log('🔄 Applying Phase 3 Migration...');
    
    // Add columns
    await sql`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS hydration_stats JSONB;`;
    await sql`ALTER TABLE analyses ADD COLUMN IF NOT EXISTS navigation_stats JSONB;`;
    console.log('✅ Added hydration_stats and navigation_stats columns');

    // Add indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_hydration_score ON analyses((hydration_stats->>'score'));`;
    await sql`CREATE INDEX IF NOT EXISTS idx_nav_is_spa ON analyses((navigation_stats->>'isSPA'));`;
    console.log('✅ Created indexes');

    console.log('🚀 Phase 3 Migration Complete!');
  } catch (err) {
    console.error('❌ Migration Failed:', err);
    process.exit(1);
  }
}

migrate();
