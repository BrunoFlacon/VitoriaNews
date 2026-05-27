-- Fix Threads profile data: mescla dados reais na conexao principal
-- A conexao ativa (27340023768916760) tem "Threads User" sem foto
-- A conexao fantasma (27340023768916761) tem dados reais (webradiovitoriaa + foto)

-- 1. Copiar dados reais para social_connections ativa
UPDATE social_connections
SET
  page_name = COALESCE(
    (SELECT page_name FROM social_connections
     WHERE platform = 'threads' AND is_connected = false
       AND page_name IS NOT NULL AND page_name != ''
       AND page_name NOT ILIKE '%user%'
     LIMIT 1),
    page_name
  ),
  username = COALESCE(
    (SELECT username FROM social_connections
     WHERE platform = 'threads' AND is_connected = false
       AND username IS NOT NULL AND username != ''
     LIMIT 1),
    username
  ),
  profile_image_url = COALESCE(
    (SELECT profile_image_url FROM social_connections
     WHERE platform = 'threads' AND is_connected = false
       AND profile_image_url IS NOT NULL
     LIMIT 1),
    profile_image_url
  ),
  profile_picture = COALESCE(
    (SELECT profile_picture FROM social_connections
     WHERE platform = 'threads' AND is_connected = false
       AND profile_picture IS NOT NULL
     LIMIT 1),
    profile_picture
  ),
  followers_count = GREATEST(
    followers_count,
    COALESCE((SELECT MAX(followers_count) FROM social_connections WHERE platform = 'threads'), 0)
  ),
  posts_count = GREATEST(
    posts_count,
    COALESCE((SELECT MAX(posts_count) FROM social_connections WHERE platform = 'threads'), 0)
  ),
  updated_at = now()
WHERE platform = 'threads' AND is_connected = true;

-- 2. Copiar dados reais para social_accounts ativa
UPDATE social_accounts
SET
  page_name = COALESCE(
    (SELECT page_name FROM social_accounts
     WHERE platform = 'threads'
       AND page_name IS NOT NULL AND page_name != ''
       AND page_name NOT ILIKE '%user%'
     LIMIT 1),
    page_name
  ),
  username = COALESCE(
    (SELECT username FROM social_accounts
     WHERE platform = 'threads'
       AND username IS NOT NULL AND username != ''
       AND username NOT ILIKE '%user%'
     LIMIT 1),
    username
  ),
  profile_picture = COALESCE(
    (SELECT profile_picture FROM social_accounts
     WHERE platform = 'threads'
       AND profile_picture IS NOT NULL
     LIMIT 1),
    profile_picture
  ),
  followers_count = GREATEST(
    followers_count,
    COALESCE((SELECT MAX(followers_count) FROM social_accounts WHERE platform = 'threads'), 0)
  ),
  posts_count = GREATEST(
    posts_count,
    COALESCE((SELECT MAX(posts_count) FROM social_accounts WHERE platform = 'threads'), 0)
  ),
  updated_at = now()
WHERE platform = 'threads'
  AND platform_user_id = '27340023768916760';

-- 3. Remover entradas fantasmas duplicadas
DELETE FROM social_connections
WHERE platform = 'threads' AND is_connected = false;

DELETE FROM social_accounts
WHERE platform = 'threads'
  AND platform_user_id != '27340023768916760';
