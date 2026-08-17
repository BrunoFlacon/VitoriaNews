-- ============================================================
-- 20260813010000 — Crons ON-DEMAND (event-driven + watchdog gated)
-- ------------------------------------------------------------
-- Problema:
--   process-scheduled-posts rodava * * * * *  (1440 invocações/dia)
--   process-job-queue       rodava */5 * * * * (288 invocações/dia)
--   mesmo quando não havia nada para processar (consumo desnecessário).
--
-- Solução:
--   1. Triggers AFTER INSERT/UPDATE disparam a edge function NA HORA
--      quando há trabalho real (post agendado vencendo / job pendente).
--   2. Crons de watchdog com gate: o SQL só chama a função se
--      EXISTS(work) — custo de microssegundos por tick, ZERO
--      invocações quando ocioso.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Índices para as buscas de vencimento (gate barato)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due
  ON public.scheduled_posts (scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_job_queue_pending
  ON public.job_queue (created_at)
  WHERE status = 'pending';

-- ------------------------------------------------------------
-- 2. Trigger: POST AGENDADO vencendo → processa na hora
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_scheduled_post_due()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  -- Dispara quando o post é (re)agendado e já está dentro da janela
  -- de execução (5 min antes ou já vencido). Posts distantes no tempo
  -- ficam por conta do watchdog gated (tick de 1 min).
  IF NEW.status = 'scheduled'
     AND NEW.scheduled_at <= now() + interval '5 minutes' THEN
    PERFORM net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/process-scheduled-posts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_scheduled_posts_due ON public.scheduled_posts;
CREATE TRIGGER tr_scheduled_posts_due
  AFTER INSERT OR UPDATE OF status, scheduled_at ON public.scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_scheduled_post_due();

-- ------------------------------------------------------------
-- 3. Trigger: JOB pendente → processa na hora
--    (statement-level: 1 chamada por statement, mesmo em bulk insert)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_job_queue_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.job_queue
    WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= now())
  ) THEN
    PERFORM net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/process-job-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  END IF;
  RETURN NULL; -- statement-level
END;
$$;

DROP TRIGGER IF EXISTS tr_job_queue_pending ON public.job_queue;
CREATE TRIGGER tr_job_queue_pending
  AFTER INSERT OR UPDATE OF status ON public.job_queue
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.notify_job_queue_pending();

-- ------------------------------------------------------------
-- 4. Watchdog process-scheduled-posts: tick de 1 min, GATED
--    (chama a função SOMENTE se existir post vencido agora)
-- ------------------------------------------------------------
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
  WHERE EXISTS (
    SELECT 1 FROM public.scheduled_posts
    WHERE status = 'scheduled' AND scheduled_at <= now()
  )
  $$
);

-- ------------------------------------------------------------
-- 5. Watchdog process-job-queue: tick de 15 min, GATED
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-job-queue') THEN
    PERFORM cron.unschedule('process-job-queue');
  END IF;
END
$$;

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
