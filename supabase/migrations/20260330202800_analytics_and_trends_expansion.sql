-- Migration: Analytics and Trends Expansion
-- Goal: Store URLs for trends and views for social accounts

ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS url TEXT;

ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS likes BIGINT DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS shares BIGINT DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS comments BIGINT DEFAULT 0;

ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0;

-- Update existing trends if any with a default search link
UPDATE public.trends SET url = 'https://www.google.com/search?q=' || keyword WHERE url IS NULL;
