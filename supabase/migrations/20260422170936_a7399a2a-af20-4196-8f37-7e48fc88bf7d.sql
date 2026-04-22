
-- ============================================================
-- SECURITY HARDENING - PHASE 1: Enable RLS on unprotected tables
-- ============================================================

-- 1. platform_tokens: lock down completely (service_role only)
ALTER TABLE public.platform_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_tokens FROM anon, authenticated;

-- 2. social_comments: user-scoped
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_select" ON public.social_comments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sc_insert" ON public.social_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sc_update" ON public.social_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sc_delete" ON public.social_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. social_inbox: user-scoped
ALTER TABLE public.social_inbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "si_select" ON public.social_inbox FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "si_insert" ON public.social_inbox FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "si_update" ON public.social_inbox FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "si_delete" ON public.social_inbox FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. social_leads: user-scoped
ALTER TABLE public.social_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sl_select" ON public.social_leads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sl_insert" ON public.social_leads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sl_update" ON public.social_leads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sl_delete" ON public.social_leads FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. social_publish_log: user-scoped via post ownership join is heavy; lock to service_role only
ALTER TABLE public.social_publish_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_publish_log FROM anon, authenticated;

-- 6. social_webhooks: service_role only
ALTER TABLE public.social_webhooks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.social_webhooks FROM anon, authenticated;

-- 7. platform_api_logs: service_role only
ALTER TABLE public.platform_api_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_api_logs FROM anon, authenticated;

-- 8. system_audit: service_role only
ALTER TABLE public.system_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.system_audit FROM anon, authenticated;

-- 9. auto_reply_rules: user-scoped
ALTER TABLE public.auto_reply_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arr_select" ON public.auto_reply_rules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "arr_insert" ON public.auto_reply_rules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "arr_update" ON public.auto_reply_rules FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "arr_delete" ON public.auto_reply_rules FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 10. post_analytics: service_role only (no user_id column)
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.post_analytics FROM anon, authenticated;

-- 11. platform_hourly_performance: read-only for authenticated
ALTER TABLE public.platform_hourly_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "php_select" ON public.platform_hourly_performance FOR SELECT TO authenticated USING (true);

-- 12. platform_rate_limits: user-scoped read
ALTER TABLE public.platform_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prl_select" ON public.platform_rate_limits FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);

-- 13. social_platforms: read-only catalog
ALTER TABLE public.social_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_select" ON public.social_platforms FOR SELECT TO authenticated USING (true);

-- 14. api_keys: user-scoped, no INSERT (must use create_api_key function)
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ak_select" ON public.api_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ak_delete" ON public.api_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- PHASE 2: Recreate views with security_invoker
-- ============================================================

ALTER VIEW public.social_publication_status SET (security_invoker = on);
ALTER VIEW public.rate_limit_status SET (security_invoker = on);
ALTER VIEW public.social_leads_dashboard SET (security_invoker = on);
ALTER VIEW public.social_posts_dashboard SET (security_invoker = on);
ALTER VIEW public.analytics_dashboard SET (security_invoker = on);
ALTER VIEW public.queue_stats SET (security_invoker = on);
ALTER VIEW public.worker_throughput SET (security_invoker = on);

-- ============================================================
-- PHASE 3: Lock down materialized view
-- ============================================================
REVOKE ALL ON public.dashboard_metrics FROM anon, authenticated;

-- ============================================================
-- PHASE 4: Fix mutable search_path on all public functions
-- ============================================================
ALTER FUNCTION public.refresh_dashboard_metrics() SET search_path = public;
ALTER FUNCTION public.worker_process_batch() SET search_path = public;
ALTER FUNCTION public.refresh_social_tokens() SET search_path = public;
ALTER FUNCTION public.create_publish_job() SET search_path = public;
ALTER FUNCTION public.process_job_queue() SET search_path = public;
ALTER FUNCTION public.update_hourly_performance() SET search_path = public;
ALTER FUNCTION public.best_posting_hour(text) SET search_path = public;
ALTER FUNCTION public.enqueue_scheduled_posts() SET search_path = public;
ALTER FUNCTION public.worker_collect_metrics() SET search_path = public;
ALTER FUNCTION public.enqueue_publish_job(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.auto_boost_trending() SET search_path = public;
ALTER FUNCTION public.worker_process_jobs() SET search_path = public;
ALTER FUNCTION public.calculate_engagement_score(integer, integer, integer, integer) SET search_path = public;
ALTER FUNCTION public.create_api_key(uuid) SET search_path = public;
ALTER FUNCTION public.detect_trending_posts() SET search_path = public;
ALTER FUNCTION public.publish_post_worker(jsonb) SET search_path = public;
ALTER FUNCTION public.sdk_publish_multi_platform(jsonb) SET search_path = public;
ALTER FUNCTION public.detect_lead_keywords(text) SET search_path = public;
ALTER FUNCTION public.sdk_publish_post(uuid) SET search_path = public;
ALTER FUNCTION public.check_rate_limit(text, uuid) SET search_path = public;
ALTER FUNCTION public.capture_social_lead(uuid, text, text, text, uuid) SET search_path = public;
ALTER FUNCTION public.publish_to_x(text) SET search_path = public, extensions;
ALTER FUNCTION public.worker_publish_post(uuid, text, uuid) SET search_path = public;
ALTER FUNCTION public.auto_reply_social(text, text) SET search_path = public;
ALTER FUNCTION public.sdk_publish_post(uuid, text, uuid, text) SET search_path = public;
ALTER FUNCTION public.sdk_collect_post_metrics(text, text) SET search_path = public;
ALTER FUNCTION public.validate_api_key(text) SET search_path = public;
ALTER FUNCTION public.api_schedule_post(text, text, jsonb, timestamptz) SET search_path = public;
ALTER FUNCTION public.api_get_post_metrics(text) SET search_path = public;
ALTER FUNCTION public.api_publish_post(text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.publish_to_telegram(text) SET search_path = public, extensions;
ALTER FUNCTION public.worker_sdk_publisher() SET search_path = public;
ALTER FUNCTION public.collect_post_metrics(uuid) SET search_path = public;
ALTER FUNCTION public.optimize_post_schedule() SET search_path = public;
ALTER FUNCTION public.worker_process_inbox() SET search_path = public;
ALTER FUNCTION public.api_get_leads(text) SET search_path = public;
ALTER FUNCTION public.api_receive_webhook(text, text, jsonb) SET search_path = public;

-- ============================================================
-- PHASE 5: Sanitize handle_new_user trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_name := TRIM(v_name);
  v_name := LEFT(v_name, 100);
  v_name := regexp_replace(v_name, '[<>"''`]', '', 'g');
  IF char_length(v_name) < 1 THEN
    v_name := split_part(NEW.email, '@', 1);
  END IF;
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, v_name, NEW.email);
  RETURN NEW;
END;
$$;

-- ============================================================
-- PHASE 6: Profile data integrity constraints
-- ============================================================
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT profiles_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500);

-- ============================================================
-- PHASE 7: Storage hardening
-- ============================================================
-- Make media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'media';

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Public can read media files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media files" ON storage.objects;

-- Recreate SELECT scoped to owning folder
CREATE POLICY "Users can read own media files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Recreate UPDATE with ownership check
CREATE POLICY "Users can update own media files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
