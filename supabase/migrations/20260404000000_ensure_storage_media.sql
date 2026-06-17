-- Create the 'media' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Allow public access to read files in the 'media' bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'media' );

-- Allow authenticated uploads to 'media' bucket
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'media' );

-- Allow users to update their own files
CREATE POLICY "Update own files"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'media' );
