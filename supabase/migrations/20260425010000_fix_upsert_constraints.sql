-- ============================================================
-- Migração: Constraints UNIQUE para UPSERT funcionar corretamente
-- Data: 2026-04-25
-- ============================================================

-- 1. google_analytics_data: UNIQUE para UPSERT funcionar
-- (collect-google-analytics usa onConflict: "user_id,property_id,metric_name,date")
ALTER TABLE public.google_analytics_data 
  DROP CONSTRAINT IF EXISTS google_analytics_data_user_property_metric_date_key;

ALTER TABLE public.google_analytics_data 
  ADD CONSTRAINT google_analytics_data_user_property_metric_date_key 
  UNIQUE (user_id, property_id, metric_name, date);

-- 2. post_metrics: UNIQUE para UPSERT funcionar
-- (collect-social-analytics usa onConflict: "user_id,platform,external_id")
-- Primeiro adicionar a coluna external_id se não existir
ALTER TABLE public.post_metrics 
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Criar a constraint UNIQUE
DROP INDEX IF EXISTS idx_post_metrics_unique_external;
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_metrics_unique_external 
  ON public.post_metrics (user_id, platform, external_id) 
  WHERE external_id IS NOT NULL;

-- 3. account_metrics: evitar inserções duplicadas no mesmo dia
-- (Só deve ter 1 snapshot por conta por dia)
DROP INDEX IF EXISTS idx_account_metrics_daily_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_metrics_daily_unique
  ON public.account_metrics (user_id, social_account_id, ((collected_at AT TIME ZONE 'UTC')::date));

-- 4. trends: UNIQUE para evitar duplicatas quando sincronizando
ALTER TABLE public.trends 
  ADD COLUMN IF NOT EXISTS keyword TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT 50,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS sub_source TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';

-- Índice de performance para tendências
CREATE INDEX IF NOT EXISTS idx_trends_detected_at ON public.trends (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_source ON public.trends (source);
CREATE INDEX IF NOT EXISTS idx_trends_score ON public.trends (score DESC);

-- 5. api_credentials: UNIQUE para evitar duplicatas
ALTER TABLE public.api_credentials 
  DROP CONSTRAINT IF EXISTS api_credentials_user_platform_key;

-- Verificar se já existe e só criar se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'api_credentials_user_platform_key'
  ) THEN
    ALTER TABLE public.api_credentials 
      ADD CONSTRAINT api_credentials_user_platform_key 
      UNIQUE (user_id, platform);
  END IF;
END$$;

-- 6. messaging_channels: evitar duplicatas por channel_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_messaging_channels_unique
  ON public.messaging_channels (user_id, platform, channel_id)
  WHERE channel_id IS NOT NULL;

-- 7. Garantir que google_analytics_data tem permissão de UPDATE (para upsert)
DROP POLICY IF EXISTS "gad_update" ON public.google_analytics_data;
CREATE POLICY "gad_update" ON public.google_analytics_data 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 8. Garantir que youtube_analytics tem permissão de UPDATE
DROP POLICY IF EXISTS "ya_update" ON public.youtube_analytics;
CREATE POLICY "ya_update" ON public.youtube_analytics 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
