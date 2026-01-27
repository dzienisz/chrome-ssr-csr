-- Migration: Add Phase 1 columns to analyses table
-- Version: 1.1.0
-- Date: 2026-01-27

-- Add new columns for Phase 1 data
ALTER TABLE analyses 
ADD COLUMN IF NOT EXISTS core_web_vitals JSONB,
ADD COLUMN IF NOT EXISTS page_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analyses_page_type ON analyses(page_type);
CREATE INDEX IF NOT EXISTS idx_analyses_device_type ON analyses((device_info->>'deviceType'));
CREATE INDEX IF NOT EXISTS idx_analyses_connection_type ON analyses((device_info->>'connection'->>'effectiveType'));
CREATE INDEX IF NOT EXISTS idx_analyses_lcp ON analyses(((core_web_vitals->>'lcp')::numeric));
CREATE INDEX IF NOT EXISTS idx_analyses_cls ON analyses(((core_web_vitals->>'cls')::numeric));
CREATE INDEX IF NOT EXISTS idx_analyses_fid ON analyses(((core_web_vitals->>'fid')::numeric));

-- Add comment to table
COMMENT ON COLUMN analyses.core_web_vitals IS 'Core Web Vitals metrics (LCP, CLS, FID, TTFB, TTI, TBT)';
COMMENT ON COLUMN analyses.page_type IS 'Page type classification (ecommerce, blog, docs, app, homepage, other)';
COMMENT ON COLUMN analyses.device_info IS 'Device, browser, and connection information';

-- Verify migration
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'analyses'
AND column_name IN ('core_web_vitals', 'page_type', 'device_info');
