-- Add new fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

-- Comment on columns for clarity
COMMENT ON COLUMN public.profiles.phone IS 'User phone number for 2FA and recovery';
COMMENT ON COLUMN public.profiles.birthdate IS 'User date of birth';
COMMENT ON COLUMN public.profiles.gender IS 'User gender';
COMMENT ON COLUMN public.profiles.social_links IS 'Array of objects [{platform: string, name: string}] for manual social links';

-- Ensure media bucket exists for avatar and media uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for media bucket (Allow public read, authenticated upload)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Media Access') THEN
        CREATE POLICY "Public Media Access" ON storage.objects FOR SELECT USING (bucket_id = 'media');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Media Upload') THEN
        CREATE POLICY "Authenticated Media Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owner Media Update') THEN
        CREATE POLICY "Owner Media Update" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND auth.uid() = owner);
    END IF;
END $$;
