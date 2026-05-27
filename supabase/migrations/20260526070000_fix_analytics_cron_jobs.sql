-- Ativação de jobs CRON para coleta de analytics
-- Corrige itens 1.1, 1.7, 1.8: CRON jobs nunca foram ativados

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Coleta de Social Analytics (a cada 3 horas)
SELECT cron.schedule(
    'sync-social-analytics-3h',
    '0 */3 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/collect-social-analytics',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := '{"source": "cron"}'::jsonb
      );
    $$
);

-- 2. Coleta de YouTube Analytics (a cada 6 horas)
SELECT cron.schedule(
    'sync-youtube-analytics-6h',
    '0 */6 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/collect-youtube-analytics',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := '{"source": "cron"}'::jsonb
      );
    $$
);

-- 3. Coleta de Google Analytics (a cada 6 horas)
SELECT cron.schedule(
    'sync-google-analytics-6h',
    '0 */6 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/collect-google-analytics',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := '{"source": "cron"}'::jsonb
      );
    $$
);
