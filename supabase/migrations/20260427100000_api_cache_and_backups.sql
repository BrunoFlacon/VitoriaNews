-- ============================================================
-- Migração: Sistema de Cache de APIs e Backup Criptografado
-- Data: 2026-04-27
-- ============================================================

-- 1. Tabela de Cache de Respostas de APIs (Evita rate limits e travamentos)
CREATE TABLE IF NOT EXISTS public.api_responses_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_params JSONB DEFAULT '{}',
    response_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para busca rápida no cache
CREATE INDEX IF NOT EXISTS idx_api_cache_lookup ON public.api_responses_cache(user_id, platform, endpoint);
CREATE INDEX IF NOT EXISTS idx_api_cache_expiry ON public.api_responses_cache(expires_at);

-- 2. Tabela de Backups de Mensagens Criptografados
CREATE TABLE IF NOT EXISTS public.message_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    backup_date DATE DEFAULT CURRENT_DATE,
    file_path TEXT NOT NULL, -- Caminho no Supabase Storage
    encryption_key_id TEXT,  -- ID da chave de criptografia (opcional para gestão KMS)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform, chat_id, backup_date)
);

-- Políticas RLS
ALTER TABLE public.api_responses_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seu próprio cache" ON public.api_responses_cache
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Usuários gerenciam seus próprios backups" ON public.message_backups
    FOR ALL USING (auth.uid() = user_id);

-- 3. Criar Bucket de Backups (Se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Habilitar Cron para Limpeza de Cache Expirado
-- Remove registros que já passaram da validade
SELECT cron.schedule(
    'cleanup-api-cache',
    '0 0 * * *', -- Meia-noite diariamente
    $$ DELETE FROM public.api_responses_cache WHERE expires_at < NOW() $$
);

-- 5. Agendar Backup de Mensagens (Diário às 03:00 AM)
SELECT cron.schedule(
    'daily-message-backup',
    '0 3 * * *',
    $$ SELECT net.http_post(
        url := (SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/backup-messages',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'service_role_key')
        ),
        body := '{}'::jsonb
    ) $$
);
