-- =============================================================================
-- CORREÇÃO DE SCHEMA: Colunas faltantes e tabelas não criadas
-- Data: 2026-06-04
-- Apenas estrutura (sem dados). Preparar para receber métricas FB/IG.
-- =============================================================================

-- =============================================================================
-- 1. account_metrics: adicionar colunas que faltam
-- =============================================================================
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS clicks_link INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS page_visits INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS profile_visits INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS new_followers INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS subscribers_count INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS metric_date DATE;

-- =============================================================================
-- 2. social_accounts: adicionar colunas que faltam
-- =============================================================================
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS page_id TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS account_type TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS total_followers INTEGER;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS total_posts INTEGER;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS total_engagement NUMERIC;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS estimated_earnings NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS monetization_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS sync_status TEXT;
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 90;

-- =============================================================================
-- 3. post_metrics: adicionar colunas que faltam
-- =============================================================================
ALTER TABLE public.post_metrics ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC;

-- =============================================================================
-- 4. Criar tabelas que não existem
-- =============================================================================

-- 4.1 Facebook Daily Retention (para bestTimes)
CREATE TABLE IF NOT EXISTS public.facebook_daily_retention (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    metric_date DATE NOT NULL UNIQUE,
    views_3s BIGINT NOT NULL DEFAULT 0,
    views_15s BIGINT NOT NULL DEFAULT 0,
    views_1min BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.facebook_daily_retention ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fdr_select" ON public.facebook_daily_retention
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "fdr_insert" ON public.facebook_daily_retention
    AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- 4.2 Facebook Daily Earnings
CREATE TABLE IF NOT EXISTS public.facebook_daily_earnings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    metric_date DATE NOT NULL UNIQUE,
    total_earnings_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
    video_earnings_usd NUMERIC(12,6),
    stars_earnings_usd NUMERIC(12,6),
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.facebook_daily_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fde_select" ON public.facebook_daily_earnings
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "fde_insert" ON public.facebook_daily_earnings
    AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- 4.3 Eventos de Ataque (versão final)
CREATE TABLE IF NOT EXISTS public.eventos_de_ataque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    tipo TEXT NOT NULL,
    descricao TEXT,
    plataforma TEXT,
    severity TEXT DEFAULT 'medium',
    detectado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eventos_de_ataque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ea_select" ON public.eventos_de_ataque
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "ea_insert" ON public.eventos_de_ataque
    AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4.4 API Responses Cache
CREATE TABLE IF NOT EXISTS public.api_responses_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_params JSONB DEFAULT '{}',
    response_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.api_responses_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arc_select" ON public.api_responses_cache
    AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4.5 Message Backups
CREATE TABLE IF NOT EXISTS public.message_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    backup_date DATE DEFAULT CURRENT_DATE,
    file_path TEXT NOT NULL,
    encryption_key_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, platform, chat_id, backup_date)
);
ALTER TABLE public.message_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mb_select" ON public.message_backups
    AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- =============================================================================
-- 5. media: garantir colunas das versões posteriores
-- =============================================================================
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS size INTEGER;
