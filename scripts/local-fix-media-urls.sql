-- =============================================================================
-- Social Canvas Hub — Normalização local de file_url da tabela media
-- =============================================================================
-- Em modo local (PostgreSQL 18 + storage em disco), as imagens NÃO vêm do
-- Supabase Storage (egress excedido). O cliente local (local-client.ts) e o
-- getMediaUrl() esperam que file_url seja um PATH RELATIVO (<user_id>/<file>),
-- não uma URL completa assinada do Supabase.
--
-- Este script:
--   1. Converte URLs completas do Supabase (sign/public/authenticated) em paths
--      relativos e popula storage_path.
--   2. Popula storage_path nos registros que já usam path relativo mas têm
--      storage_path nulo.
--
-- Observação: os arquivos físicos ainda precisam ser baixados do Supabase e
-- salvos em server/storage/media/<path> quando a cota de egress permitir.
-- Até lá, o SafeImage exibe um fallback gracioso (404 esperado).
-- =============================================================================

-- 1. URLs completas do Supabase → path relativo
UPDATE public.media
SET
  file_url = regexp_replace(
    regexp_replace(file_url, '^https?://[^/]+/storage/v1/object/(sign|public|authenticated)/media/', ''),
    '\?.*$', ''
  ),
  storage_path = regexp_replace(
    regexp_replace(file_url, '^https?://[^/]+/storage/v1/object/(sign|public|authenticated)/media/', ''),
    '\?.*$', ''
  )
WHERE file_url LIKE '%/storage/v1/object/%/media/%';

-- 2. Registros com path relativo mas storage_path nulo
UPDATE public.media
SET storage_path = file_url
WHERE storage_path IS NULL
  AND file_url IS NOT NULL
  AND file_url NOT LIKE 'http%';

-- Relatório
SELECT
  COUNT(*) FILTER (WHERE file_url LIKE 'http%')  AS ainda_com_url_http,
  COUNT(*) FILTER (WHERE file_url NOT LIKE 'http%' AND file_url <> '') AS paths_relativos,
  COUNT(*) FILTER (WHERE storage_path IS NOT NULL) AS com_storage_path
FROM public.media;
