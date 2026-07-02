-- Migration: Final Sync Hardening
-- Date: 2026-04-09

-- Ensure social_connections has all metric columns for immediate UI display
ALTER TABLE public.social_connections 
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Ensure social_accounts is aligned
ALTER TABLE public.social_accounts 
ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS cover_photo TEXT;

-- Ensure messaging_channels can store real visuals
ALTER TABLE public.messaging_channels 
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS cover_photo TEXT;

-- Create indexes for faster Lookups during sync (ensuring columns exist first)
ALTER TABLE public.social_connections ADD COLUMN IF NOT EXISTS platform_user_id TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS platform_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_social_connections_platform_user_id ON public.social_connections(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform_user_id ON public.social_accounts(platform_user_id);
