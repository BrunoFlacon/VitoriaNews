-- Tabela normalizada de métricas de monetização por plataforma
-- Registra receita granular por fonte (superchat, pix, ads) e tipo de post

CREATE TABLE IF NOT EXISTS public.social_monetization_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    post_id UUID REFERENCES public.post_metrics(id) ON DELETE SET NULL,
    post_type TEXT NOT NULL DEFAULT 'unknown',
    source TEXT NOT NULL CHECK (source IN ('superchat', 'pix', 'ads', 'sponsorship', 'subscription', 'tips', 'other')),
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BRL',
    description TEXT,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monetization_user_platform ON public.social_monetization_metrics(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_monetization_collected_at ON public.social_monetization_metrics(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_monetization_source ON public.social_monetization_metrics(source);

ALTER TABLE public.social_monetization_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem suas proprias receitas"
    ON public.social_monetization_metrics
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role gerencia receitas"
    ON public.social_monetization_metrics
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.social_monetization_metrics IS 'Registros granulares de receita por plataforma, tipo de post e fonte';
COMMENT ON COLUMN public.social_monetization_metrics.source IS 'Fonte da receita: superchat, pix, ads, sponsorship, subscription, tips, other';
COMMENT ON COLUMN public.social_monetization_metrics.post_type IS 'Tipo de post: live, story, reels, shorts, video, post, carousel, etc';
