import { sql } from '@vercel/postgres';

export async function getHydrationStats() {
  try {
    const result = await sql`
      SELECT
        AVG((hydration_stats::jsonb->>'score')::numeric) as avg_score,
        COUNT(CASE WHEN (hydration_stats::jsonb->>'errorCount')::numeric > 0 THEN 1 END) as sites_with_errors,
        SUM((hydration_stats::jsonb->>'errorCount')::numeric) as total_errors
      FROM analyses
      WHERE hydration_stats IS NOT NULL;
    `;
    return result.rows[0];
  } catch (error) {
    console.error('getHydrationStats error:', error);
    return null;
  }
}

export async function getNavigationStats() {
  try {
    const result = await sql`
      SELECT
        COUNT(CASE WHEN (navigation_stats::jsonb->>'isSPA')::boolean = true THEN 1 END) as spa_count,
        SUM((navigation_stats::jsonb->>'clientRoutes')::numeric) as total_client_routes
      FROM analyses
      WHERE navigation_stats IS NOT NULL;
    `;
    return result.rows[0];
  } catch (error) {
    console.error('getNavigationStats error:', error);
    return null;
  }
}
