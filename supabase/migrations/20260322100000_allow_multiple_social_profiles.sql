-- Altera a restrição da tabela social_connections para permitir múltiplos perfis por plataforma

ALTER TABLE public.social_connections
DROP CONSTRAINT IF EXISTS social_connections_user_id_platform_key;

ALTER TABLE public.social_connections
ADD CONSTRAINT social_connections_user_id_platform_profile_key UNIQUE (user_id, platform, platform_user_id);
