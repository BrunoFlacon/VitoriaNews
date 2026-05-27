-- Consolidate duplicated Threads connections
-- Causa: exchangeThreads() fallback para shortData.user_id quando profileData.id
-- estava indisponível, gerando registros com platform_user_id diferentes.
--
-- Estratégia:
-- 1. Identifica conexão principal (com username real, mais recente)
-- 2. Soma métricas (posts, followers) na principal
-- 3. Remove conexões fantasmas (secundárias)

-- ── 1. Remover duplicatas exatas (mesmo user_id + platform + platform_user_id) ─
WITH dupes AS (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY user_id, platform, platform_user_id
      ORDER BY updated_at DESC
    ) AS rn
    FROM social_connections
    WHERE platform = 'threads'
      AND platform_user_id IS NOT NULL
      AND platform_user_id != ''
  ) sub WHERE rn > 1
)
DELETE FROM social_connections WHERE id IN (SELECT id FROM dupes);

-- ── 2. Consolidar conexões com platform_user_id diferentes ───────────────────

-- 2a. Identificar as conexões principais (com username real) e as fantasmas
-- Guarda as decisões numa tabela temporária
CREATE TEMP TABLE _threads_merge AS
WITH ranked AS (
  SELECT
    id,
    user_id,
    page_name,
    username,
    followers_count,
    posts_count,
    profile_image_url,
    access_token,
    refresh_token,
    token_expires_at,
    row_number() OVER (
      PARTITION BY user_id, platform
      ORDER BY
        CASE WHEN username IS NOT NULL AND username != '' AND page_name NOT ILIKE '%user%' THEN 0 ELSE 1 END,
        updated_at DESC
    ) AS rn
  FROM social_connections
  WHERE platform = 'threads' AND is_connected = true
)
SELECT user_id, id AS primary_id FROM ranked WHERE rn = 1;

-- 2b. Somar métricas das fantasmas na conexão principal
UPDATE social_connections sc
SET
  followers_count = (
    SELECT COALESCE(SUM(followers_count), 0)
    FROM social_connections
    WHERE user_id = sc.user_id AND platform = 'threads' AND is_connected = true
  ),
  posts_count = (
    SELECT COALESCE(SUM(posts_count), 0)
    FROM social_connections
    WHERE user_id = sc.user_id AND platform = 'threads' AND is_connected = true
  ),
  page_name = COALESCE(
    (SELECT username FROM social_connections
     WHERE user_id = sc.user_id AND platform = 'threads' AND is_connected = true
       AND username IS NOT NULL AND username != ''
     LIMIT 1),
    sc.page_name
  ),
  updated_at = now()
FROM _threads_merge tm
WHERE sc.id = tm.primary_id;

-- 2c. Remover conexões fantasmas (tudo que não é primary)
DELETE FROM social_connections sc
WHERE sc.platform = 'threads'
  AND sc.is_connected = true
  AND sc.id NOT IN (SELECT primary_id FROM _threads_merge);

DROP TABLE IF EXISTS _threads_merge;

-- ── 3. Consolidar social_accounts ────────────────────────────────────────────

-- 3a. Remove duplicatas exatas
WITH dupes AS (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY user_id, platform, platform_user_id
      ORDER BY updated_at DESC
    ) AS rn
    FROM social_accounts
    WHERE platform = 'threads'
      AND platform_user_id IS NOT NULL
      AND platform_user_id != ''
  ) sub WHERE rn > 1
)
DELETE FROM social_accounts WHERE id IN (SELECT id FROM dupes);

-- 3b. Mantém apenas uma conta por user + platform, somando métricas
WITH ranked AS (
  SELECT id, user_id, row_number() OVER (
    PARTITION BY user_id, platform
    ORDER BY created_at
  ) AS rn
  FROM social_accounts
  WHERE platform = 'threads'
),
sums AS (
  SELECT user_id,
    SUM(COALESCE(followers_count, 0)) AS total_followers,
    SUM(COALESCE(posts_count, 0)) AS total_posts
  FROM social_accounts
  WHERE platform = 'threads'
  GROUP BY user_id
)
UPDATE social_accounts sa
SET
  followers_count = s.total_followers,
  posts_count     = s.total_posts,
  updated_at      = now()
FROM ranked r, sums s
WHERE sa.id = r.id AND r.rn = 1 AND sa.user_id = s.user_id;

WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY user_id, platform
    ORDER BY created_at
  ) AS rn
  FROM social_accounts
  WHERE platform = 'threads'
)
DELETE FROM social_accounts WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
