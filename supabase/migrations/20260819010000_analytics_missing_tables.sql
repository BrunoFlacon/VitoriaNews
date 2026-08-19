-- =====================================================================
-- Migration: Criar 5 tabelas de analytics ausentes
-- Data: 2026-08-19
-- Fase: AUDIT_STORY_SYSTEM → FASE 5 (código morto / tabelas sem migration)
--
-- Essas tabelas são consultadas por get-analytics/index.ts via
-- Promise.allSettled (falham silenciosamente sem estas migrations).
-- =====================================================================

-- 1. video_retention — retenção de viewers ao longo do vídeo
CREATE TABLE IF NOT EXISTS public.video_retention (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id      TEXT,               -- ID do vídeo na plataforma
  platform      TEXT NOT NULL,       -- youtube, tiktok, etc.
  title         TEXT,
  duration      NUMERIC,             -- duração total em segundos
  views         INTEGER DEFAULT 0,   -- views totais
  avg_watch_pct NUMERIC,             -- percentual médio assistido (0-1)
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_retention_user_date
  ON public.video_retention(user_id, date);

ALTER TABLE public.video_retention ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own video_retention"
  ON public.video_retention FOR ALL
  USING (auth.uid() = user_id);


-- 2. format_reach_data — alcance por formato de conteúdo
CREATE TABLE IF NOT EXISTS public.format_reach_data (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,       -- instagram, facebook, youtube, etc.
  format_type   TEXT NOT NULL,       -- post, story, reels, short, carousel, video
  reach         INTEGER DEFAULT 0,
  impressions   INTEGER DEFAULT 0,
  engagement    INTEGER DEFAULT 0,
  collected_at  TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_format_reach_user_collected
  ON public.format_reach_data(user_id, collected_at);

ALTER TABLE public.format_reach_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own format_reach_data"
  ON public.format_reach_data FOR ALL
  USING (auth.uid() = user_id);


-- 3. viral_potential — score de potencial viral por post
CREATE TABLE IF NOT EXISTS public.viral_potential (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id       TEXT,               -- ID do post na plataforma
  platform      TEXT NOT NULL,
  score         NUMERIC DEFAULT 0,   -- 0-100
  shares        INTEGER DEFAULT 0,
  share_rate    NUMERIC,             -- shares / reach
  velocity      NUMERIC,             -- shares por hora
  trend         TEXT,                -- 'rising', 'stable', 'declining'
  collected_at  TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viral_potential_user_collected
  ON public.viral_potential(user_id, collected_at);

ALTER TABLE public.viral_potential ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own viral_potential"
  ON public.viral_potential FOR ALL
  USING (auth.uid() = user_id);


-- 4. demographics_data — demografia da audiência
CREATE TABLE IF NOT EXISTS public.demographics_data (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  age_groups    JSONB DEFAULT '[]'::jsonb,    -- [{range: "18-24", pct: 35}, ...]
  gender        JSONB DEFAULT '{}'::jsonb,    -- {male: 45, female: 52, other: 3}
  devices       JSONB DEFAULT '[]'::jsonb,    -- [{type: "mobile", pct: 72}, ...]
  top_cities    JSONB DEFAULT '[]'::jsonb,    -- [{name: "São Paulo", count: 1200}, ...]
  top_countries JSONB DEFAULT '[]'::jsonb,    -- [{name: "Brazil", count: 8000}, ...]
  collected_at  TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demographics_data_user
  ON public.demographics_data(user_id);

ALTER TABLE public.demographics_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own demographics_data"
  ON public.demographics_data FOR ALL
  USING (auth.uid() = user_id);


-- 5. social_analytics — snapshot periódico de métricas por plataforma
CREATE TABLE IF NOT EXISTS public.social_analytics (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL,
  platform_user_id  TEXT,
  username          TEXT,
  display_name      TEXT,
  profile_image_url TEXT,
  followers_count   INTEGER DEFAULT 0,
  following_count   INTEGER DEFAULT 0,
  posts_count       INTEGER DEFAULT 0,
  raw_data          JSONB DEFAULT '{}'::jsonb,
  collected_at      TIMESTAMPTZ DEFAULT now(),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_analytics_user_platform
  ON public.social_analytics(user_id, platform, collected_at);

ALTER TABLE public.social_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own social_analytics"
  ON public.social_analytics FOR ALL
  USING (auth.uid() = user_id);
