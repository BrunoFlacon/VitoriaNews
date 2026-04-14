-- Migration: Align social_accounts column names
-- Date: 2026-04-10

-- The Edge Functions upsert with 'followers_count' but the table uses 'followers'.
-- Add followers_count as an alias column if it doesn't exist.
ALTER TABLE public.social_accounts 
  ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;

-- Sync existing followers -> followers_count for existing rows
UPDATE public.social_accounts 
SET followers_count = followers 
WHERE followers_count = 0 AND followers > 0;

-- Also ensure the discover function can read/write posts_count on messaging_channels
ALTER TABLE public.messaging_channels 
  ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;

-- Ensure members_count is available (it maps to 'followers' concept for chats)
ALTER TABLE public.messaging_channels 
  ADD COLUMN IF NOT EXISTS members_count INTEGER DEFAULT 0;
