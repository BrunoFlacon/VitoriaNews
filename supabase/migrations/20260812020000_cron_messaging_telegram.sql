-- ============================================================
-- CONSOLIDAÇÃO DE CRONS — MENSAGERIA (WHATSAPP / TELEGRAM)
-- 2026-08-12
--
-- Arquivo INDEPENDENTE dos crons de radar/analytics (20260812010000).
-- Contém apenas os jobs de backup/limpeza da mensageria, de forma
-- idempotente (safe para re-run sem conflitar com outros scripts).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Backup de conversas WhatsApp/Telegram (diário às 02:00)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'backup-whatsapp-conversations') THEN
    PERFORM cron.unschedule('backup-whatsapp-conversations');
  END IF;
END
$$;
SELECT cron.schedule(
    'backup-whatsapp-conversations',
    '0 2 * * *',
    $$ SELECT net.http_post(
        url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/backup-whatsapp-conversations',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'service_role_key')
        ),
        body := '{}'::jsonb
    ) $$
);

-- Limpeza de backups expirados (diário às 04:00)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-whatsapp-backups') THEN
    PERFORM cron.unschedule('cleanup-expired-whatsapp-backups');
  END IF;
END
$$;
SELECT cron.schedule(
    'cleanup-expired-whatsapp-backups',
    '0 4 * * *',
    $$ SELECT net.http_post(
        url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/cleanup-expired-backups',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'service_role_key')
        ),
        body := '{}'::jsonb
    ) $$
);

-- Backup completo do número (semanal — domingo às 03:00)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'backup-whatsapp-full-number') THEN
    PERFORM cron.unschedule('backup-whatsapp-full-number');
  END IF;
END
$$;
SELECT cron.schedule(
    'backup-whatsapp-full-number',
    '0 3 * * 0',
    $$ SELECT net.http_post(
        url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/backup-whatsapp-conversations',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'service_role_key')
        ),
        body := '{"scope": "full_number"}'::jsonb
    ) $$
);
