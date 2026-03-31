-- Add description and metadata columns to trends table
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment for developer context
COMMENT ON COLUMN public.trends.description IS 'Detailed content or summary of the trend/news item';
COMMENT ON COLUMN public.trends.metadata IS 'Extra fields like related links, tags, or specific platform data';
