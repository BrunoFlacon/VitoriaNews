-- Migration: Add URL to Trends
-- Goal: Store the original source URL for each trend discovery

ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS url TEXT;

-- Update existing trends if any with a default search link (optional)
UPDATE public.trends SET url = 'https://www.google.com/search?q=' || keyword WHERE url IS NULL;
