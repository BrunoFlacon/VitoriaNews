-- Migration: Expand social_accounts and add analytics tables
-- Date: 2026-04-05

-- Add missing columns to social_accounts
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT true;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS chat_type TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS cover_photo TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS subscribers_count INTEGER DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS page_name TEXT;

-- Ensure comments column exists as BIGINT
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS comments BIGINT DEFAULT 0;

-- Meta Ads Campaigns table
CREATE TABLE IF NOT EXISTS public.meta_ads_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  status TEXT,
  objective TEXT,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  amount_spent NUMERIC,
  impressions BIGINT,
  clicks BIGINT,
  reach BIGINT,
  frequency NUMERIC,
  ctr NUMERIC,
  cpc NUMERIC,
  cpm NUMERIC,
  conversions BIGINT,
  metadata JSONB,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.meta_ads_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mac_select" ON public.meta_ads_campaigns;
CREATE POLICY "mac_select" ON public.meta_ads_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "mac_insert" ON public.meta_ads_campaigns;
CREATE POLICY "mac_insert" ON public.meta_ads_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "mac_update" ON public.meta_ads_campaigns;
CREATE POLICY "mac_update" ON public.meta_ads_campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "mac_delete" ON public.meta_ads_campaigns;
CREATE POLICY "mac_delete" ON public.meta_ads_campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Google Analytics Data table
CREATE TABLE IF NOT EXISTS public.google_analytics_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  property_id TEXT,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  dimension TEXT,
  dimension_value TEXT,
  date DATE,
  metadata JSONB,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.google_analytics_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gad_select" ON public.google_analytics_data;
CREATE POLICY "gad_select" ON public.google_analytics_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "gad_insert" ON public.google_analytics_data;
CREATE POLICY "gad_insert" ON public.google_analytics_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- YouTube Analytics table
CREATE TABLE IF NOT EXISTS public.youtube_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  video_id TEXT,
  channel_id TEXT,
  views BIGINT,
  watch_time_minutes BIGINT,
  likes BIGINT,
  comments BIGINT,
  subscribers_gained INTEGER,
  date DATE,
  metadata JSONB,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.youtube_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ya_select" ON public.youtube_analytics;
CREATE POLICY "ya_select" ON public.youtube_analytics FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ya_insert" ON public.youtube_analytics;
CREATE POLICY "ya_insert" ON public.youtube_analytics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_ads_user ON public.meta_ads_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_campaign ON public.meta_ads_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_google_analytics_user ON public.google_analytics_data(user_id);
CREATE INDEX IF NOT EXISTS idx_google_analytics_date ON public.google_analytics_data(date);
CREATE INDEX IF NOT EXISTS idx_youtube_analytics_user ON public.youtube_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_analytics_channel ON public.youtube_analytics(channel_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_cover ON public.social_accounts(cover_photo) WHERE cover_photo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_accounts_subscribers ON public.social_accounts(subscribers_count) WHERE subscribers_count IS NOT NULL;
