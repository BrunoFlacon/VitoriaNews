-- 3.12: Missing index on social_connections(user_id,platform,is_connected)
CREATE INDEX IF NOT EXISTS idx_social_connections_user_platform_active
  ON public.social_connections(user_id, platform, is_connected);

-- 3.13: Missing index on oauth_states(state,user_id,platform)
CREATE INDEX IF NOT EXISTS idx_oauth_states_state_user_platform
  ON public.oauth_states(state, user_id, platform);

-- 3.14: Missing composite index on messages for bot-engine silence check
CREATE INDEX IF NOT EXISTS idx_messages_user_platform_recipient_status_sent
  ON public.messages(user_id, platform, recipient_phone, status, sent_at DESC);
