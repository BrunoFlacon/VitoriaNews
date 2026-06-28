-- ============================================================
-- FIX COMPLETO: Sincronizar tokens WhatsApp + phone_number_ids
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================
-- WABAS encontradas: 432394786616324, 109656882107367, 100698099575947
-- Phone number IDs: 395327283672120, 104471639297435, 107006452268135
-- ============================================================

-- 0. Adicionar coluna phone_number_id à social_connections
ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS phone_number_id TEXT;

-- 1. Contar mensagens por status
SELECT 
  COALESCE(status, 'unknown') as status,
  COUNT(*) as total
FROM messages 
WHERE platform = 'whatsapp'
GROUP BY status
ORDER BY total DESC;

-- 2. Contar bot vs manual
SELECT 
  CASE WHEN metadata->>'bot_reply' = 'true' THEN '🤖 Bot/automático' ELSE '👤 Manual/humano' END as tipo,
  COUNT(*) as total
FROM messages 
WHERE platform = 'whatsapp'
GROUP BY 1
ORDER BY total DESC;

-- 3. Atualizar api_credentials com dados corretos
INSERT INTO api_credentials (user_id, platform, credentials, created_at, updated_at)
SELECT DISTINCT ON (user_id)
  user_id,
  'whatsapp' as platform,
  jsonb_build_object(
    'app_id', '761709995404176',
    'access_token', access_token,
    'phone_number_id', '395327283672120',
    'waba_id', '432394786616324'
  ) as credentials,
  NOW() as created_at,
  NOW() as updated_at
FROM social_connections
WHERE platform = 'whatsapp'
  AND is_connected = true
  AND access_token IS NOT NULL
ON CONFLICT (user_id, platform) 
DO UPDATE SET 
  credentials = jsonb_build_object(
    'app_id', '761709995404176',
    'access_token', EXCLUDED.credentials->>'access_token',
    'phone_number_id', COALESCE(NULLIF(api_credentials.credentials->>'phone_number_id', ''), '395327283672120'),
    'waba_id', COALESCE(NULLIF(api_credentials.credentials->>'waba_id', ''), '432394786616324')
  ),
  updated_at = NOW();

-- 4. Verificar resultado final
SELECT 'api_credentials' as tabela, 
  credentials->>'app_id' as app_id,
  credentials->>'access_token' IS NOT NULL as has_token,
  credentials->>'phone_number_id' as phone_id,
  credentials->>'waba_id' as waba_id
FROM api_credentials 
WHERE platform = 'whatsapp'

UNION ALL

SELECT 'social_connections' as tabela,
  platform_user_id as app_id,
  access_token IS NOT NULL as has_token,
  phone_number_id,
  NULL as waba_id
FROM social_connections
WHERE platform = 'whatsapp' AND is_connected = true
ORDER BY tabela;
