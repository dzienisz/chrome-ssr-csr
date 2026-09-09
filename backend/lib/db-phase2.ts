import { sql } from "@vercel/postgres";
import { TECH_LABELS, aggregateNumber } from "./telemetry-schema";

function categoryCounts(
  rows: { name: unknown; count: string }[],
  labels: string[],
) {
  return Object.fromEntries(
    rows
      .filter(
        (row) => typeof row.name === "string" && labels.includes(row.name),
      )
      .map((row) => [row.name, aggregateNumber(row.count)]),
  );
}

export async function getTechStackStats() {
  try {
    const cssFrameworks = await sql`
      SELECT 
        tech_stack->>'cssFramework' as name,
        COUNT(*) as count
      FROM analyses
      WHERE tech_stack->>'cssFramework' IN (SELECT jsonb_array_elements_text(${JSON.stringify(TECH_LABELS.cssFramework)}::jsonb))
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10;
    `;

    const buildTools = await sql`
      SELECT 
        tech_stack->>'buildTool' as name,
        COUNT(*) as count
      FROM analyses
      WHERE tech_stack->>'buildTool' IN (SELECT jsonb_array_elements_text(${JSON.stringify(TECH_LABELS.buildTool)}::jsonb))
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10;
    `;

    const hosting = await sql`
      SELECT 
        tech_stack->>'hosting' as name,
        COUNT(*) as count
      FROM analyses
      WHERE tech_stack->>'hosting' IN (SELECT jsonb_array_elements_text(${JSON.stringify(TECH_LABELS.hosting)}::jsonb))
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10;
    `;

    return {
      cssFrameworks: categoryCounts(
        cssFrameworks.rows as { name: unknown; count: string }[],
        TECH_LABELS.cssFramework,
      ),
      buildTools: categoryCounts(
        buildTools.rows as { name: unknown; count: string }[],
        TECH_LABELS.buildTool,
      ),
      hosting: categoryCounts(
        hosting.rows as { name: unknown; count: string }[],
        TECH_LABELS.hosting,
      ),
    };
  } catch (error) {
    console.error("Error fetching tech stack stats:", error);
    return { cssFrameworks: {}, buildTools: {}, hosting: {} };
  }
}

export async function getSEOStats() {
  try {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN seo_accessibility->'seo'->'hasMetaDescription' = 'true'::jsonb THEN 1 END) as has_desc,
        COUNT(CASE WHEN seo_accessibility->'seo'->'hasOGTags' = 'true'::jsonb THEN 1 END) as has_og,
        COUNT(CASE WHEN seo_accessibility->'seo'->'hasTwitterCard' = 'true'::jsonb THEN 1 END) as has_twitter,
        COUNT(CASE WHEN CASE WHEN jsonb_typeof(seo_accessibility->'accessibility'->'altTextCoverage') = 'number'
          THEN (seo_accessibility->'accessibility'->>'altTextCoverage')::numeric BETWEEN 0 AND 100
            AND (seo_accessibility->'accessibility'->>'altTextCoverage')::numeric > 80
          ELSE false END THEN 1 END) as has_alt_text,
        COUNT(CASE WHEN seo_accessibility->'accessibility'->'hasAriaLabels' = 'true'::jsonb THEN 1 END) as has_aria,
        COUNT(CASE WHEN seo_accessibility->'accessibility'->'hasLandmarks' = 'true'::jsonb THEN 1 END) as has_landmarks
      FROM analyses
      WHERE seo_accessibility IS NOT NULL;
    `;

    const row = result.rows[0];
    if (!row) return null;

    return {
      totalAnalyzed: parseInt(row.total),
      metaTags: {
        hasDescription: parseInt(row.has_desc),
        hasOGTags: parseInt(row.has_og),
        hasTwitterCard: parseInt(row.has_twitter),
      },
      accessibility: {
        hasAltText: parseInt(row.has_alt_text),
        hasAriaLabels: parseInt(row.has_aria),
        hasLandmarks: parseInt(row.has_landmarks),
      },
    };
  } catch (error) {
    console.error("Error fetching SEO stats:", error);
    return null;
  }
}
