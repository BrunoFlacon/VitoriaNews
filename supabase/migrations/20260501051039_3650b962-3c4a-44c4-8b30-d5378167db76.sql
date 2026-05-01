
-- Safety: ensure columns exist before any index references them
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS platform_user_id TEXT;
ALTER TABLE public.social_connections ADD COLUMN IF NOT EXISTS platform_user_id TEXT;
ALTER TABLE public.post_metrics ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.post_metrics ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE public.trends ADD COLUMN IF NOT EXISTS source TEXT;

-- Drop and recreate indexes to guarantee they are valid
DROP INDEX IF EXISTS social_accounts_user_platform_pid_unique;
CREATE UNIQUE INDEX social_accounts_user_platform_pid_unique
  ON public.social_accounts (user_id, platform, platform_user_id)
  WHERE platform_user_id IS NOT NULL;

DROP INDEX IF EXISTS post_metrics_user_platform_extid_unique;
CREATE UNIQUE INDEX post_metrics_user_platform_extid_unique
  ON public.post_metrics (user_id, platform, external_id)
  WHERE external_id IS NOT NULL;
