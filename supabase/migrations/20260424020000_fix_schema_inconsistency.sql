-- ============================================================
-- Migração: Sincronização de Schema e Correção de Inconsistências
-- Data: 2026-04-24
-- Objetivo: Alinhar o banco com as consultas do Frontend e Hooks
-- ============================================================

-- 1. Corrigir tabela social_accounts
ALTER TABLE public.social_accounts 
  ADD COLUMN IF NOT EXISTS platform_user_id TEXT,
  ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Sincronizar dados de 'followers' para 'followers_count' se existirem
UPDATE public.social_accounts 
SET followers_count = followers 
WHERE followers_count = 0 AND followers > 0;

-- 2. Corrigir tabela bot_settings
ALTER TABLE public.bot_settings 
  ADD COLUMN IF NOT EXISTS floating_button_enabled BOOLEAN DEFAULT true;

-- 3. Garantir índices para performance nas novas colunas
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform_user ON public.social_accounts(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_bot_settings_platform ON public.bot_settings(platform);

-- 4. Corrigir view ou tabelas de métricas se necessário
-- (O erro em useSocialStats indica que 'is_active' é esperado)
-- Já adicionado em social_accounts acima.

-- 5. Atualizar permissões de RLS para as novas colunas
-- (As políticas existentes 'ALL' já cobrem as novas colunas, mas garantimos que as tabelas estejam acessíveis)
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
