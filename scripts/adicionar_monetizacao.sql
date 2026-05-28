-- Colunas de Monetização para Posts e Plataformas
-- Serão exibidas na área restrita de Faturamento e Planos

-- social_accounts: monetização por plataforma/conta
ALTER TABLE IF EXISTS public.social_accounts ADD COLUMN IF NOT EXISTS monetization_status TEXT DEFAULT 'unknown';
ALTER TABLE IF EXISTS public.social_accounts ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(12,2) DEFAULT 0;
ALTER TABLE IF EXISTS public.social_accounts ADD COLUMN IF NOT EXISTS ad_revenue_7d NUMERIC(12,2) DEFAULT 0;
ALTER TABLE IF EXISTS public.social_accounts ADD COLUMN IF NOT EXISTS ad_revenue_30d NUMERIC(12,2) DEFAULT 0;
ALTER TABLE IF EXISTS public.social_accounts ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL';

-- account_metrics: snapshot de receita por período
ALTER TABLE IF EXISTS public.account_metrics ADD COLUMN IF NOT EXISTS earnings NUMERIC(12,2) DEFAULT 0;
ALTER TABLE IF EXISTS public.account_metrics ADD COLUMN IF NOT EXISTS ad_revenue NUMERIC(12,2) DEFAULT 0;

-- post_metrics: monetização por publicação individual
ALTER TABLE IF EXISTS public.post_metrics ADD COLUMN IF NOT EXISTS earnings NUMERIC(12,2) DEFAULT 0;
ALTER TABLE IF EXISTS public.post_metrics ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.post_metrics ADD COLUMN IF NOT EXISTS sponsor_name TEXT;
ALTER TABLE IF EXISTS public.post_metrics ADD COLUMN IF NOT EXISTS ad_revenue NUMERIC(12,2) DEFAULT 0;

-- social_connections: receita total por conexão
ALTER TABLE IF EXISTS public.social_connections ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(12,2) DEFAULT 0;
ALTER TABLE IF EXISTS public.social_connections ADD COLUMN IF NOT EXISTS monetization_status TEXT DEFAULT 'unknown';

COMMENT ON COLUMN public.social_accounts.monetization_status IS 'Status de monetização: enabled, disabled, pending, unknown';
COMMENT ON COLUMN public.social_accounts.total_earnings IS 'Receita total acumulada da plataforma';
COMMENT ON COLUMN public.social_accounts.ad_revenue_7d IS 'Receita de anúncios nos últimos 7 dias';
COMMENT ON COLUMN public.social_accounts.ad_revenue_30d IS 'Receita de anúncios nos últimos 30 dias';
COMMENT ON COLUMN public.post_metrics.earnings IS 'Ganho financeiro desta publicação';
COMMENT ON COLUMN public.post_metrics.is_sponsored IS 'Se é conteúdo patrocinado';
COMMENT ON COLUMN public.post_metrics.sponsor_name IS 'Nome do patrocinador';
COMMENT ON COLUMN public.post_metrics.ad_revenue IS 'Receita de anúncios desta publicação';

SELECT 'Colunas de monetização criadas com sucesso!' AS resultado;
