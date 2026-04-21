
-- 1. Remover função antiga que poluia post_metrics com linhas zeradas
DROP FUNCTION IF EXISTS public.collect_post_analytics() CASCADE;
DROP FUNCTION IF EXISTS public.collect_post_analytics(jsonb) CASCADE;

-- 2. Reescrever collect_social_analytics para chamar o Edge Function real
CREATE OR REPLACE FUNCTION public.collect_social_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_key text;
  fn_url text := 'https://yttsmficdfnbvvuhhdmw.supabase.co/functions/v1/collect-social-analytics';
  user_record RECORD;
BEGIN
  -- Coletar para cada usuário com conexão social ativa
  FOR user_record IN
    SELECT DISTINCT user_id
    FROM social_connections
    WHERE is_connected = true
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := fn_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('userId', user_record.user_id)
      );
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO system_logs(service, level, message, metadata)
      VALUES ('analytics_worker', 'error', 'failed to invoke collect-social-analytics', 
              jsonb_build_object('user_id', user_record.user_id, 'error', SQLERRM));
    END;
  END LOOP;

  INSERT INTO system_logs(service, level, message)
  VALUES ('analytics_worker', 'info', 'analytics collection dispatched');
END;
$$;

-- 3. Atualizar worker_process_jobs para gravar error_message
CREATE OR REPLACE FUNCTION public.worker_process_jobs()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN
    SELECT * FROM job_queue
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT 10
  LOOP
    UPDATE job_queue SET status = 'processing' WHERE id = job.id;

    BEGIN
      IF job.job_type = 'publish_post' THEN
        PERFORM publish_post_worker(job.payload);
      END IF;

      UPDATE job_queue
      SET status = 'completed', completed_at = now(), error_message = NULL
      WHERE id = job.id;

    EXCEPTION WHEN OTHERS THEN
      UPDATE job_queue
      SET
        attempts = attempts + 1,
        status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'pending' END,
        next_retry_at = now() + interval '2 minutes',
        error_message = SQLERRM
      WHERE id = job.id;
    END;
  END LOOP;
END;
$$;

-- 4. Índices para performance de analytics
CREATE INDEX IF NOT EXISTS idx_post_metrics_user_collected_platform 
  ON public.post_metrics(user_id, collected_at DESC, platform);

CREATE INDEX IF NOT EXISTS idx_account_metrics_user_collected 
  ON public.account_metrics(user_id, collected_at DESC);
