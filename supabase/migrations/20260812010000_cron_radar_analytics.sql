-- ============================================================
-- CONSOLIDAÇÃO DE CRONS — SISTEMA / RADAR / ANALYTICS
-- 2026-08-12
--
-- Remove jobs conflitantes/duplicados criados por migrações antigas
-- e recria o conjunto canônico de forma idempotente (safe para re-run).
-- Os crons de mensageria (whatsapp/telegram) ficam em arquivo próprio:
-- 20260812020000_cron_messaging_telegram.sql (independente deste).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ------------------------------------------------------------
-- 1. Remove jobs legados/conflitantes (existem ou não, é seguro)
-- ------------------------------------------------------------
DO $$
DECLARE
  legacy_names TEXT[] := ARRAY[
    'invoke-automation-radar',        -- apontava para 127.0.0.1 (morto)
    'daily-news-radar-sync',          -- duplicava o radar (2 jobs)
    'daily-message-backup',           -- função backup-messages inexistente
    'historical-sync-every-5-min',    -- substituído pelo de 30 min
    'historical-sync-every-30-min',   -- nome antigo do de 30 min
    'process-job-queue-v2',           -- renomeado de volta para process-job-queue
    'sync-social-analytics-3h',       -- duplicado do collect-social-analytics-v2
    'sync-youtube-analytics-6h',      -- removido (coberto por collect-social-analytics)
    'sync-google-analytics-6h',       -- removido (coberto por collect-social-analytics)
    'refresh-tokens-cron',            -- nome antigo do refresh-tokens-v2
    'collect-metrics',                -- legado
    'learn-post-performance'          -- legado
  ];
  j TEXT;
BEGIN
  FOREACH j IN ARRAY legacy_names LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END
$$;

-- ------------------------------------------------------------
-- 2. Jobs canônicos (unschedule + schedule = idempotente)
-- ------------------------------------------------------------

-- Fila de jobs de automação (a cada 5 min)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-job-queue') THEN
    PERFORM cron.unschedule('process-job-queue');
  END IF;
END
$$;
SELECT cron.schedule(
  'process-job-queue',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/process-job-queue',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'service_role_key')
      ),
      body := '{}'::jsonb
    )
  $$
);

-- Radar de notícias (a cada 6h) — auth aceita a chave das settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-news-radar') THEN
    PERFORM cron.unschedule('update-news-radar');
  END IF;
END
$$;
SELECT cron.schedule(
  'update-news-radar',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/radar-api',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{"source": "cron"}'::jsonb
    )
  $$
);

-- Sincronização global de analytics (diária às 03:00)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-global-analytics') THEN
    PERFORM cron.unschedule('sync-global-analytics');
  END IF;
END
$$;
SELECT cron.schedule(
  'sync-global-analytics',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/get-analytics',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{"source": "cron_sync", "period": "24h"}'::jsonb
    )
  $$
);

-- Sincronização histórica de posts (a cada 30 min)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'historical-sync-30min') THEN
    PERFORM cron.unschedule('historical-sync-30min');
  END IF;
END
$$;
SELECT cron.schedule(
  'historical-sync-30min',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/historical-sync',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    )
  $$
);

-- Coleta de analytics sociais (a cada 6h)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collect-social-analytics-v2') THEN
    PERFORM cron.unschedule('collect-social-analytics-v2');
  END IF;
END
$$;
SELECT cron.schedule(
  'collect-social-analytics-v2',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/collect-social-analytics',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{"is_cron": true}'::jsonb
    )
  $$
);

-- Refresh de tokens (a cada 12h)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-tokens-v2') THEN
    PERFORM cron.unschedule('refresh-tokens-v2');
  END IF;
END
$$;
SELECT cron.schedule(
  'refresh-tokens-v2',
  '0 */12 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/refresh-tokens-cron',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    )
  $$
);

-- Processamento de posts agendados (a cada 1 min)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-posts') THEN
    PERFORM cron.unschedule('process-scheduled-posts');
  END IF;
END
$$;
SELECT cron.schedule(
  'process-scheduled-posts',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/process-scheduled-posts',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    )
  $$
);

-- ------------------------------------------------------------
-- 3. Jobs de limpeza (SQL direto, sem função)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-logs') THEN
    PERFORM cron.unschedule('cleanup-old-logs');
  END IF;
END
$$;
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 4 * * 0',
  $$
    DELETE FROM oauth_logs WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM messaging_audience_logs WHERE logged_at < NOW() - INTERVAL '60 days';
  $$
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-api-cache') THEN
    PERFORM cron.unschedule('cleanup-api-cache');
  END IF;
END
$$;
SELECT cron.schedule(
  'cleanup-api-cache',
  '0 0 * * *',
  $$ DELETE FROM public.api_responses_cache WHERE expires_at < NOW() $$
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-temp-messages') THEN
    PERFORM cron.unschedule('cleanup-temp-messages');
  END IF;
END
$$;
SELECT cron.schedule(
  'cleanup-temp-messages',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/cleanup-temp-messages',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    )
  $$
);
