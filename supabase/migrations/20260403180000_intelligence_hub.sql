-- Add sub_source and metadata to trends
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS sub_source TEXT;
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add sub_source to political_trends
ALTER TABLE public.political_trends ADD COLUMN IF NOT EXISTS sub_source TEXT;

-- Create hashtag_metrics table for tracking cross-platform propagation
CREATE TABLE IF NOT EXISTS public.hashtag_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hashtag TEXT NOT NULL,
    platform TEXT NOT NULL,
    reach_estimate INTEGER DEFAULT 0,
    mentions_count INTEGER DEFAULT 0,
    velocity_score NUMERIC DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(hashtag, platform, recorded_at)
);

-- Create competitor_intel table
CREATE TABLE IF NOT EXISTS public.competitor_intel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    followers_count INTEGER DEFAULT 0,
    engagement_rate NUMERIC DEFAULT 0,
    top_mentions TEXT[],
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(competitor_name, platform)
);

-- Enable RLS
ALTER TABLE public.hashtag_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_intel ENABLE ROW LEVEL SECURITY;

-- Policies for hashtag_metrics
CREATE POLICY "authenticated_select_hashtags" ON public.hashtag_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_hashtags" ON public.hashtag_metrics FOR INSERT TO authenticated WITH CHECK (true);

-- Policies for competitor_intel
CREATE POLICY "authenticated_select_competitors" ON public.competitor_intel FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_competitors" ON public.competitor_intel FOR INSERT TO authenticated WITH CHECK (true);
