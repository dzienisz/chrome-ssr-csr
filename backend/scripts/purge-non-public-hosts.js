/**
 * Remove telemetry rows recorded for non-public hosts (localhost, *.local,
 * private/raw IP literals, single-label hosts). /api/analyze rejects these
 * since backend 1.7.0; this cleans up rows stored before that.
 *
 * Usage (dry run by default — prints what would be deleted):
 *   POSTGRES_URL="..." node scripts/purge-non-public-hosts.js
 *   POSTGRES_URL="..." node scripts/purge-non-public-hosts.js --apply
 */

const { sql } = require('@vercel/postgres');

const apply = process.argv.includes('--apply');

async function main() {
  const preview = await sql`
    SELECT domain, COUNT(*)::int AS count
    FROM analyses
    WHERE domain IS NOT NULL AND (
      lower(domain) = 'localhost'
      OR lower(domain) ~ '\\.(localhost|local|internal|lan|test|invalid|example)\\.?$'
      OR lower(domain) ~ '\\.home\\.arpa\\.?$'
      OR domain ~ '^[0-9]+(\\.[0-9]+){3}$'
      OR domain LIKE '[%'
      OR domain LIKE '%:%'
      OR position('.' in domain) = 0
    )
    GROUP BY domain
    ORDER BY count DESC, domain;
  `;
  const total = preview.rows.reduce((sum, row) => sum + row.count, 0);
  console.log(`${total} rows across ${preview.rows.length} non-public hosts`);
  for (const row of preview.rows.slice(0, 50)) console.log(`  ${row.count}\t${row.domain}`);

  if (!apply) {
    console.log('Dry run. Re-run with --apply to delete these rows.');
    return;
  }

  const result = await sql`
    DELETE FROM analyses
    WHERE domain IS NOT NULL AND (
      lower(domain) = 'localhost'
      OR lower(domain) ~ '\\.(localhost|local|internal|lan|test|invalid|example)\\.?$'
      OR lower(domain) ~ '\\.home\\.arpa\\.?$'
      OR domain ~ '^[0-9]+(\\.[0-9]+){3}$'
      OR domain LIKE '[%'
      OR domain LIKE '%:%'
      OR position('.' in domain) = 0
    );
  `;
  console.log(`Deleted ${result.rowCount} rows.`);
}

main().then(() => process.exit(0), (error) => {
  console.error('Purge failed:', error);
  process.exit(1);
});
