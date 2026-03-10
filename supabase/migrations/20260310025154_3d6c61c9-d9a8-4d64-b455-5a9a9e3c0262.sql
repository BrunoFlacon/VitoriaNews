
-- ============================================
-- FASE 1.1: FIX ALL RLS POLICIES TO PERMISSIVE
-- ============================================

-- api_credentials
DROP POLICY IF EXISTS "creds_select" ON public.api_credentials;
DROP POLICY IF EXISTS "creds_insert" ON public.api_credentials;
DROP POLICY IF EXISTS "creds_update" ON public.api_credentials;
DROP POLICY IF EXISTS "creds_delete" ON public.api_credentials;
CREATE POLICY "creds_select" ON public.api_credentials AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "creds_insert" ON public.api_credentials AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "creds_update" ON public.api_credentials AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "creds_delete" ON public.api_credentials AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- contacts
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;
CREATE POLICY "contacts_select" ON public.contacts AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "contacts_insert" ON public.contacts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contacts_update" ON public.contacts AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "contacts_delete" ON public.contacts AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- documents
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;
CREATE POLICY "documents_select" ON public.documents AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "documents_insert" ON public.documents AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_update" ON public.documents AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "documents_delete" ON public.documents AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- media
DROP POLICY IF EXISTS "media_select" ON public.media;
DROP POLICY IF EXISTS "media_insert" ON public.media;
DROP POLICY IF EXISTS "media_update" ON public.media;
DROP POLICY IF EXISTS "media_delete" ON public.media;
CREATE POLICY "media_select" ON public.media AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "media_insert" ON public.media AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "media_update" ON public.media AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "media_delete" ON public.media AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- messages
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_select" ON public.messages AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "messages_insert" ON public.messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_update" ON public.messages AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "messages_delete" ON public.messages AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- messaging_channels
DROP POLICY IF EXISTS "channels_select" ON public.messaging_channels;
DROP POLICY IF EXISTS "channels_insert" ON public.messaging_channels;
DROP POLICY IF EXISTS "channels_update" ON public.messaging_channels;
DROP POLICY IF EXISTS "channels_delete" ON public.messaging_channels;
CREATE POLICY "channels_select" ON public.messaging_channels AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "channels_insert" ON public.messaging_channels AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "channels_update" ON public.messaging_channels AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "channels_delete" ON public.messaging_channels AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON public.notifications AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- oauth_states
DROP POLICY IF EXISTS "oauth_select" ON public.oauth_states;
DROP POLICY IF EXISTS "oauth_insert" ON public.oauth_states;
DROP POLICY IF EXISTS "oauth_delete" ON public.oauth_states;
CREATE POLICY "oauth_select" ON public.oauth_states AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "oauth_insert" ON public.oauth_states AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "oauth_delete" ON public.oauth_states AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- scheduled_posts
DROP POLICY IF EXISTS "posts_select" ON public.scheduled_posts;
DROP POLICY IF EXISTS "posts_insert" ON public.scheduled_posts;
DROP POLICY IF EXISTS "posts_update" ON public.scheduled_posts;
DROP POLICY IF EXISTS "posts_delete" ON public.scheduled_posts;
CREATE POLICY "posts_select" ON public.scheduled_posts AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "posts_insert" ON public.scheduled_posts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update" ON public.scheduled_posts AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON public.scheduled_posts AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- social_connections
DROP POLICY IF EXISTS "social_select" ON public.social_connections;
DROP POLICY IF EXISTS "social_insert" ON public.social_connections;
DROP POLICY IF EXISTS "social_update" ON public.social_connections;
DROP POLICY IF EXISTS "social_delete" ON public.social_connections;
CREATE POLICY "social_select" ON public.social_connections AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "social_insert" ON public.social_connections AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "social_update" ON public.social_connections AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "social_delete" ON public.social_connections AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- stories_lives
DROP POLICY IF EXISTS "stories_select" ON public.stories_lives;
DROP POLICY IF EXISTS "stories_insert" ON public.stories_lives;
DROP POLICY IF EXISTS "stories_update" ON public.stories_lives;
DROP POLICY IF EXISTS "stories_delete" ON public.stories_lives;
CREATE POLICY "stories_select" ON public.stories_lives AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "stories_insert" ON public.stories_lives AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stories_update" ON public.stories_lives AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "stories_delete" ON public.stories_lives AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "roles_select" ON public.user_roles;
CREATE POLICY "roles_select" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- FASE 1.2: NEW TABLES
-- ============================================

-- published_posts: track platform-specific publication IDs
CREATE TABLE IF NOT EXISTS public.published_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_post_id text,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.published_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp_select" ON public.published_posts AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pp_insert" ON public.published_posts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pp_update" ON public.published_posts AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pp_delete" ON public.published_posts AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- post_metrics: real metrics per post/platform
CREATE TABLE IF NOT EXISTS public.post_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  clicks integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  collected_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_select" ON public.post_metrics AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pm_insert" ON public.post_metrics AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- articles: news portal
CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  cover_image text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_select" ON public.articles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "articles_insert" ON public.articles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "articles_update" ON public.articles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "articles_delete" ON public.articles AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Public read for published articles
CREATE POLICY "articles_public_read" ON public.articles AS PERMISSIVE FOR SELECT TO anon USING (status = 'published');

-- audio_articles: TTS for articles
CREATE TABLE IF NOT EXISTS public.audio_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  audio_url text NOT NULL,
  duration integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audio_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aa_select" ON public.audio_articles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "aa_insert" ON public.audio_articles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- transcriptions: media transcriptions
CREATE TABLE IF NOT EXISTS public.transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  text text NOT NULL DEFAULT '',
  language text DEFAULT 'pt-BR',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tr_select" ON public.transcriptions AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tr_insert" ON public.transcriptions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- live_clips: clips from lives
CREATE TABLE IF NOT EXISTS public.live_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  live_id uuid REFERENCES public.stories_lives(id) ON DELETE CASCADE,
  clip_url text NOT NULL,
  title text,
  start_time integer DEFAULT 0,
  end_time integer DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lc_select" ON public.live_clips AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lc_insert" ON public.live_clips AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lc_update" ON public.live_clips AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lc_delete" ON public.live_clips AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- social_accounts: profile data per connected account
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  username text,
  profile_picture text,
  followers integer DEFAULT 0,
  following integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_select" ON public.social_accounts AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sa_insert" ON public.social_accounts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sa_update" ON public.social_accounts AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sa_delete" ON public.social_accounts AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- job_queue: background processing
CREATE TABLE IF NOT EXISTS public.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jq_select" ON public.job_queue AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "jq_insert" ON public.job_queue AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ai_generated_content
CREATE TABLE IF NOT EXISTS public.ai_generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_type text NOT NULL DEFAULT 'social_post',
  prompt text NOT NULL,
  generated_text text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_generated_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_select" ON public.ai_generated_content AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_insert" ON public.ai_generated_content AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_delete" ON public.ai_generated_content AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camp_select" ON public.campaigns AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "camp_insert" ON public.campaigns AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "camp_update" ON public.campaigns AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "camp_delete" ON public.campaigns AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- campaign_posts
CREATE TABLE IF NOT EXISTS public.campaign_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  platform text,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_posts ENABLE ROW LEVEL SECURITY;
-- Use join-based policy via campaign ownership
CREATE POLICY "cp_select" ON public.campaign_posts AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "cp_insert" ON public.campaign_posts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));
CREATE POLICY "cp_delete" ON public.campaign_posts AS PERMISSIVE FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.user_id = auth.uid()));

-- live_sessions
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz,
  stream_key text,
  status text NOT NULL DEFAULT 'draft',
  recording_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ls_select" ON public.live_sessions AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ls_insert" ON public.live_sessions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ls_update" ON public.live_sessions AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ls_delete" ON public.live_sessions AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- live_destinations
CREATE TABLE IF NOT EXISTS public.live_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  live_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  platform text NOT NULL,
  stream_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ld_select" ON public.live_destinations AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ld_insert" ON public.live_destinations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ld_update" ON public.live_destinations AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ld_delete" ON public.live_destinations AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- live_highlights
CREATE TABLE IF NOT EXISTS public.live_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  live_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  start_time integer NOT NULL DEFAULT 0,
  end_time integer NOT NULL DEFAULT 0,
  clip_url text,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lh_select" ON public.live_highlights AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "lh_insert" ON public.live_highlights AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- media_processing_jobs
CREATE TABLE IF NOT EXISTS public.media_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.media_processing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpj_select" ON public.media_processing_jobs AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mpj_insert" ON public.media_processing_jobs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- message_threads
CREATE TABLE IF NOT EXISTS public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  platform text NOT NULL,
  last_message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_select" ON public.message_threads AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mt_insert" ON public.message_threads AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mt_update" ON public.message_threads AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- message_events
CREATE TABLE IF NOT EXISTS public.message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  message text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "me_select" ON public.message_events AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "me_insert" ON public.message_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- account_metrics: historical metrics per social account
CREATE TABLE IF NOT EXISTS public.account_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  social_account_id uuid REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  followers integer DEFAULT 0,
  following integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  collected_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "am_select" ON public.account_metrics AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "am_insert" ON public.account_metrics AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- api_rate_limits
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  requests_per_minute integer NOT NULL DEFAULT 10,
  last_request_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rl_select" ON public.api_rate_limits AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rl_insert" ON public.api_rate_limits AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rl_update" ON public.api_rate_limits AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- system_logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  service text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_select" ON public.system_logs AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sl_insert" ON public.system_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- story_metrics
CREATE TABLE IF NOT EXISTS public.story_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_id uuid NOT NULL REFERENCES public.stories_lives(id) ON DELETE CASCADE,
  views integer DEFAULT 0,
  replies integer DEFAULT 0,
  exits integer DEFAULT 0,
  collected_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.story_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sm_select" ON public.story_metrics AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sm_insert" ON public.story_metrics AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FASE 1.3: INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_user_scheduled ON public.scheduled_posts(user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_post_metrics_post ON public.post_metrics(post_id, collected_at);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON public.job_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON public.job_queue(job_type, status);
CREATE INDEX IF NOT EXISTS idx_published_posts_post ON public.published_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON public.social_accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON public.campaigns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_user ON public.live_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_message_threads_user ON public.message_threads(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_service ON public.system_logs(service, created_at);
CREATE INDEX IF NOT EXISTS idx_account_metrics_account ON public.account_metrics(social_account_id, collected_at);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.articles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
