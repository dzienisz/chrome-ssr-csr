import { sql } from "@vercel/postgres";

export async function getHydrationStats() {
  try {
    const result = await sql`
      WITH safe_analyses AS (
        SELECT (SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(CASE WHEN jsonb_typeof(hydration_stats) = 'object' THEN hydration_stats ELSE '{}'::jsonb END)
          WHERE CASE WHEN jsonb_typeof(value) = 'number'
            THEN value::numeric BETWEEN 0 AND 9007199254740991
              AND ((key = 'score' AND value::numeric <= 100) OR (key = 'errorCount' AND mod(value::numeric, 1) = 0))
            ELSE false END) AS hydration_stats
        FROM analyses
      )
      SELECT
        AVG((hydration_stats->>'score')::numeric) as avg_score,
        COUNT(CASE WHEN (hydration_stats->>'errorCount')::numeric > 0 THEN 1 END) as sites_with_errors,
        SUM((hydration_stats->>'errorCount')::numeric) as total_errors
      FROM safe_analyses
      WHERE hydration_stats IS NOT NULL;
    `;
    return result.rows[0];
  } catch (error) {
    console.error("getHydrationStats error:", error);
    return null;
  }
}

export async function getNavigationStats() {
  try {
    const result = await sql`
      SELECT
        COUNT(CASE WHEN navigation_stats->'isSPA' = 'true'::jsonb THEN 1 END) as spa_count,
        SUM(CASE WHEN jsonb_typeof(navigation_stats->'clientRoutes') = 'number'
          THEN CASE WHEN (navigation_stats->>'clientRoutes')::numeric BETWEEN 0 AND 9007199254740991
            AND mod((navigation_stats->>'clientRoutes')::numeric, 1) = 0
            THEN (navigation_stats->>'clientRoutes')::numeric END END) as total_client_routes
      FROM analyses
      WHERE navigation_stats IS NOT NULL;
    `;
    return result.rows[0];
  } catch (error) {
    console.error("getNavigationStats error:", error);
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
        COUNT(CASE WHEN navigation_stats->'isSPA' = 'true'::jsonb THEN 1 END) as spa_count,
        ROUND(AVG(CASE WHEN navigation_stats->'isSPA' = 'true'::jsonb
          THEN CASE WHEN jsonb_typeof(navigation_stats->'clientRoutes') = 'number'
            THEN CASE WHEN (navigation_stats->>'clientRoutes')::numeric BETWEEN 0 AND 9007199254740991
              AND mod((navigation_stats->>'clientRoutes')::numeric, 1) = 0
              THEN (navigation_stats->>'clientRoutes')::numeric END END END), 1) as avg_client_routes
      FROM analyses
      -- jsonb_typeof excludes legacy rows storing JSON null (pre-v1.5.1 insert bug)
      WHERE jsonb_typeof(navigation_stats) = 'object'
        AND jsonb_typeof(navigation_stats->'isSPA') = 'boolean'
      GROUP BY render_category
      ORDER BY sample_count DESC;
    `;
    return result.rows;
  } catch (error) {
    console.error("getNavigationByRenderType error:", error);
    return [];
  }
}
