-- Corrige UNIQUE constraint da tabela bot_settings para suportar múltiplos perfis por plataforma
-- O UNIQUE antigo (user_id, platform) impedia múltiplas configurações de bot para diferentes
-- números WhatsApp do mesmo usuário.
-- A nova constraint (user_id, platform, connection_id) permite:
--   - Múltiplos números WhatsApp com configurações independentes per connection_id
--   - Configuração global por plataforma (connection_id IS NULL) como fallback

ALTER TABLE public.bot_settings DROP CONSTRAINT IF EXISTS bot_settings_user_id_platform_key;

-- connection_id pode ser NULL (p/ configuração global fallback)
-- PostgreSQL não enforces uniqueness on NULLs, então funciona como esperado
ALTER TABLE public.bot_settings ADD CONSTRAINT bot_settings_user_id_platform_connection_key UNIQUE (user_id, platform, connection_id);
