
-- 1) Clean up bloat (rows with NULL external_id that bypassed the unique constraint)
DELETE FROM public.post_metrics WHERE external_id IS NULL;

-- 2) Drop legacy non-partial unique index if it exists, then create a partial one that
--    actually enforces dedupe (NULL external_id will simply not be indexed).
DROP INDEX IF EXISTS public.post_metrics_user_platform_external_id_idx;
DROP INDEX IF EXISTS public.post_metrics_user_id_platform_external_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS post_metrics_user_platform_external_uniq
  ON public.post_metrics (user_id, platform, external_id)
  WHERE external_id IS NOT NULL;

-- 3) Speed up follower-growth queries on account_metrics
CREATE INDEX IF NOT EXISTS account_metrics_user_account_collected_idx
  ON public.account_metrics (user_id, social_account_id, collected_at DESC);

CREATE INDEX IF NOT EXISTS account_metrics_user_platform_collected_idx
  ON public.account_metrics (user_id, platform, collected_at DESC);
