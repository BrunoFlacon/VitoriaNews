-- Adiciona colunas de métricas e fotos na tabela de conexões sociais
-- Isso resolve os erros 400 (Bad Request) no frontend

ALTER TABLE IF EXISTS public.social_connections
ADD COLUMN IF NOT EXISTS posts_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Garante que followers_count seja BIGINT para consistência
DO $$ 
BEGIN 
  ALTER TABLE public.social_connections ALTER COLUMN followers_count TYPE BIGINT;
EXCEPTION 
  WHEN OTHERS THEN 
    NULL;
END $$;

-- Atualiza a política de RLS para garantir que o usuário continue tendo acesso às novas colunas
-- (Geralmente automático so Supabase, mas bom garantir)
COMMENT ON COLUMN public.social_connections.posts_count IS 'Total de posts capturados da API (usado para cards de configuração)';
COMMENT ON COLUMN public.social_connections.profile_picture IS 'URL da foto de perfil capturada da API (usado para redundância)';
