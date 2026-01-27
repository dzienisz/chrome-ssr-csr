-- Add Phase 2 columns: tech_stack and seo_accessibility
ALTER TABLE analyses 
ADD COLUMN tech_stack JSONB,
ADD COLUMN seo_accessibility JSONB;

-- Create indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_css_framework ON analyses((tech_stack->>'cssFramework'));
CREATE INDEX IF NOT EXISTS idx_build_tool ON analyses((tech_stack->>'buildTool'));
CREATE INDEX IF NOT EXISTS idx_wcag_level ON analyses((seo_accessibility->>'wcagLevel'));
