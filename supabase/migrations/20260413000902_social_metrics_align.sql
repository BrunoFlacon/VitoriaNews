-- ============================================================
-- social_metrics_align: Alinhamento de colunas de métricas
-- ============================================================

-- Garante que social_connections tenha todas as colunas de métricas
ALTER TABLE IF EXISTS public.social_connections
  ADD COLUMN IF NOT EXISTS posts_count      BIGINT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_picture  TEXT,
  ADD COLUMN IF NOT EXISTS followers_count  BIGINT  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_name        TEXT,
  ADD COLUMN IF NOT EXISTS page_id          TEXT,
  ADD COLUMN IF NOT EXISTS platform_user_id TEXT,
  ADD COLUMN IF NOT EXISTS username         TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata         JSONB   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT now();

-- Garante que social_metrics_history tenha todas as colunas necessárias
CREATE TABLE IF NOT EXISTS public.social_metrics_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform      TEXT        NOT NULL,
  followers     BIGINT      DEFAULT 0,
  posts_count   BIGINT      DEFAULT 0,
  views         BIGINT      DEFAULT 0,
  collected_at  TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_social_connections_user_platform
  ON public.social_connections(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_social_metrics_history_user_platform
  ON public.social_metrics_history(user_id, platform, collected_at DESC);

-- Garante que social_accounts (usada pelo Telegram) tenha as colunas corretas
ALTER TABLE IF EXISTS public.social_accounts
  ADD COLUMN IF NOT EXISTS posts_count     BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_picture TEXT,
  ADD COLUMN IF NOT EXISTS followers       BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT now();

-- RLS: permite que o usuário leia e edite seus próprios registros
ALTER TABLE public.social_metrics_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own metrics" ON public.social_metrics_history;
CREATE POLICY "Users can read own metrics"
  ON public.social_metrics_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert metrics" ON public.social_metrics_history;
CREATE POLICY "Service role can insert metrics"
  ON public.social_metrics_history
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE public.social_metrics_history IS 'Histórico de métricas coletadas das APIs de redes sociais';
