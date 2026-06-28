-- Fix social_connections data: trim spaces, fix WhatsApp photos, recover missing waba_id/phone_number_id
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Remove trailing spaces in page_name
UPDATE public.social_connections
SET page_name = TRIM(page_name)
WHERE page_name LIKE '% ';

-- 2. Fix WhatsApp connection 'Central News' (742c07e9) — has Facebook CDN photo instead of WhatsApp photo
-- Null out the incorrect Facebook CDN URLs so the app falls back to initials/avatar
UPDATE public.social_connections
SET
  profile_image_url = NULL,
  profile_picture = NULL
WHERE id = '742c07e9-707e-4521-a7b4-9cccc8715f68'
  AND platform = 'whatsapp'
  AND profile_image_url LIKE '%fbcdn%';

-- 3. Recover waba_id from api_credentials for WhatsApp connections that are missing it
-- The OAuth callback already saves waba_id to api_credentials, but not to social_connections
UPDATE public.social_connections sc
SET waba_id = (ac.credentials->>'waba_id')::text
FROM public.api_credentials ac
WHERE sc.platform = 'whatsapp'
  AND sc.waba_id IS NULL
  AND ac.platform = 'whatsapp'
  AND ac.user_id = sc.user_id
  AND ac.credentials->>'waba_id' IS NOT NULL;

-- 4. Recover phone_number_id from api_credentials for WhatsApp connections that are missing it
UPDATE public.social_connections sc
SET phone_number_id = (ac.credentials->>'phone_number_id')::text
FROM public.api_credentials ac
WHERE sc.platform = 'whatsapp'
  AND sc.phone_number_id IS NULL
  AND ac.platform = 'whatsapp'
  AND ac.user_id = sc.user_id
  AND ac.credentials->>'phone_number_id' IS NOT NULL;

COMMIT;

-- === DIAGNOSTIC QUERIES (run separately to verify) ===

-- Check for any remaining trailing spaces
-- SELECT id, platform, page_name FROM public.social_connections
-- WHERE page_name LIKE '% ' OR page_name LIKE ' %';

-- Check WhatsApp connections still missing phone_number_id or waba_id
-- SELECT id, platform, page_name, phone_number_id, waba_id, platform_user_id
-- FROM public.social_connections
-- WHERE platform = 'whatsapp' AND (phone_number_id IS NULL OR waba_id IS NULL);

-- Check for duplicate access tokens across different connections
-- SELECT access_token, COUNT(*) as cnt, array_agg(id) as ids, array_agg(page_name) as names
-- FROM public.social_connections
-- WHERE access_token IS NOT NULL
-- GROUP BY access_token
-- HAVING COUNT(*) > 1;

-- List all connections with basic info for review
-- SELECT id, platform, page_name, is_primary, phone_number_id, waba_id,
--        LEFT(profile_image_url, 50) as photo_preview
-- FROM public.social_connections
-- ORDER BY platform, page_name;

-- Check api_credentials for WhatsApp (to verify source data)
-- SELECT user_id, platform, credentials->>'waba_id' as waba_id,
--        credentials->>'phone_number_id' as phone_number_id,
--        credentials->>'profile_image_url' as profile_image_url
-- FROM public.api_credentials
-- WHERE platform = 'whatsapp';
