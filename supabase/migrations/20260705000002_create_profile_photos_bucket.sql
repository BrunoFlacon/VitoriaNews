-- Create profile-photos storage bucket if it doesn't exist
-- This bucket is used by fetch-whatsapp-photos, fix-whatsapp-photos,
-- whatsapp-upload-photo, collect-social-analytics, and sync-social-data

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
  VALUES (
    'profile-photos',
    'profile-photos',
    true,
    false,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- RLS: everyone can read profile photos (they're public)
DROP POLICY IF EXISTS "profile_photos_select_policy" ON storage.objects;
CREATE POLICY "profile_photos_select_policy"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-photos');

-- RLS: authenticated users can upload/update/delete their own folder
DROP POLICY IF EXISTS "profile_photos_insert_policy" ON storage.objects;
CREATE POLICY "profile_photos_insert_policy"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  );

DROP POLICY IF EXISTS "profile_photos_update_policy" ON storage.objects;
CREATE POLICY "profile_photos_update_policy"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'profile-photos' AND auth.role() IN ('authenticated', 'service_role'))
  WITH CHECK (bucket_id = 'profile-photos' AND auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "profile_photos_delete_policy" ON storage.objects;
CREATE POLICY "profile_photos_delete_policy"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'profile-photos' AND auth.role() IN ('authenticated', 'service_role'));
