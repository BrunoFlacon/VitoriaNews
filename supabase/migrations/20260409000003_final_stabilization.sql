-- Migration: Final Stabilization of Social Metrics and Messaging Visuals
-- Date: 2026-04-09

-- Ensure all metrics columns exist in social_accounts with correct types
ALTER TABLE public.social_accounts 
ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;

-- Ensure messaging channels have columns for group/channel visuals and stats
ALTER TABLE public.messaging_channels 
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS cover_photo TEXT,
ADD COLUMN IF NOT EXISTS members_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS online_count INTEGER DEFAULT 0;

-- Ensure account_metrics has matching columns for historical tracking
ALTER TABLE public.account_metrics 
ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;

-- Update existing records to reflect real data structure if necessary
-- (Any additional repair scripts can go here)
