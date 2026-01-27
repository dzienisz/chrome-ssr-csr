-- Add Phase 3 columns: hydration_stats and navigation_stats
ALTER TABLE analyses 
ADD COLUMN hydration_stats JSONB,
ADD COLUMN navigation_stats JSONB;

-- Create indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_hydration_score ON analyses((hydration_stats->>'score'));
CREATE INDEX IF NOT EXISTS idx_nav_is_spa ON analyses((navigation_stats->>'isSPA'));
