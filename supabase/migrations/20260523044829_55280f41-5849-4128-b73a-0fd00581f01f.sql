DELETE FROM public.post_metrics
WHERE COALESCE(likes,0) = 0
  AND COALESCE(comments,0) = 0
  AND COALESCE(shares,0) = 0
  AND COALESCE(impressions,0) = 0
  AND COALESCE(reach,0) = 0;

CREATE OR REPLACE FUNCTION public.collect_post_metrics(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RETURN;
END;
$$;

DO $$
DECLARE
  j RECORD;
BEGIN
  FOR j IN SELECT jobid FROM cron.job WHERE jobname IN ('collect-metrics','learn-post-performance') LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;
END $$;