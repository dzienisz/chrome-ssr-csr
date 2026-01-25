/**
 * Database Setup Script
 * Run this once after deploying to Vercel to create the tables
 *
 * Usage: node scripts/setup-db.js
 */

const { sql } = require('@vercel/postgres');

async function setupDatabase() {
  try {
    console.log('Creating analyses table...');

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
        indicators TEXT[],
        extension_version VARCHAR(20),
        user_agent TEXT
      );
    `;

    console.log('Creating indexes...');

    await sql`CREATE INDEX IF NOT EXISTS idx_timestamp ON analyses(timestamp);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_domain ON analyses(domain);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_render_type ON analyses(render_type);`;

    console.log('Database setup complete!');
    console.log('Tables created:');
    console.log('  - analyses');
    console.log('Indexes created:');
    console.log('  - idx_timestamp');
    console.log('  - idx_domain');
    console.log('  - idx_render_type');

  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();
