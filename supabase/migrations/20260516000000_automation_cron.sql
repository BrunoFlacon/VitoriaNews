-- Ativação da extensão pg_cron para automação de tarefas
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Job para o Radar de Notícias (Trends)
-- Atualiza os tópicos quentes a cada 6 horas
SELECT cron.schedule(
    'update-news-radar',
    '0 */6 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/radar-api',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := '{"source": "cron"}'::jsonb
      );
    $$
);

-- 2. Job para Sincronização Global de Analytics
-- Consolida métricas de todas as contas conectadas às 03:00 da manhã
SELECT cron.schedule(
    'sync-global-analytics',
    '0 3 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/get-analytics',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := '{"source": "cron_sync", "period": "24h"}'::jsonb
      );
    $$
);

-- 3. Job para Limpeza de Logs antigos (Opcional, mantém o DB leve)
SELECT cron.schedule(
    'cleanup-old-logs',
    '0 4 * * 0',
    $$
    DELETE FROM oauth_logs WHERE created_at < NOW() - INTERVAL '30 days';
    DELETE FROM messaging_audience_logs WHERE logged_at < NOW() - INTERVAL '60 days';
    $$
);

COMMENT ON EXTENSION pg_cron IS 'Gerenciador de tarefas agendadas para o Social Canvas Hub';
