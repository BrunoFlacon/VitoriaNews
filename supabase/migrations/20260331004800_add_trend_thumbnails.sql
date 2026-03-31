-- Add thumbnail_url to trends table
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
