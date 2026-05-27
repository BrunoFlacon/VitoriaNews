-- Add is_primary column to social_connections for selecting default publishing profile
ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Only one primary per user+platform
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_connections_unique_primary
  ON social_connections (user_id, platform)
  WHERE is_primary = true;
