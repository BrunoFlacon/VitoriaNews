-- Migration: Alignment of metrics between live and historical tables
-- Date: 2026-04-13

-- 1. Ensure social_accounts has all primary metric columns
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS subscribers_count INTEGER DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS likes BIGINT DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS shares BIGINT DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS comments BIGINT DEFAULT 0;

-- 2. Ensure account_metrics (historical) matches social_accounts
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS subscribers_count INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS likes BIGINT DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS shares BIGINT DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS comments BIGINT DEFAULT 0;

-- 3. Cleanup: If 'followers' column exists and is used, alias or sync to subscribers_count
-- We prefer subscribers_count as it's more generic for YT, News, etc.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='social_accounts' AND column_name='followers') THEN
        UPDATE public.social_accounts SET subscribers_count = followers WHERE subscribers_count = 0 AND followers > 0;
    END IF;
END $$;
