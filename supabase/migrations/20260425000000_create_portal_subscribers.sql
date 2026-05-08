-- Create portal_subscribers table for subscriber management
CREATE TABLE IF NOT EXISTS portal_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    email TEXT UNIQUE,
    phone TEXT,
    full_name TEXT,
    plan_type TEXT DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    source_platform TEXT,
    source_content_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE portal_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public insertion (subscription forms)
DROP POLICY IF EXISTS "Allow public insert for subscriptions" ON portal_subscribers;
CREATE POLICY "Allow public insert for subscriptions"
ON portal_subscribers FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to read
DROP POLICY IF EXISTS "Allow authenticated staff to read subscribers" ON portal_subscribers;
CREATE POLICY "Allow authenticated staff to read subscribers"
ON portal_subscribers FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update
DROP POLICY IF EXISTS "Allow staff to update subscribers" ON portal_subscribers;
CREATE POLICY "Allow staff to update subscribers"
ON portal_subscribers FOR UPDATE
TO authenticated
USING (true);
