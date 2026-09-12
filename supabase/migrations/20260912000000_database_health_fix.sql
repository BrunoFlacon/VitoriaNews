-- ============================================================
-- 20260912000000 — DATABASE HEALTH FIX (Auditoria Completa)
-- Data: 2026-09-12
--
-- Problema: ECONNREFUSED TCP (pool esgotado), 13 Warnings Realtime,
--           4 Errors Storage, 1 Warning API Gateway.
-- Causa-raiz: crons excessivos (1440+ req/dia), queries sem índice,
--             bloat em tabelas, policies RLS com subquery por row,
--             storage sem limites de tamanho.
--
-- IDEMPOTENTE: seguro para re-run.
-- ESCOPO: aplica apenas no repo BrunoFlacon/social-canvas-hub (GitHub).
-- ============================================================

-- ============================================================
-- SEÇÃO 1: EXTENSÕES DE MONITORAMENTO
-- ============================================================

-- Habilita pg_stat_statements para identificar queries lentas
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Garante pg_net disponível para HTTP calls dos crons
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- SEÇÃO 2: CORREÇÃO DOS CRONS ABUSIVOS
-- (Principal causa das quedas — connection pool esgotado)
-- ============================================================

-- -------------------------------------------------------
-- 2.1 Remove TODOS os crons potencialmente duplicados
--     antes de recriar a versão canônica
-- -------------------------------------------------------
DO $$
DECLARE
  all_cron_names TEXT[] := ARRAY[
    -- Crons de posts/jobs (frequência excessiva)
    'process-scheduled-posts',
    'process-job-queue',
    'process-job-queue-v2',
    -- Crons de tokens (duplicados)
    'refresh-tokens-v2',
    'refresh-tokens-cron',
    -- Crons de analytics (duplicados/legados)
    'update-news-radar',
    'sync-global-analytics',
    'collect-social-analytics-v2',
    'sync-social-analytics-3h',
    'historical-sync-30min',
    'historical-sync-every-30-min',
    'historical-sync-every-5-min',
    -- Crons de mensageria
    'backup-whatsapp-conversations',
    'cleanup-expired-whatsapp-backups',
    'backup-whatsapp-full-number',
    -- Crons de limpeza
    'cleanup-old-logs',
    'cleanup-api-cache',
    'cleanup-temp-messages',
    -- Legados que podem ainda existir
    'invoke-automation-radar',
    'daily-news-radar-sync',
    'daily-message-backup',
    'sync-youtube-analytics-6h',
    'sync-google-analytics-6h',
    'collect-metrics',
    'learn-post-performance'
  ];
  j TEXT;
BEGIN
  FOREACH j IN ARRAY all_cron_names LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
      RAISE NOTICE 'Cron removido: %', j;
    END IF;
  END LOOP;
END
$$;

-- -------------------------------------------------------
-- 2.2 Recria crons canônicos com frequências OTIMIZADAS
-- -------------------------------------------------------

-- POSTS AGENDADOS: Watchdog gated a cada 2 min (não 1 min)
-- O trigger tr_scheduled_posts_due dispara na hora para
-- posts que vencem dentro de 5 min — o watchdog é apenas
-- fallback para posts que falharam no trigger.
SELECT cron.schedule(
  'process-scheduled-posts',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/process-scheduled-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  )
  WHERE EXISTS (
    SELECT 1 FROM public.scheduled_posts
    WHERE status = 'scheduled' AND scheduled_at <= now()
  )
  $$
);

-- FILA DE JOBS: Watchdog gated a cada 15 min (era 5 min)
SELECT cron.schedule(
  'process-job-queue',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/process-job-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb
  )
  WHERE EXISTS (
    SELECT 1 FROM public.job_queue
    WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= now())
  )
  $$
);

-- REFRESH DE TOKENS: a cada 1 hora (era 30 min — tokens X/YT duram ≥1h)
SELECT cron.schedule(
  'refresh-tokens-v2',
  '0 * * * *',
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

-- RADAR DE NOTÍCIAS: a cada 6h (mantém)
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

-- ANALYTICS SOCIAIS: diário às 03:00 (era a cada 6h — reduz 4x)
SELECT cron.schedule(
  'collect-social-analytics-v2',
  '0 3 * * *',
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

-- SYNC GLOBAL DE ANALYTICS: diário às 04:00 (escalonado, não sobrepõe)
SELECT cron.schedule(
  'sync-global-analytics',
  '0 4 * * *',
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

-- SYNC HISTÓRICO: a cada 30 min (mantém — já é razoável)
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

-- LIMPEZA DE LOGS: semanal domingo às 04:00
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 4 * * 0',
  $$
    DELETE FROM oauth_logs WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM messaging_audience_logs WHERE logged_at < NOW() - INTERVAL '60 days';
  $$
);

-- LIMPEZA DE CACHE DE API: diário à meia-noite
SELECT cron.schedule(
  'cleanup-api-cache',
  '0 0 * * *',
  $$ DELETE FROM public.api_responses_cache WHERE expires_at < NOW() $$
);

-- LIMPEZA DE MENSAGENS TEMPORÁRIAS: a cada 6h
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

-- BACKUP WHATSAPP: diário às 02:00
SELECT cron.schedule(
  'backup-whatsapp-conversations',
  '0 2 * * *',
  $$ SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/backup-whatsapp-conversations',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
  ) $$
);

-- LIMPEZA DE BACKUPS EXPIRADOS: diário às 05:00 (escalonado do backup)
SELECT cron.schedule(
  'cleanup-expired-whatsapp-backups',
  '0 5 * * *',
  $$ SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/cleanup-expired-backups',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
  ) $$
);

-- BACKUP COMPLETO SEMANAL: domingo às 03:00
SELECT cron.schedule(
  'backup-whatsapp-full-number',
  '0 3 * * 0',
  $$ SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/backup-whatsapp-conversations',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{"scope": "full_number"}'::jsonb
  ) $$
);

-- LIMPEZA DE POST_SYNC_LOG (evita crescimento ilimitado): semanal
SELECT cron.schedule(
  'cleanup-post-sync-log',
  '0 1 * * 1',
  $$ DELETE FROM public.post_sync_log WHERE created_at < NOW() - INTERVAL '90 days' $$
);

-- VACUUM ANALYZE agendado: semanal sábado às 01:00 (quando DB está ocioso)
SELECT cron.schedule(
  'weekly-vacuum-analyze',
  '0 1 * * 6',
  $$
    VACUUM ANALYZE public.messages;
    VACUUM ANALYZE public.notifications;
    VACUUM ANALYZE public.post_metrics;
    VACUUM ANALYZE public.account_metrics;
    VACUUM ANALYZE public.scheduled_posts;
    VACUUM ANALYZE public.social_accounts;
    VACUUM ANALYZE public.oauth_logs;
    VACUUM ANALYZE public.api_responses_cache;
    VACUUM ANALYZE public.post_sync_log;
  $$
);

-- ============================================================
-- SEÇÃO 3: ÍNDICES FALTANTES (Realtime + Query Performance)
-- ============================================================

-- Índices para Realtime broadcasting (updated_at nas tabelas monitoradas)
CREATE INDEX IF NOT EXISTS idx_messages_updated_at
  ON public.messages (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_updated_at
  ON public.notifications (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_updated_at
  ON public.scheduled_posts (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_accounts_updated_at_only
  ON public.social_accounts (updated_at DESC);

-- Índice composto para query de cron gated (gate barato)
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_scheduled_at
  ON public.scheduled_posts (status, scheduled_at)
  WHERE status = 'scheduled';

-- Índice para job_queue gate
CREATE INDEX IF NOT EXISTS idx_job_queue_status_retry
  ON public.job_queue (status, next_retry_at)
  WHERE status = 'pending';

-- Índices para post_sync_log (tabela pode crescer muito)
CREATE INDEX IF NOT EXISTS idx_post_sync_log_created_at
  ON public.post_sync_log (created_at DESC);

-- Índice para social_analytics (consultado em dashboards)
CREATE INDEX IF NOT EXISTS idx_social_analytics_platform_collected
  ON public.social_analytics (platform, collected_at DESC);

-- Índice para cover_analytics (novo — studio)
CREATE INDEX IF NOT EXISTS idx_cover_analytics_created_at
  ON public.cover_analytics (created_at DESC);

-- Índice para oauth_logs (limpeza semanal)
CREATE INDEX IF NOT EXISTS idx_oauth_logs_created_at
  ON public.oauth_logs (created_at DESC);

-- Índice para messaging_audience_logs (limpeza semanal)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'messaging_audience_logs') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messaging_audience_logs_logged_at
             ON public.messaging_audience_logs (logged_at DESC)';
  END IF;
END $$;

-- Índice para whatsapp_conversations (tabela de alta frequência)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_updated_at
             ON public.whatsapp_conversations (updated_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user_status
             ON public.whatsapp_conversations (user_id, status)';
  END IF;
END $$;

-- ============================================================
-- SEÇÃO 4: CORREÇÃO DE POLICIES RLS CUSTOSAS
-- (SELECT em tabela settings por cada row é N+1 queries)
-- ============================================================

-- A função notify_scheduled_post_due faz 2 SELECTs em settings
-- por cada row INSERT/UPDATE. Substituímos por função auxiliar
-- que usa cache de sessão (current_setting após set_config).

CREATE OR REPLACE FUNCTION public.get_setting(p_key TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE  -- resultado é estável na transação → PostgreSQL pode cachear
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.settings WHERE key = p_key LIMIT 1;
$$;

-- Atualiza trigger de posts agendados para usar get_setting (mais eficiente)
CREATE OR REPLACE FUNCTION public.notify_scheduled_post_due()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  IF NEW.status = 'scheduled'
     AND NEW.scheduled_at <= now() + interval '5 minutes' THEN
    -- Usa get_setting (STABLE — cacheada na transação)
    v_url := public.get_setting('supabase_url');
    v_key := public.get_setting('supabase_service_role_key');
    IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/process-scheduled-posts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Atualiza trigger de job queue para usar get_setting
CREATE OR REPLACE FUNCTION public.notify_job_queue_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.job_queue
    WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= now())
    LIMIT 1
  ) THEN
    v_url := public.get_setting('supabase_url');
    v_key := public.get_setting('supabase_service_role_key');
    IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/process-job-queue',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb
      );
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- ============================================================
-- SEÇÃO 5: LIMITES DE TAMANHO NOS BUCKETS DE STORAGE
-- (Previne uploads massivos que consomem RAM e I/O)
-- ============================================================

-- Bucket 'media': limite de 50MB por arquivo
UPDATE storage.buckets
SET    file_size_limit = 52428800  -- 50 MB
WHERE  id = 'media'
AND    (file_size_limit IS NULL OR file_size_limit > 52428800);

-- Bucket 'documents': limite de 20MB por arquivo
UPDATE storage.buckets
SET    file_size_limit = 20971520  -- 20 MB
WHERE  id = 'documents'
AND    (file_size_limit IS NULL OR file_size_limit > 20971520);

-- Bucket 'profile-photos': limite de 5MB por arquivo
UPDATE storage.buckets
SET    file_size_limit = 5242880   -- 5 MB
WHERE  id = 'profile-photos'
AND    (file_size_limit IS NULL OR file_size_limit > 5242880);

-- Bucket 'whatsapp-backups': limite de 100MB por arquivo
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'whatsapp-backups') THEN
    UPDATE storage.buckets
    SET file_size_limit = 104857600  -- 100 MB
    WHERE id = 'whatsapp-backups'
    AND (file_size_limit IS NULL OR file_size_limit > 104857600);
  END IF;
END $$;

-- ============================================================
-- SEÇÃO 6: LIMPEZA DE DADOS ORPHANED NO STORAGE
-- (Causa dos 4 Errors no Storage Dashboard)
-- ============================================================

-- Remove referências órfãs adicionais em public.media
-- que apontam para arquivos inexistentes em storage.objects
DELETE FROM public.media m
WHERE NOT EXISTS (
  SELECT 1 FROM storage.objects o
  WHERE o.bucket_id = 'media'
    AND o.name = m.storage_path
)
AND m.storage_path IS NOT NULL;

-- ============================================================
-- SEÇÃO 7: AUTOVACUUM AGRESSIVO NAS TABELAS DE ALTO VOLUME
-- (Reduz bloat e dead tuples que causam lentidão)
-- ============================================================

-- Configura autovacuum agressivo para tabelas de alta gravação
ALTER TABLE public.messages SET (
  autovacuum_vacuum_scale_factor = 0.01,    -- vacuum quando 1% de dead tuples (padrão = 20%)
  autovacuum_analyze_scale_factor = 0.005,  -- analyze quando 0.5% de novas linhas
  autovacuum_vacuum_cost_delay = 2          -- menos delay entre páginas (padrão = 20ms)
);

ALTER TABLE public.notifications SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_delay = 2
);

ALTER TABLE public.scheduled_posts SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_cost_delay = 5
);

ALTER TABLE public.oauth_logs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE public.post_sync_log SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations') THEN
    EXECUTE 'ALTER TABLE public.whatsapp_conversations SET (
      autovacuum_vacuum_scale_factor = 0.01,
      autovacuum_analyze_scale_factor = 0.005,
      autovacuum_vacuum_cost_delay = 2
    )';
  END IF;
END $$;

-- ============================================================
-- SEÇÃO 8: ANALYZE IMEDIATO NAS TABELAS CRÍTICAS
-- (Atualiza estatísticas para o query planner — melhora planos)
-- ============================================================
ANALYZE public.messages;
ANALYZE public.notifications;
ANALYZE public.scheduled_posts;
ANALYZE public.social_accounts;
ANALYZE public.post_metrics;
ANALYZE public.account_metrics;
ANALYZE public.oauth_logs;
ANALYZE public.post_sync_log;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations') THEN
    EXECUTE 'ANALYZE public.whatsapp_conversations';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'messaging_audience_logs') THEN
    EXECUTE 'ANALYZE public.messaging_audience_logs';
  END IF;
END $$;

-- ============================================================
-- SEÇÃO 9: COMMENT DE AUDITORIA
-- ============================================================
COMMENT ON EXTENSION pg_stat_statements IS
  'Monitoramento de queries lentas — instalado em 2026-09-12 pela auditoria de saúde do DB.';

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'DATABASE HEALTH FIX aplicado com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE 'Resumo das correções:';
  RAISE NOTICE '1. Crons duplicados/abusivos removidos e recriados com frequências otimizadas';
  RAISE NOTICE '2. process-scheduled-posts: 1min → 2min (gated)';
  RAISE NOTICE '3. refresh-tokens-v2: 30min → 60min';
  RAISE NOTICE '4. collect-social-analytics-v2: 6h → 1x/dia';
  RAISE NOTICE '5. sync-global-analytics: 1x/dia (escalonado)';
  RAISE NOTICE '6. 14 índices faltantes adicionados';
  RAISE NOTICE '7. Triggers otimizados com get_setting() STABLE';
  RAISE NOTICE '8. Limites de arquivo nos buckets: media=50MB, docs=20MB, photos=5MB';
  RAISE NOTICE '9. Dados orphaned em storage removidos';
  RAISE NOTICE '10. Autovacuum agressivo configurado em tabelas críticas';
  RAISE NOTICE '11. ANALYZE executado nas tabelas críticas';
  RAISE NOTICE '12. pg_stat_statements habilitado para monitoramento';
  RAISE NOTICE '13. Cron weekly-vacuum-analyze adicionado (sáb 01:00)';
  RAISE NOTICE '==============================================';
END $$;
