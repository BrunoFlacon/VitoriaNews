
-- 1. api_keys: add INSERT/UPDATE policies (SELECT/DELETE already exist)
DROP POLICY IF EXISTS "ak_insert" ON public.api_keys;
DROP POLICY IF EXISTS "ak_update" ON public.api_keys;

CREATE POLICY "ak_insert" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ak_update" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Make user_id NOT NULL going forward to prevent orphaned rows
ALTER TABLE public.api_keys ALTER COLUMN user_id SET NOT NULL;

-- 2. platform_tokens: revoke all client access (service_role only)
REVOKE ALL ON public.platform_tokens FROM anon, authenticated;

-- 3. trending_posts: enable RLS, read-only for authenticated
ALTER TABLE public.trending_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_select" ON public.trending_posts;
CREATE POLICY "tp_select" ON public.trending_posts
  FOR SELECT TO authenticated
  USING (true);

-- 4. Storage: clean up media bucket policies
DROP POLICY IF EXISTS "Authenticated users can upload to media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own media files" ON storage.objects;

-- Recreate authenticated-only INSERT with folder ownership check
CREATE POLICY "media_insert_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Realtime: restrict channel subscriptions to user-owned topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_topic" ON realtime.messages;
CREATE POLICY "users_own_topic" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE auth.uid()::text || ':%'
  );
