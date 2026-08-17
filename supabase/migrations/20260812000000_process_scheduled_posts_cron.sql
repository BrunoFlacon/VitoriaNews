-- === PROCESSAMENTO DE POSTS AGENDADOS ===
-- Varrê scheduled_posts vencidos (status='scheduled' e scheduled_at <= now) a cada 1 minuto
-- e dispara a edge function process-scheduled-posts, que publica via publish-post.

CREATE EXTENSION IF NOT EXISTS pg_cron;

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
