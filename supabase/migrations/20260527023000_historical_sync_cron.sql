-- Configura o Job Automático a cada 5 Minutos para o Abastecimento Profundo de Posts Velhos
-- Ele disparará a função 'historical-sync', que por sua vez continuará do último cursor salvo.

SELECT cron.unschedule('historical-sync-every-5-min');

SELECT cron.schedule(
  'historical-sync-every-5-min',
  '*/5 * * * *', -- Executa a cada 5 minutos
  $$
    DECLARE
      url text;
      auth_key text;
      request_id bigint;
    BEGIN
      -- Recupera a URL base e a Chave de Serviço do Supabase
      SELECT value INTO url FROM settings WHERE key = 'supabase_url';
      SELECT value INTO auth_key FROM settings WHERE key = 'supabase_service_role_key';
      
      -- Atira contra o webhook que construímos puxando do passado
      SELECT net.http_post(
        url := url || '/functions/v1/historical-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || auth_key
        ),
        body := '{}'::jsonb
      ) INTO request_id;
    END;
  $$
);
