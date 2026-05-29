ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS callback_domain TEXT;
