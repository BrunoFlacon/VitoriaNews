-- =========================================================
--  SQL CONSOLIDADO — MOTOR DE ABASTECIMENTO HISTÓRICO
--  Execute TUDO isso de uma vez no SQL Editor do Supabase
-- =========================================================

-- 1. TABELA DE ESTADO (Controla paginação histórica por conta)
CREATE TABLE IF NOT EXISTS public.historical_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    next_cursor TEXT,
    is_completed BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE (social_account_id, platform)
);

ALTER TABLE public.historical_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role gerencia cursores históricos"
ON public.historical_sync_state
FOR ALL USING (true) WITH CHECK (true);

-- 2. INICIALIZA UM REGISTRO POR CONTA CONECTADA (arranca o motor)
INSERT INTO public.historical_sync_state (social_account_id, platform, is_completed)
SELECT id, platform, false
FROM public.social_accounts
WHERE is_connected = true
ON CONFLICT (social_account_id, platform) DO NOTHING;

-- 3. CRON JOB — dispara a cada 5 minutos (remove versão antiga com segurança se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'historical-sync-every-5-min') THEN
    PERFORM cron.unschedule('historical-sync-every-5-min');
  END IF;
END $$;

SELECT cron.schedule(
  'historical-sync-every-5-min',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/historical-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- =========================================================
-- VERIFICAÇÃO: Confirma quantas contas foram inicializadas
SELECT platform, is_completed, next_cursor, last_synced_at
FROM public.historical_sync_state
ORDER BY created_at;
-- =========================================================
