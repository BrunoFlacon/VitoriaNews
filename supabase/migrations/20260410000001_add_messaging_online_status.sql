-- Migration: Add messaging online status metrics, invite link and activity status
-- Date: 2026-04-10

ALTER TABLE public.messaging_channels 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS invite_link TEXT;

-- Index for searching profiles/channels by name
CREATE INDEX IF NOT EXISTS idx_messaging_channels_full_name ON public.messaging_channels(full_name);
