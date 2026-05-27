-- ============================================================
-- Migração: Correção de Unicidade e Deduplicação de Conexões
-- Data: 2026-05-27
-- ============================================================

-- 1. Limpeza de duplicatas antes de aplicar a restrição
-- Mantemos apenas o registro mais recente para cada (user_id, platform, platform_user_id)
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (
               PARTITION BY user_id, platform, platform_user_id 
               ORDER BY updated_at DESC, created_at DESC
           ) as rank
    FROM public.social_connections
)
DELETE FROM public.social_connections
WHERE id IN (SELECT id FROM duplicates WHERE rank > 1);

-- 2. Adição de restrição de unicidade para permitir UPSERT on_conflict=user_id,platform,platform_user_id
-- Nota: Incluímos platform_user_id para permitir múltiplas páginas em uma mesma rede (FB),
-- mas garantindo que o mesmo perfil não se duplique.
ALTER TABLE public.social_connections DROP CONSTRAINT IF EXISTS social_connections_user_platform_unique;
ALTER TABLE public.social_connections 
ADD CONSTRAINT social_connections_user_platform_unique 
UNIQUE (user_id, platform, platform_user_id);

-- 3. Índice adicional para auxiliar o setPrimary (apenas um primário por plataforma/usuário)
-- Comentado para análise, mas o frontend cuida disso via lógica de update antes do upsert.
-- CREATE UNIQUE INDEX IF NOT EXISTS social_connections_primary_idx 
-- ON public.social_connections (user_id, platform) 
-- WHERE is_primary = true;

-- 4. Garantir que as tabelas de métricas também sigam este padrão
ALTER TABLE public.social_accounts DROP CONSTRAINT IF EXISTS social_accounts_user_platform_unique;
ALTER TABLE public.social_accounts 
ADD CONSTRAINT social_accounts_user_platform_unique 
UNIQUE (user_id, platform, platform_user_id);

-- 5. Habilitar REALTIME para mensagens (Inbox ao vivo)
-- Primeiro garantimos que a publicação existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Adiciona a tabela ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

GRANT ALL ON public.social_connections TO authenticated;
GRANT ALL ON public.social_accounts TO authenticated;
GRANT ALL ON public.messages TO authenticated;
