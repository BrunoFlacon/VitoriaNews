-- Add profile_content column to store extra page data (experience, skills, education)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_content JSONB DEFAULT '{}'::jsonb;
