-- Add missing columns for basic metrics to social_accounts
ALTER TABLE public.social_accounts 
ADD COLUMN IF NOT EXISTS platform_user_id text,
ADD COLUMN IF NOT EXISTS views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares integer DEFAULT 0;

-- Fill platform_user_id from username if null (as a fallback)
UPDATE public.social_accounts SET platform_user_id = username WHERE platform_user_id IS NULL;

-- Clean up potential duplicates before adding unique constraint
DELETE FROM public.social_accounts a
WHERE a.id NOT IN (
    SELECT MAX(id)
    FROM public.social_accounts
    GROUP BY user_id, platform, platform_user_id
);

-- Add uniqueness to allow upsert by (user, platform, platform_account_id)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_accounts_user_platform_platform_user_id_key') THEN
        ALTER TABLE public.social_accounts 
        ADD CONSTRAINT social_accounts_user_platform_platform_user_id_key UNIQUE (user_id, platform, platform_user_id);
    END IF;
END $$;

-- Also ensure account_metrics has the same columns for historical tracking
ALTER TABLE public.account_metrics
ADD COLUMN IF NOT EXISTS views integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares integer DEFAULT 0;

-- === MESSAGING CHANNELS EXPANSION ===
-- Add columns for profile picture and online member count
ALTER TABLE public.messaging_channels
ADD COLUMN IF NOT EXISTS profile_picture text,
ADD COLUMN IF NOT EXISTS online_count integer DEFAULT 0;
