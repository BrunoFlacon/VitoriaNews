-- WhatsApp Backup & Cleanup Cron Jobs
-- FASE 4.C: Schedule automatic backups and retention cleanup
-- Totalmente aditivo — não altera tabelas existentes

-- ============================================================
-- 1. WhatsApp Conversation Backup (Diário às 02:00 AM)
-- ============================================================
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

-- ============================================================
-- 2. Backup Expiry Cleanup (Diário às 04:00 AM)
-- ============================================================
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

-- ============================================================
-- 3. WhatsApp Full Number Backup (Semanal — Domingo às 03:00 AM)
-- ============================================================
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

-- Nota: COMMENT ON cron.schedule pulado (função de extensão — proprietário é superuser)
