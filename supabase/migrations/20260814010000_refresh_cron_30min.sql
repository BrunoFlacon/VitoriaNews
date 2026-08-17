-- ============================================================
-- REFRESH DE TOKENS A CADA 30 MIN
-- Motivo: tokens do X (Twitter) expiram a cada ~2h e do YouTube
-- a cada ~1h. O cron anterior rodava a cada 12h — entre um
-- refresh e outro o token vencia e as conexões falhavam.
-- Com backoff por plataforma (last_refresh_attempt), renovar a
-- cada 30 min é barato: só X/YouTube são tocados a cada ciclo.
-- ============================================================

SELECT cron.unschedule('refresh-tokens-v2');

SELECT cron.schedule(
  'refresh-tokens-v2',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/refresh-tokens-cron',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'service_role_key')
      ),
      body := '{}'::jsonb
    )
  $$
);
