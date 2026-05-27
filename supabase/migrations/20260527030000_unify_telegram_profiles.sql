-- ============================================================
-- Migração: Unificação de Perfis Telegram em Analytics
-- Objetivo: Garantir que apenas o BOT apareça como perfil, consolidando canais.
-- Data: 2026-05-27
-- ============================================================

DO $$
DECLARE
    r RECORD;
    bot_account_id UUID;
    bot_puid TEXT;
BEGIN
    -- 1. Iterar por usuários que possuem múltiplas contas Telegram
    FOR r IN (
        SELECT user_id, platform 
        FROM public.social_accounts 
        WHERE platform = 'telegram'
        GROUP BY user_id, platform
        HAVING COUNT(*) > 1
    ) LOOP
        -- 2. Identificar qual ID é o BOT (ID positivo no Telegram)
        SELECT id, platform_user_id INTO bot_account_id, bot_puid 
        FROM public.social_accounts 
        WHERE user_id = r.user_id AND platform = 'telegram'
        ORDER BY (CASE WHEN platform_user_id ~ '^-?\d+$' AND CAST(platform_user_id AS BIGINT) > 0 THEN 1 ELSE 0 END) DESC, updated_at DESC
        LIMIT 1;

        IF bot_account_id IS NOT NULL THEN
            -- 3. Mover métricas de outros registros para o Bot Principal
            -- (Isso garante que o histórico de crescimento não se perca)
            UPDATE public.account_metrics
            SET social_account_id = bot_account_id
            WHERE platform = 'telegram' 
              AND user_id = r.user_id
              AND social_account_id != bot_account_id;

            -- 4. Deletar registros que não são o Bot Principal
            DELETE FROM public.social_accounts
            WHERE user_id = r.user_id 
              AND platform = 'telegram'
              AND id != bot_account_id;
        END IF;
    END LOOP;
END $$;

-- 5. Adicionar um lembrete/comentário para o desenvolvedor
COMMENT ON TABLE public.social_accounts IS 'Consolidated accounts. Telegram should only have one record per user (the bot).';
