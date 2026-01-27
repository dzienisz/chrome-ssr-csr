import { sql } from '@vercel/postgres';

export async function getTechStackStats() {
  try {
    const cssFrameworks = await sql`
      SELECT 
        tech_stack->>'cssFramework' as name,
        COUNT(*) as count
      FROM analyses
      WHERE tech_stack->>'cssFramework' IS NOT NULL
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10;
    `;

    const buildTools = await sql`
      SELECT 
        tech_stack->>'buildTool' as name,
        COUNT(*) as count
      FROM analyses
      WHERE tech_stack->>'buildTool' IS NOT NULL
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10;
    `;

    const hosting = await sql`
      SELECT 
        tech_stack->>'hosting' as name,
        COUNT(*) as count
      FROM analyses
      WHERE tech_stack->>'hosting' IS NOT NULL
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10;
    `;

    return {
      cssFrameworks: Object.fromEntries(cssFrameworks.rows.map(r => [r.name, parseInt(r.count)])),
      buildTools: Object.fromEntries(buildTools.rows.map(r => [r.name, parseInt(r.count)])),
      hosting: Object.fromEntries(hosting.rows.map(r => [r.name, parseInt(r.count)]))
    };
  } catch (error) {
    console.error('Error fetching tech stack stats:', error);
    return { cssFrameworks: {}, buildTools: {}, hosting: {} };
  }
}

export async function getSEOStats() {
  try {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN (seo_accessibility->'seo'->>'hasMetaDescription')::boolean THEN 1 END) as has_desc,
        COUNT(CASE WHEN (seo_accessibility->'seo'->>'hasOGTags')::boolean THEN 1 END) as has_og,
        COUNT(CASE WHEN (seo_accessibility->'seo'->>'hasTwitterCard')::boolean THEN 1 END) as has_twitter,
        COUNT(CASE WHEN (seo_accessibility->'accessibility'->>'altTextCoverage')::int > 80 THEN 1 END) as has_alt_text,
        COUNT(CASE WHEN (seo_accessibility->'accessibility'->>'hasAriaLabels')::boolean THEN 1 END) as has_aria,
        COUNT(CASE WHEN (seo_accessibility->'accessibility'->>'hasLandmarks')::boolean THEN 1 END) as has_landmarks
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
        hasTwitterCard: parseInt(row.has_twitter)
      },
      accessibility: {
        hasAltText: parseInt(row.has_alt_text),
        hasAriaLabels: parseInt(row.has_aria),
        hasLandmarks: parseInt(row.has_landmarks)
      }
    };
  } catch (error) {
    console.error('Error fetching SEO stats:', error);
    return null;
  }
}
