-- Registra o cron job para limpar mensagens temporárias do bot a cada 6h
-- Exclui mensagens com is_system_log = true e mais de 12 horas de idade
SELECT cron.schedule(
    'cleanup-temp-messages',
    '0 */6 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/cleanup-temp-messages',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      );
    $$
);
