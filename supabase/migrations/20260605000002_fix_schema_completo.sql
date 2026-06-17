-- =============================================================================
-- EXPANSÃO DE SCHEMA: Tabelas de métricas detalhadas (Facebook/Instagram)
-- Data: 2026-06-05
-- APENAS ESTRUTURA — sem dados. Preparar para receber INSERTs futuros.
-- =============================================================================

-- =============================================================================
-- 1. Expandir facebook_daily_retention com todas as durações de vídeo
-- =============================================================================
ALTER TABLE public.facebook_daily_retention ADD COLUMN IF NOT EXISTS views_30s BIGINT DEFAULT 0;
ALTER TABLE public.facebook_daily_retention ADD COLUMN IF NOT EXISTS views_3min BIGINT DEFAULT 0;
ALTER TABLE public.facebook_daily_retention ADD COLUMN IF NOT EXISTS views_5min BIGINT DEFAULT 0;
ALTER TABLE public.facebook_daily_retention ADD COLUMN IF NOT EXISTS views_10min BIGINT DEFAULT 0;
ALTER TABLE public.facebook_daily_retention ADD COLUMN IF NOT EXISTS views_15min BIGINT DEFAULT 0;
ALTER TABLE public.facebook_daily_retention ADD COLUMN IF NOT EXISTS views_20min BIGINT DEFAULT 0;
ALTER TABLE public.facebook_daily_retention ADD COLUMN IF NOT EXISTS views_30min BIGINT DEFAULT 0;
ALTER TABLE public.facebook_daily_retention ADD COLUMN IF NOT EXISTS views_45min BIGINT DEFAULT 0;
ALTER TABLE public.facebook_daily_retention ADD COLUMN IF NOT EXISTS views_55min BIGINT DEFAULT 0;
ALTER TABLE public.facebook_daily_retention ADD COLUMN IF NOT EXISTS views_1h BIGINT DEFAULT 0;

-- =============================================================================
-- 2. Criar facebook_daily_metrics (reach, followers, interactions diários)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.facebook_daily_metrics (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    metric_date DATE NOT NULL,
    metric_type TEXT NOT NULL,
    value BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(metric_date, metric_type)
);
ALTER TABLE public.facebook_daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fdm_select" ON public.facebook_daily_metrics
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "fdm_insert" ON public.facebook_daily_metrics
    AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- 3. Criar facebook_payment_receipts (comprovantes de pagamento)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.facebook_payment_receipts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount_usd NUMERIC(10,2) NOT NULL,
    payment_date DATE,
    payout_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(period_start, period_end)
);
ALTER TABLE public.facebook_payment_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fpr_select" ON public.facebook_payment_receipts
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "fpr_insert" ON public.facebook_payment_receipts
    AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- 4. Criar fb_ganhos_detalhados (ganhos por fonte)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.fb_ganhos_detalhados (
    id BIGSERIAL PRIMARY KEY,
    data_consolidacao DATE,
    ganhos_totais NUMERIC(12,2),
    anuncios_in_stream NUMERIC(12,2),
    monetizacao_conteudo NUMERIC(12,2),
    reels NUMERIC(12,2),
    estrelas NUMERIC(12,2),
    estrelas_qtd INT,
    fonte_imagem TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.fb_ganhos_detalhados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fgd_select" ON public.fb_ganhos_detalhados
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "fgd_insert" ON public.fb_ganhos_detalhados
    AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- 5. Criar fb_metricas_video_periodo (métricas de vídeo consolidadas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.fb_metricas_video_periodo (
    id BIGSERIAL PRIMARY KEY,
    periodo_inicio DATE,
    periodo_fim DATE,
    visualizacoes_3s BIGINT,
    visualizacoes_1min BIGINT,
    minutos_visualizados_total NUMERIC(12,2),
    fonte_imagem TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.fb_metricas_video_periodo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fmvp_select" ON public.fb_metricas_video_periodo
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "fmvp_insert" ON public.fb_metricas_video_periodo
    AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- 6. Criar fb_resumo_periodo (resumo por período)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.fb_resumo_periodo (
    id BIGSERIAL PRIMARY KEY,
    periodo_inicio DATE,
    periodo_fim DATE,
    seguidores_total INT,
    novos_seguidores INT,
    deixaram_de_seguir INT,
    seguidores_liquidos INT,
    alcance BIGINT,
    variacao_alcance_pct NUMERIC(8,2),
    fonte_imagem TEXT,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.fb_resumo_periodo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "frp_select" ON public.fb_resumo_periodo
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "frp_insert" ON public.fb_resumo_periodo
    AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- 7. Habilitar Realtime nas tabelas de métricas
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.facebook_daily_retention;
ALTER PUBLICATION supabase_realtime ADD TABLE public.facebook_daily_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.facebook_daily_earnings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_hourly_performance;
