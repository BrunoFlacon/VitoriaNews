-- Remove registro de mídia quebrado (arquivo não existe no storage)
DELETE FROM public.media
WHERE file_url LIKE '%1773738460042_story%'
   OR file_url LIKE '%b6333d5f-fc76-4c7e-ab0b-c7b6f39b422b/1773738460042%';