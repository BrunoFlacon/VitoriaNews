DO $$
DECLARE
  broken_media_ids UUID[] := ARRAY[]::UUID[];
  v_media_id UUID;
  v_count INT;
BEGIN

  -- 1. Find and delete broken media records (file doesn't exist in storage)
  SELECT ARRAY_AGG(id) INTO broken_media_ids
  FROM public.media
  WHERE file_url LIKE '%1773738460042_story%'
     OR file_url LIKE '%yttsmficdfnbvvuhhdmw%'
     OR (file_url LIKE '%b6333d5f-fc76-4c7e-ab0b-c7b6f39b422b%' AND file_url LIKE '%1773738460042%');

  RAISE NOTICE 'Record(s) from media: %', COALESCE(array_length(broken_media_ids, 1), 0);

  IF broken_media_ids IS NOT NULL AND array_length(broken_media_ids, 1) > 0 THEN
    -- 2. Remove broken media_ids from scheduled_posts.media_ids arrays
    FOREACH v_media_id IN ARRAY broken_media_ids
    LOOP
      UPDATE public.scheduled_posts
      SET media_ids = ARRAY_REMOVE(media_ids, v_media_id)
      WHERE v_media_id = ANY(media_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count > 0 THEN
        RAISE NOTICE '  Removed media_id % from scheduled_posts (% rows)', v_media_id, v_count;
      END IF;
    END LOOP;

    -- 3. Delete the broken media records
    DELETE FROM public.media
    WHERE id = ANY(broken_media_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '  Deleted % records(s) from media', v_count;
  END IF;

  -- 4. Clean up stories_lives that might reference broken URLs
  UPDATE public.stories_lives
  SET media_url = NULL, thumbnail_url = NULL
  WHERE media_url LIKE '%1773738460042_story%'
     OR thumbnail_url LIKE '%1773738460042_story%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'stories_lives cleaned up: % rows', v_count;

  -- 5. Clean up post_metrics that reference broken URLs
  UPDATE public.post_metrics
  SET media_url = NULL
  WHERE media_url LIKE '%1773738460042_story%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'post_metrics cleaned up: % rows', v_count;

  RAISE NOTICE 'Migração 20260609000005 concluída.';
END $$;
