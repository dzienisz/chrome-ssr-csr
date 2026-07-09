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

// Phase 3: SPA vs MPA navigation behavior, segmented by detected render type.
// Elevated SPA share inside the SSR bucket is a cross-check on detection
// accuracy (see plans/002 — the pre-fix detector misclassified CSR as SSR).
export async function getNavigationByRenderType() {
  try {
    const result = await sql`
      SELECT
        CASE
          WHEN render_type ILIKE '%SSR%' THEN 'SSR'
          WHEN render_type ILIKE '%CSR%' THEN 'CSR'
          WHEN render_type ILIKE '%Hybrid%' OR render_type ILIKE '%Mixed%' THEN 'Hybrid'
          ELSE 'Other'
        END as render_category,
        COUNT(*) as sample_count,
        COUNT(CASE WHEN (navigation_stats->>'isSPA')::boolean = true THEN 1 END) as spa_count,
        ROUND(AVG(CASE WHEN (navigation_stats->>'isSPA')::boolean = true
          THEN (navigation_stats->>'clientRoutes')::numeric END), 1) as avg_client_routes
      FROM analyses
      -- jsonb_typeof excludes legacy rows storing JSON null (pre-v1.5.1 insert bug)
      WHERE jsonb_typeof(navigation_stats) = 'object'
        AND navigation_stats->>'isSPA' IS NOT NULL
      GROUP BY render_category
      ORDER BY sample_count DESC;
    `;
    return result.rows;
  } catch (error) {
    console.error('getNavigationByRenderType error:', error);
    return [];
  }
}
