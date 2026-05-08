-- Optimization for Stories, Lives and Clips fetching
CREATE INDEX IF NOT EXISTS stories_lives_user_id_status_idx ON public.stories_lives (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS stories_lives_completed_at_idx ON public.stories_lives (completed_at DESC) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS live_sessions_user_id_status_idx ON public.live_sessions (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS live_clips_user_id_created_at_idx ON public.live_clips (user_id, created_at DESC);

-- Critical indices for Dashboard and Analytics
CREATE INDEX IF NOT EXISTS messages_user_id_created_at_idx ON public.messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scheduled_posts_user_id_created_at_idx ON public.scheduled_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_metrics_user_id_collected_at_idx ON public.post_metrics (user_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS account_metrics_user_id_collected_at_idx ON public.account_metrics (user_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS social_accounts_user_id_updated_at_idx ON public.social_accounts (user_id, updated_at DESC);
