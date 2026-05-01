
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jobid, jobname, schedule, command, active FROM cron.job ORDER BY jobid;
$$;

CREATE OR REPLACE FUNCTION public.get_cron_run_details()
RETURNS TABLE(runid bigint, jobid bigint, job_pid integer, command text, status text, return_message text, start_time timestamptz, end_time timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT runid, jobid, job_pid, command, status, return_message, start_time, end_time
  FROM cron.job_run_details
  ORDER BY start_time DESC
  LIMIT 100;
$$;

-- Restrict execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_cron_jobs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_cron_run_details() FROM anon;
