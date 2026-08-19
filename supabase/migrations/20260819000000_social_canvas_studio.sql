-- Migration: Social Canvas Studio (Cover Creator & Analytics)
-- Date: 2026-08-19

-- 1. Table for Cover Projects (Studio Editor Saved State)
CREATE TABLE IF NOT EXISTS public.cover_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Capa Sem Título',
    media_type VARCHAR(50) NOT NULL DEFAULT 'video', -- 'video', 'live', 'audio', 'short'
    aspect_ratio VARCHAR(20) NOT NULL DEFAULT '16:9', -- '16:9', '9:16', '1:1', '4:5'
    canvas_width INTEGER NOT NULL DEFAULT 1920,
    canvas_height INTEGER NOT NULL DEFAULT 1080,
    layers JSONB NOT NULL DEFAULT '[]'::jsonb,
    export_url TEXT,
    thumbnail_url TEXT,
    is_template BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table for Cover Templates (Presets)
CREATE TABLE IF NOT EXISTS public.cover_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'geral', -- 'youtube', 'reels', 'podcast', 'live', 'noticias'
    aspect_ratio VARCHAR(20) NOT NULL DEFAULT '16:9',
    preview_url TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_official BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table for Cover Analytics & CTR Telemetry
CREATE TABLE IF NOT EXISTS public.cover_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cover_project_id UUID REFERENCES public.cover_projects(id) ON DELETE SET NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'youtube', 'instagram', 'facebook', 'spotify', etc.
    media_type VARCHAR(50) NOT NULL DEFAULT 'video',
    cover_url TEXT NOT NULL,
    impressions_count INTEGER NOT NULL DEFAULT 0,
    clicks_count INTEGER NOT NULL DEFAULT 0,
    ctr_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN impressions_count > 0 THEN ROUND((clicks_count::numeric / impressions_count::numeric) * 100, 2) ELSE 0 END
    ) STORED,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.cover_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_analytics ENABLE ROW LEVEL SECURITY;

-- Cover Projects Policies
CREATE POLICY "Users can manage their own cover projects"
    ON public.cover_projects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Cover Templates Policies (Readable by authenticated users)
CREATE POLICY "Anyone authenticated can view templates"
    ON public.cover_templates FOR SELECT
    USING (auth.role() = 'authenticated' OR is_official = true);

-- Cover Analytics Policies
CREATE POLICY "Users can view their own cover analytics"
    ON public.cover_analytics FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cover_projects_user ON public.cover_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_analytics_user_platform ON public.cover_analytics(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_cover_analytics_project ON public.cover_analytics(cover_project_id);
