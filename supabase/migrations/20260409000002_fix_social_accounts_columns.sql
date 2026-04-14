-- Migration: Fix Social Accounts Metrics Columns
-- Date: 2026-04-09

-- Ensure all metrics columns exist in social_accounts
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS following INTEGER DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS subscribers_count INTEGER DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS page_name TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS cover_photo TEXT;

-- Ensure account_metrics also has these columns for historical data
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS following INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;

-- Fix any potentially missing columns in messaging_channels as well
ALTER TABLE public.messaging_channels ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE public.messaging_channels ADD COLUMN IF NOT EXISTS cover_photo TEXT;
ALTER TABLE public.messaging_channels ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE public.messaging_channels ADD COLUMN IF NOT EXISTS online_count INTEGER DEFAULT 0;
