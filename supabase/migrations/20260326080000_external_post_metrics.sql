-- Migração para suportar métricas de posts externos (não criados no app)
ALTER TABLE public.post_metrics ALTER COLUMN post_id DROP NOT NULL;
ALTER TABLE public.post_metrics ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.post_metrics ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.post_metrics ADD COLUMN IF NOT EXISTS media_url text;

-- Índice para busca rápida de posts externos
CREATE INDEX IF NOT EXISTS idx_post_metrics_external_id ON public.post_metrics(external_id);
-- Unicidade para evitar duplicatas de métricas do mesmo post externo no mesmo dia? 
-- Na verdade, post_metrics costuma ser uma série temporal. O dashboard pega o valor total.
