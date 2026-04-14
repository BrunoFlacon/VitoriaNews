-- MASTER SCHEMA FIX v3: FINAL VERSION
-- Resolves: Duplicates, Online Status, Members counts, and Profile metadata
-- Date: 2026-04-10

-- 1. Create missing columns with correct types
ALTER TABLE public.messaging_channels 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS invite_link TEXT,
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS cover_photo TEXT,
ADD COLUMN IF NOT EXISTS members_count INTEGER DEFAULT 0;

-- 2. DEDUPLICATION: Remove duplicates that share the same user, platform, and channel_id
-- This allows us to create the UNIQUE constraint safely.
DELETE FROM public.messaging_channels a USING public.messaging_channels b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.platform = b.platform 
  AND a.channel_id = b.channel_id;

-- 3. UNIQUE CONSTRAINT: This makes UPSERT (Update if exists) possible and prevents duplicates
ALTER TABLE public.messaging_channels 
DROP CONSTRAINT IF EXISTS unique_channel_per_user;

ALTER TABLE public.messaging_channels 
ADD CONSTRAINT unique_channel_per_user UNIQUE (user_id, platform, channel_id);

-- 4. SOCIAL ACCOUNTS METRICS
ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_messaging_channels_platform_uid ON public.messaging_channels(platform, channel_id);
CREATE INDEX IF NOT EXISTS idx_messaging_channels_is_online ON public.messaging_channels(is_online) WHERE is_online = true;
