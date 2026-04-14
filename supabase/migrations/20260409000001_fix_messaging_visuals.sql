-- Migration: Fix Messaging Visuals by adding missing columns to messaging_channels
-- Date: 2026-04-09

ALTER TABLE public.messaging_channels ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE public.messaging_channels ADD COLUMN IF NOT EXISTS cover_photo TEXT;
ALTER TABLE public.messaging_channels ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE public.messaging_channels ADD COLUMN IF NOT EXISTS online_count INTEGER DEFAULT 0;
ALTER TABLE public.messaging_channels ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE public.messaging_channels ADD COLUMN IF NOT EXISTS last_message_at timestamptz;

-- Ensure RLS is updated if needed (usually columns don't break RLS)
