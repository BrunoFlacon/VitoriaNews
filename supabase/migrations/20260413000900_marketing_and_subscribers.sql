-- Add credentials for Resend (Email) and Meta WhatsApp
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_meta_api_token TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_meta_phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_meta_business_account_id TEXT;

-- Create table for portal subscribers if it doesn't exist
CREATE TABLE IF NOT EXISTS portal_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    email TEXT UNIQUE,
    phone TEXT,
    full_name TEXT,
    plan_type TEXT DEFAULT 'free', -- 'free' or 'paid'
    is_active BOOLEAN DEFAULT true,
    source_platform TEXT, -- e.g., 'instagram', 'youtube'
    source_content_id TEXT, -- identifier for the video/post that led to conversion
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on portal_subscribers
ALTER TABLE portal_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public insertion for subscription
CREATE POLICY "Allow public insert for subscriptions" 
ON portal_subscribers FOR INSERT 
WITH CHECK (true);

-- Allow authenticated staff to read subscribers
CREATE POLICY "Allow authenticated staff to read subscribers" 
ON portal_subscribers FOR SELECT 
TO authenticated 
USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin_master', 'dev_master', 'editor')));
