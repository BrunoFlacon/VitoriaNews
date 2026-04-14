-- MIGRATION: Fix Social Upsert Constraints
-- Date: 2026-04-10
-- Resolves 400 Bad Request on Edge Functions when using onConflict

-- 1. CLEANUP DUPLICATES IN social_accounts
DELETE FROM public.social_accounts a USING public.social_accounts b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.platform = b.platform 
  AND a.platform_user_id = b.platform_user_id;

-- 2. ADD UNIQUE CONSTRAINT TO social_accounts
ALTER TABLE public.social_accounts 
DROP CONSTRAINT IF EXISTS social_accounts_platform_user_unique;

ALTER TABLE public.social_accounts 
ADD CONSTRAINT social_accounts_platform_user_unique UNIQUE (user_id, platform, platform_user_id);

-- 3. CLEANUP DUPLICATES IN social_connections
DELETE FROM public.social_connections a USING public.social_connections b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.platform = b.platform 
  AND a.platform_user_id = b.platform_user_id;

-- 4. ADD UNIQUE CONSTRAINT TO social_connections
ALTER TABLE public.social_connections 
DROP CONSTRAINT IF EXISTS social_connections_platform_user_unique;

ALTER TABLE public.social_connections 
ADD CONSTRAINT social_connections_platform_user_unique UNIQUE (user_id, platform, platform_user_id);

-- 5. ENSURE platform_user_id IS NOT NULL FOR NEW CONN
-- This prevents issues with the unique constraint
UPDATE public.social_accounts SET platform_user_id = id::text WHERE platform_user_id IS NULL;
UPDATE public.social_connections SET platform_user_id = id::text WHERE platform_user_id IS NULL;
