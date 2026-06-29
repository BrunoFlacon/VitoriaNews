-- WhatsApp Plano de Correção
-- Item 1.2: Colunas dedicadas para métricas de mensageria em account_metrics
-- Item 3.1: connection_id em bot_settings para suporte multi-conexão

-- 1.2: Colunas de mensageria (WhatsApp/Telegram) em account_metrics
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS messages_sent_count INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS messages_delivered_count INTEGER DEFAULT 0;
ALTER TABLE public.account_metrics ADD COLUMN IF NOT EXISTS unique_contacts_count INTEGER DEFAULT 0;

-- 3.1: connection_id em bot_settings para bot independente por perfil
ALTER TABLE public.bot_settings ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.social_connections(id) ON DELETE CASCADE;

-- Remover UNIQUE(user_id) que impede múltiplos bots por usuário
DROP INDEX IF EXISTS bot_settings_user_unique;

-- Remover UNIQUE(user_id, platform) da definição original da tabela
ALTER TABLE public.bot_settings DROP CONSTRAINT IF EXISTS bot_settings_user_id_platform_key;

-- Criar partial unique indexes: sem connection_id → único por (user_id, platform)
-- com connection_id → único por (user_id, platform, connection_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_settings_user_platform 
  ON public.bot_settings (user_id, platform) 
  WHERE connection_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_settings_user_platform_connection 
  ON public.bot_settings (user_id, platform, connection_id) 
  WHERE connection_id IS NOT NULL;

-- Index para lookup por connection_id
CREATE INDEX IF NOT EXISTS idx_bot_settings_connection_id 
  ON public.bot_settings (connection_id) 
  WHERE connection_id IS NOT NULL;
