-- Advanced Database Optimization Migration
-- Author: Antigravity AI
-- Date: 2026-05-07

-- 1. Performance Indices for Social Analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_account_metrics_user_collected 
ON public.account_metrics (user_id, collected_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_metrics_user_collected 
ON public.post_metrics (user_id, collected_at DESC);

-- 2. Indices for Live Streaming and Clips
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_sessions_user_status 
ON public.live_sessions (user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_live_clips_live_id_created 
ON public.live_clips (live_id, created_at DESC);

-- 3. Security and API Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_settings_user_platform 
ON public.api_settings (user_id, platform);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_credentials_user_platform 
ON public.api_credentials (user_id, platform);

-- 4. Unified Profile Indices
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_name 
ON public.profiles (name) WHERE name IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email 
ON public.profiles (email);

-- 5. Messaging Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messaging_channels_user_platform 
ON public.messaging_channels (user_id, platform);

-- 6. Bot Settings Performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bot_settings_user_platform 
ON public.bot_settings (user_id, platform);

-- 7. High-Traffic Tables Optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created 
ON public.notifications (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_platform 
ON public.messages (user_id, platform, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_repost_suggestions_user 
ON public.repost_suggestions (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_ataque_user 
ON public.eventos_de_ataque (user_id);

-- 8. Statistics for faster aggregate counts
ANALYZE public.social_accounts;
ANALYZE public.stories_lives;
ANALYZE public.scheduled_posts;
ANALYZE public.messages;
ANALYZE public.notifications;
