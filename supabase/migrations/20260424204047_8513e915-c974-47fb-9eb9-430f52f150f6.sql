-- Fix 1: Storage DELETE policy — restrict to own folder only
DROP POLICY IF EXISTS "Users can delete own media files" ON storage.objects;

CREATE POLICY "Users can delete own media files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 2: social_publish_log — add scoped policies
REVOKE ALL ON public.social_publish_log FROM anon, authenticated;
GRANT SELECT ON public.social_publish_log TO authenticated;
GRANT ALL ON public.social_publish_log TO service_role;

DROP POLICY IF EXISTS "service_role_full_access" ON public.social_publish_log;
CREATE POLICY "service_role_full_access"
ON public.social_publish_log FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_read_own_publish_logs" ON public.social_publish_log;
CREATE POLICY "users_read_own_publish_logs"
ON public.social_publish_log FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scheduled_posts sp
    WHERE sp.id = social_publish_log.post_id
      AND sp.user_id = auth.uid()
  )
);