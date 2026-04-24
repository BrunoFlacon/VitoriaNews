-- ETAPA 1: Adicionar colunas faltantes
ALTER TABLE public.social_accounts
  ADD COLUMN IF NOT EXISTS platform_user_id TEXT,
  ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cover_photo TEXT,
  ADD COLUMN IF NOT EXISTS subscribers_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_id TEXT,
  ADD COLUMN IF NOT EXISTS page_name TEXT;

ALTER TABLE public.account_metrics
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments BIGINT DEFAULT 0;

ALTER TABLE public.post_metrics
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 0;

ALTER TABLE public.post_metrics ALTER COLUMN post_id DROP NOT NULL;

ALTER TABLE public.messaging_channels
  ADD COLUMN IF NOT EXISTS online_count INTEGER DEFAULT 0;

ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS cover_photo TEXT,
  ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscribers_count INTEGER DEFAULT 0;

-- ETAPA 2: Índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS social_accounts_user_platform_pid_unique
  ON public.social_accounts (user_id, platform, platform_user_id)
  WHERE platform_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS post_metrics_user_platform_extid_unique
  ON public.post_metrics (user_id, platform, external_id)
  WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trends_user_keyword_source_unique
  ON public.trends (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), keyword, COALESCE(source, ''));

CREATE UNIQUE INDEX IF NOT EXISTS trends_keyword_source_unique
  ON public.trends (keyword, COALESCE(source, ''))
  WHERE user_id IS NULL;

-- ETAPA 3: Novas tabelas
CREATE TABLE IF NOT EXISTS public.bot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  welcome_message TEXT,
  business_hours JSONB DEFAULT '{}'::jsonb,
  auto_reply BOOLEAN DEFAULT false,
  ai_enabled BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bot_settings_user_unique ON public.bot_settings (user_id);
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bot_settings_select ON public.bot_settings;
DROP POLICY IF EXISTS bot_settings_insert ON public.bot_settings;
DROP POLICY IF EXISTS bot_settings_update ON public.bot_settings;
DROP POLICY IF EXISTS bot_settings_delete ON public.bot_settings;
CREATE POLICY bot_settings_select ON public.bot_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY bot_settings_insert ON public.bot_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY bot_settings_update ON public.bot_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY bot_settings_delete ON public.bot_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.meta_ads_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id TEXT NOT NULL,
  name TEXT,
  status TEXT,
  objective TEXT,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  amount_spent NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS meta_ads_user_campaign_date_unique
  ON public.meta_ads_campaigns (user_id, campaign_id, COALESCE(date, '1900-01-01'::date));
CREATE INDEX IF NOT EXISTS meta_ads_user_date_idx ON public.meta_ads_campaigns (user_id, date DESC);
ALTER TABLE public.meta_ads_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meta_ads_select ON public.meta_ads_campaigns;
DROP POLICY IF EXISTS meta_ads_insert ON public.meta_ads_campaigns;
DROP POLICY IF EXISTS meta_ads_update ON public.meta_ads_campaigns;
DROP POLICY IF EXISTS meta_ads_delete ON public.meta_ads_campaigns;
DROP POLICY IF EXISTS meta_ads_service ON public.meta_ads_campaigns;
CREATE POLICY meta_ads_select ON public.meta_ads_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY meta_ads_insert ON public.meta_ads_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY meta_ads_update ON public.meta_ads_campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY meta_ads_delete ON public.meta_ads_campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY meta_ads_service ON public.meta_ads_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.google_analytics_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id TEXT,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  dimension_name TEXT,
  dimension_value TEXT,
  date DATE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ga_user_date_idx ON public.google_analytics_data (user_id, date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ga_unique_idx
  ON public.google_analytics_data (user_id, COALESCE(property_id, ''), metric_name, COALESCE(dimension_value, ''), date);
ALTER TABLE public.google_analytics_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ga_select ON public.google_analytics_data;
DROP POLICY IF EXISTS ga_insert ON public.google_analytics_data;
DROP POLICY IF EXISTS ga_update ON public.google_analytics_data;
DROP POLICY IF EXISTS ga_delete ON public.google_analytics_data;
DROP POLICY IF EXISTS ga_service ON public.google_analytics_data;
CREATE POLICY ga_select ON public.google_analytics_data FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ga_insert ON public.google_analytics_data FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY ga_update ON public.google_analytics_data FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ga_delete ON public.google_analytics_data FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ga_service ON public.google_analytics_data FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.youtube_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  channel_id TEXT,
  video_id TEXT,
  title TEXT,
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  comments BIGINT DEFAULT 0,
  shares BIGINT DEFAULT 0,
  subscribers_gained INTEGER DEFAULT 0,
  estimated_minutes_watched BIGINT DEFAULT 0,
  date DATE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS yt_user_date_idx ON public.youtube_analytics (user_id, date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS yt_unique_idx
  ON public.youtube_analytics (user_id, COALESCE(channel_id, ''), COALESCE(video_id, ''), date);
ALTER TABLE public.youtube_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS yt_select ON public.youtube_analytics;
DROP POLICY IF EXISTS yt_insert ON public.youtube_analytics;
DROP POLICY IF EXISTS yt_update ON public.youtube_analytics;
DROP POLICY IF EXISTS yt_delete ON public.youtube_analytics;
DROP POLICY IF EXISTS yt_service ON public.youtube_analytics;
CREATE POLICY yt_select ON public.youtube_analytics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY yt_insert ON public.youtube_analytics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY yt_update ON public.youtube_analytics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY yt_delete ON public.youtube_analytics FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY yt_service ON public.youtube_analytics FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.eventos_de_ataque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  tipo TEXT NOT NULL,
  descricao TEXT,
  plataforma TEXT,
  severity TEXT DEFAULT 'medium',
  detectado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eventos_detectado_idx ON public.eventos_de_ataque (detectado_em DESC);
ALTER TABLE public.eventos_de_ataque ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eventos_select ON public.eventos_de_ataque;
DROP POLICY IF EXISTS eventos_service ON public.eventos_de_ataque;
CREATE POLICY eventos_select ON public.eventos_de_ataque FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY eventos_service ON public.eventos_de_ataque FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ETAPA 4: Triggers
DROP TRIGGER IF EXISTS bot_settings_set_updated_at ON public.bot_settings;
CREATE TRIGGER bot_settings_set_updated_at
  BEFORE UPDATE ON public.bot_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS meta_ads_set_updated_at ON public.meta_ads_campaigns;
CREATE TRIGGER meta_ads_set_updated_at
  BEFORE UPDATE ON public.meta_ads_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();