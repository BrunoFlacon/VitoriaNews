-- Migração para Automação de Analytics e Cron Jobs

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Garantir que as tabelas de métricas suportam os dados novos
ALTER TABLE public.account_metrics 
ADD COLUMN IF NOT EXISTS platform text,
ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;

-- 3. Adicionar uma coluna de social_account_id em post_metrics se não existir (para facilitar join)
ALTER TABLE public.post_metrics
ADD COLUMN IF NOT EXISTS social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE CASCADE;

-- 4. Adicionar unicidade em post_metrics para evitar duplicatas de coleta no mesmo periodo
-- Um post em uma plataforma deve ter apenas um registro por coleta (ou por hora)
-- Mas para simplificar, permitimos múltiplos e o dashboard pega o mais recente.

-- 5. Configurar o Cron Job para rodar a cada 3 horas
-- Nota: O cron job chama a Edge Function 'collect-social-analytics'
-- Substitua 'YOUR_SERVICE_ROLE_KEY' se for rodar manualmente via SQL Editor.
-- Em ambiente real do Supabase, o recomendado é usar a dashboard de Cron ou Vault.
-- Mas deixaremos o esqueleto funcional:

DELETE FROM cron.job WHERE jobname = 'sync-social-analytics-3h';

SELECT cron.schedule(
  'sync-social-analytics-3h',
  '0 */3 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/collect-social-analytics',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body:='{}'::jsonb
    )
  $$
);

-- 6. Indices extras para performance de busca por periodo
CREATE INDEX IF NOT EXISTS idx_account_metrics_collected_at ON public.account_metrics(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_metrics_collected_at ON public.post_metrics(collected_at DESC);
