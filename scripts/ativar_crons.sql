-- =========================================================
--  ATIVAR TODOS OS CRON JOBS + TABELAS DE SUPORTE
--  Execute no SQL Editor do Supabase (uma única vez)
-- =========================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1b. CORREÇÕES DE COLUNAS FALTANTES EM post_metrics
ALTER TABLE IF EXISTS public.post_metrics ADD COLUMN IF NOT EXISTS views BIGINT DEFAULT 0;
ALTER TABLE IF EXISTS public.post_metrics ADD COLUMN IF NOT EXISTS post_url TEXT;
ALTER TABLE IF EXISTS public.post_metrics ADD COLUMN IF NOT EXISTS post_type TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_metrics_social_post
    ON public.post_metrics (social_account_id, post_id)
    WHERE post_id IS NOT NULL;

-- 2. TABELA DE CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

INSERT INTO public.settings (key, value)
VALUES ('supabase_url', 'https://ghtkdkauseesambzqfrd.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.settings (key, value)
VALUES ('supabase_service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodGtka2F1c2Vlc2FtYnpxZnJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk1NTAxNCwiZXhwIjoyMDg5NTMxMDE0fQ.tnh0poAxUBJNHvyg-2xPDcyiN__Dl6y_6FX5YDezN3M')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tudo liberado para service_role" ON public.settings;
CREATE POLICY "Tudo liberado para service_role" ON public.settings
    FOR ALL USING (true) WITH CHECK (true);

-- 3. TABELA DE RASTREAMENTO DE SYNC
CREATE TABLE IF NOT EXISTS public.historical_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    next_cursor TEXT,
    is_completed BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (social_account_id, platform)
);
ALTER TABLE public.historical_sync_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role gerencia cursores" ON public.historical_sync_state;
CREATE POLICY "Service role gerencia cursores" ON public.historical_sync_state
    FOR ALL USING (true) WITH CHECK (true);

-- 4. FUNÇÕES RPC (para o monitor de status)
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, active boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jobid, jobname, schedule, command, active FROM cron.job ORDER BY jobid;
$$;

CREATE OR REPLACE FUNCTION public.get_cron_run_details()
RETURNS TABLE(runid bigint, jobid bigint, job_pid integer, command text, status text, return_message text, start_time timestamptz, end_time timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT runid, jobid, job_pid, command, status, return_message, start_time, end_time
  FROM cron.job_run_details ORDER BY start_time DESC LIMIT 100;
$$;

REVOKE EXECUTE ON FUNCTION public.get_cron_jobs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_cron_run_details() FROM anon;

-- 5. REGISTRAR TODOS OS CRON JOBS

-- Limpa versões anteriores (com segurança, sem erro se não existir)
DO $$
DECLARE
  j text;
  jobs text[] := ARRAY[
    'historical-sync-every-5-min',
    'sync-social-analytics-3h',
    'sync-youtube-analytics-6h',
    'sync-google-analytics-6h',
    'refresh-tokens-cron',
    'invoke-automation-radar',
    'update-news-radar',
    'sync-global-analytics',
    'cleanup-old-logs',
    'cleanup-api-cache',
    'daily-message-backup',
    'cleanup-temp-messages',
    'daily-news-radar-sync'
  ];
BEGIN
  FOREACH j IN ARRAY jobs LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

-- 5a. HISTORICAL SYNC (a cada 5 min)
SELECT cron.schedule(
  'historical-sync-every-5-min',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/historical-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- 5b. SOCIAL ANALYTICS (a cada 3h)
SELECT cron.schedule(
    'sync-social-analytics-3h',
    '0 */3 * * *',
    $$
    SELECT net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/collect-social-analytics',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer '
          || (SELECT value FROM settings WHERE key = 'supabase_service_role_key') || '"}'::jsonb,
        body := '{"source": "cron"}'::jsonb
    );
    $$
);

-- 5c. YOUTUBE ANALYTICS (a cada 6h)
SELECT cron.schedule(
    'sync-youtube-analytics-6h',
    '0 */6 * * *',
    $$
    SELECT net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/collect-youtube-analytics',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer '
          || (SELECT value FROM settings WHERE key = 'supabase_service_role_key') || '"}'::jsonb,
        body := '{"source": "cron"}'::jsonb
    );
    $$
);

-- 5d. GOOGLE ANALYTICS (a cada 6h)
SELECT cron.schedule(
    'sync-google-analytics-6h',
    '0 */6 * * *',
    $$
    SELECT net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/collect-google-analytics',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer '
          || (SELECT value FROM settings WHERE key = 'supabase_service_role_key') || '"}'::jsonb,
        body := '{"source": "cron"}'::jsonb
    );
    $$
);

-- 5e. REFRESH TOKENS (diariamente às 2h)
SELECT cron.schedule(
    'refresh-tokens-cron',
    '0 2 * * *',
    $$
    SELECT net.http_post(
        url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/refresh-tokens-cron',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 5f. RADAR DE NOTÍCIAS (a cada 6h)
SELECT cron.schedule(
    'update-news-radar',
    '0 */6 * * *',
    $$
    SELECT net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/radar-api',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer '
          || (SELECT value FROM settings WHERE key = 'supabase_service_role_key') || '"}'::jsonb,
        body := '{"source": "cron"}'::jsonb
    );
    $$
);

-- 5g. SYNC GLOBAL ANALYTICS (diariamente às 3h)
SELECT cron.schedule(
    'sync-global-analytics',
    '0 3 * * *',
    $$
    SELECT net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/get-analytics',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer '
          || (SELECT value FROM settings WHERE key = 'supabase_service_role_key') || '"}'::jsonb,
        body := '{"source": "cron_sync", "period": "24h"}'::jsonb
    );
    $$
);

-- 5h. LIMPEZA DE LOGS (semanalmente aos domingos)
SELECT cron.schedule(
    'cleanup-old-logs',
    '0 4 * * 0',
    $$
    DELETE FROM oauth_logs WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM messaging_audience_logs WHERE logged_at < NOW() - INTERVAL '60 days';
    $$
);

-- 5i. LIMPEZA DE CACHE DE API (diariamente à meia-noite)
SELECT cron.schedule(
    'cleanup-api-cache',
    '0 0 * * *',
    $$ DELETE FROM public.api_responses_cache WHERE expires_at < NOW() $$
);

-- 5j. LIMPEZA DE MENSAGENS TEMPORÁRIAS (a cada 6h)
SELECT cron.schedule(
    'cleanup-temp-messages', '0 */6 * * *',
    $$
    SELECT net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/cleanup-temp-messages',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

-- 6. INICIALIZAR sync_state PARA CONTAS EXISTENTES
INSERT INTO public.historical_sync_state (social_account_id, platform, is_completed)
SELECT id, platform, false
FROM public.social_accounts
WHERE is_connected = true
ON CONFLICT (social_account_id, platform) DO NOTHING;

-- 7. VERIFICAR CRON JOBS REGISTRADOS
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobid;
