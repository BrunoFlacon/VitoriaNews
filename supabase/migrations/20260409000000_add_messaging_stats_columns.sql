ALTER TABLE messaging_channels ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0;
ALTER TABLE messaging_channels ADD COLUMN IF NOT EXISTS cover_photo TEXT;
