-- === OTIMIZAÇÃO DE PERFORMANCE E CRON ===
-- 1. Índices para social_sync_tasks (consultado a cada execução do cron)
-- 2. Coluna last_refresh_attempt para rastrear tentativas de refresh
-- 3. Ajuste de frequências dos crons para reduzir consumo de computação

-- 1. ÍNDICES PARA SOCIAL_SYNC_TASKS
CREATE INDEX IF NOT EXISTS idx_sync_tasks_status_next
  ON public.social_sync_tasks (status, next_sync_at)
  WHERE status IN ('pending', 'processing', 'failed');

CREATE INDEX IF NOT EXISTS idx_sync_tasks_status_sync_type
  ON public.social_sync_tasks (status, sync_type, next_sync_at)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_sync_tasks_connection_id
  ON public.social_sync_tasks (connection_id);

CREATE INDEX IF NOT EXISTS idx_sync_tasks_created_at
  ON public.social_sync_tasks (created_at DESC);

-- 2. COLUNA PARA CONTROLE DE REFRESH DE TOKENS
ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS last_refresh_attempt TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS refresh_error TEXT;

-- 3. REMOÇÃO DE CRONS DUPLICADOS E AJUSTE DE FREQUÊNCIA
-- Remove crons duplicados/desnecessários
SELECT cron.unschedule('process-job-queue');
SELECT cron.unschedule('historical-sync-every-5-min');
SELECT cron.unschedule('sync-youtube-analytics-6h');
SELECT cron.unschedule('sync-google-analytics-6h');

-- Substitui 'process-job-queue' por versão menos frequente (a cada 5 min)
SELECT cron.schedule(
  'process-job-queue-v2',
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

-- Substitui 'historical-sync-every-5-min' por versão a cada 30 min
SELECT cron.schedule(
  'historical-sync-every-30-min',
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

-- Atualiza 'collect-social-analytics-v2' de 4h para 6h (já temos sync-social-analytics-3h)
SELECT cron.unschedule('collect-social-analytics-v2');
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

-- Remove sync-social-analytics-3h (duplicado)
SELECT cron.unschedule('sync-social-analytics-3h');

-- Atualiza refresh-tokens-v2 de 6h para 12h (menos crítico)
SELECT cron.unschedule('refresh-tokens-v2');
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

-- Remove refresh-tokens-cron diário (duplicado do v2)
SELECT cron.unschedule('refresh-tokens-cron');

COMMENT ON TABLE public.social_sync_tasks IS 'Fila de tarefas de sincronização otimizada com índices. Frequências: polling=6h, historical=30min';
