-- ============================================================
-- Migração: Deduplicação Telegram + UNIQUE constraint
-- Data: 2026-06-06
-- ============================================================

-- 1. Limpeza de duplicatas Telegram em social_accounts
-- Mantém apenas o registro mais recente (com profile_picture se possível)
DELETE FROM public.social_accounts
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, platform, platform_user_id
             ORDER BY
               CASE WHEN profile_picture IS NOT NULL AND profile_picture != '' THEN 1 ELSE 2 END,
               updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST
           ) as rank
    FROM public.social_accounts
    WHERE platform = 'telegram'
  ) sub
  WHERE rank > 1
);

-- 2. Remover registros Telegram com platform_user_id sintético (não numérico)
DELETE FROM public.social_accounts
WHERE platform = 'telegram'
  AND platform_user_id IS NOT NULL
  AND platform_user_id !~ '^\d+$';

-- 3. Unificar social_connections duplicadas do Telegram
DELETE FROM public.social_connections
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, platform, platform_user_id
             ORDER BY
               CASE WHEN profile_image_url IS NOT NULL AND profile_image_url != '' THEN 1 ELSE 2 END,
               updated_at DESC NULLS LAST,
               created_at DESC NULLS LAST
           ) as rank
    FROM public.social_connections
    WHERE platform = 'telegram'
  ) sub
  WHERE rank > 1
);

-- 4. UNIQUE constraint em social_accounts (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_accounts_user_platform_unique'
      AND conrelid = 'public.social_accounts'::regclass
  ) THEN
    ALTER TABLE public.social_accounts
    ADD CONSTRAINT social_accounts_user_platform_unique
    UNIQUE (user_id, platform, platform_user_id);
  END IF;
END $$;

-- 5. UNIQUE constraint em social_connections (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_connections_user_platform_unique'
      AND conrelid = 'public.social_connections'::regclass
  ) THEN
    ALTER TABLE public.social_connections
    ADD CONSTRAINT social_connections_user_platform_unique
    UNIQUE (user_id, platform, platform_user_id);
  END IF;
END $$;
