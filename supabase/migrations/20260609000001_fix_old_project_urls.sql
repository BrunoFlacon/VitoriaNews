-- Corrige URLs de armazenamento que apontam para o projeto antigo (yttsmficdfnbvvuhhdmw)
-- e as redireciona para o projeto atual (ghtkdkauseesambzqfrd)
-- Isso para o erro 400 no console e evita falhas no carregamento de mídia.

DO $$
DECLARE
  old_url CONSTANT TEXT := 'yttsmficdfnbvvuhhdmw.supabase.co';
  new_url CONSTANT TEXT := 'ghtkdkauseesambzqfrd.supabase.co';
  updated_count INT := 0;
BEGIN

  -- 1. media.file_url
  UPDATE public.media
  SET file_url = REPLACE(file_url, old_url, new_url)
  WHERE file_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'media.file_url: % registros atualizados', updated_count;

  -- 2. media.thumbnail_url
  UPDATE public.media
  SET thumbnail_url = REPLACE(thumbnail_url, old_url, new_url)
  WHERE thumbnail_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'media.thumbnail_url: % registros atualizados', updated_count;

  -- 3. messages.media_url
  UPDATE public.messages
  SET media_url = REPLACE(media_url, old_url, new_url)
  WHERE media_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'messages.media_url: % registros atualizados', updated_count;

  -- 4. post_metrics.media_url
  UPDATE public.post_metrics
  SET media_url = REPLACE(media_url, old_url, new_url)
  WHERE media_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'post_metrics.media_url: % registros atualizados', updated_count;

  -- 5. stories_lives.media_url
  UPDATE public.stories_lives
  SET media_url = REPLACE(media_url, old_url, new_url)
  WHERE media_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'stories_lives.media_url: % registros atualizados', updated_count;

  -- 6. stories_lives.thumbnail_url
  UPDATE public.stories_lives
  SET thumbnail_url = REPLACE(thumbnail_url, old_url, new_url)
  WHERE thumbnail_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'stories_lives.thumbnail_url: % registros atualizados', updated_count;

  -- 7. documents.file_url
  UPDATE public.documents
  SET file_url = REPLACE(file_url, old_url, new_url)
  WHERE file_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'documents.file_url: % registros atualizados', updated_count;

  -- 8. profiles.avatar_url
  UPDATE public.profiles
  SET avatar_url = REPLACE(avatar_url, old_url, new_url)
  WHERE avatar_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'profiles.avatar_url: % registros atualizados', updated_count;

  -- 9. social_accounts.avatar_url
  UPDATE public.social_accounts
  SET avatar_url = REPLACE(avatar_url, old_url, new_url)
  WHERE avatar_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'social_accounts.avatar_url: % registros atualizados', updated_count;

  -- 10. social_accounts.cover_photo
  UPDATE public.social_accounts
  SET cover_photo = REPLACE(cover_photo, old_url, new_url)
  WHERE cover_photo LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'social_accounts.cover_photo: % registros atualizados', updated_count;

  -- 11. social_accounts.profile_picture
  UPDATE public.social_accounts
  SET profile_picture = REPLACE(profile_picture, old_url, new_url)
  WHERE profile_picture LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'social_accounts.profile_picture: % registros atualizados', updated_count;

  -- 12. system_settings.logo_url
  UPDATE public.system_settings
  SET logo_url = REPLACE(logo_url, old_url, new_url)
  WHERE logo_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'system_settings.logo_url: % registros atualizados', updated_count;

  -- 13. system_settings.portal_logo_url
  UPDATE public.system_settings
  SET portal_logo_url = REPLACE(portal_logo_url, old_url, new_url)
  WHERE portal_logo_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'system_settings.portal_logo_url: % registros atualizados', updated_count;

  -- 14. system_settings.favicon_url
  UPDATE public.system_settings
  SET favicon_url = REPLACE(favicon_url, old_url, new_url)
  WHERE favicon_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'system_settings.favicon_url: % registros atualizados', updated_count;

  -- 15. system_settings.seo_image_url
  UPDATE public.system_settings
  SET seo_image_url = REPLACE(seo_image_url, old_url, new_url)
  WHERE seo_image_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'system_settings.seo_image_url: % registros atualizados', updated_count;

  -- 16. brands.logo_url
  UPDATE public.brands
  SET logo_url = REPLACE(logo_url, old_url, new_url)
  WHERE logo_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'brands.logo_url: % registros atualizados', updated_count;

  -- 17. live_sessions.recording_url
  UPDATE public.live_sessions
  SET recording_url = REPLACE(recording_url, old_url, new_url)
  WHERE recording_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'live_sessions.recording_url: % registros atualizados', updated_count;

  -- 18. live_sessions.thumbnail_url
  UPDATE public.live_sessions
  SET thumbnail_url = REPLACE(thumbnail_url, old_url, new_url)
  WHERE thumbnail_url LIKE '%' || old_url || '%';
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'live_sessions.thumbnail_url: % registros atualizados', updated_count;

  RAISE NOTICE 'Migração concluída: todas as URLs do projeto antigo foram atualizadas.';
END $$;
