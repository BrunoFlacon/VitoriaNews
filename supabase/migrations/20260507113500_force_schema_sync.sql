-- Performance and Schema Stabilization Migration
-- Author: Antigravity AI
-- Date: 2026-05-07

-- 1. Ensure author_id column exists in stories_lives
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stories_lives' AND column_name = 'author_id') THEN
        ALTER TABLE public.stories_lives ADD COLUMN author_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Add composite indices for faster Dashboard loading
-- Stories & Lives
CREATE INDEX IF NOT EXISTS idx_stories_lives_user_created 
ON public.stories_lives (user_id, created_at DESC);

-- Scheduled Posts
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_created 
ON public.scheduled_posts (user_id, created_at DESC);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_user_created 
ON public.messages (user_id, created_at DESC);

-- Post Metrics
CREATE INDEX IF NOT EXISTS idx_post_metrics_post_id_collected 
ON public.post_metrics (post_id, collected_at DESC);

-- 3. Social Accounts consistency
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_platform 
ON public.social_accounts (user_id, platform);

-- 4. Fix potential missing columns in social_accounts mentioned in previous sessions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_accounts' AND column_name = 'followers_count') THEN
        ALTER TABLE public.social_accounts ADD COLUMN followers_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_accounts' AND column_name = 'posts_count') THEN
        ALTER TABLE public.social_accounts ADD COLUMN posts_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 5. Grant permissions to ensure PostgREST can see the changes
GRANT ALL ON public.stories_lives TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.scheduled_posts TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.social_accounts TO postgres, anon, authenticated, service_role;
