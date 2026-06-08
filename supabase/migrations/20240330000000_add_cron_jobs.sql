-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create job to run radar and automation schedules
SELECT cron.schedule(
    'invoke-automation-radar',
    '0 * * * *', -- Run every hour
    $$
    SELECT
      net.http_post(
          url:=(SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/automation-api/process_queue',
          headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
          ),
          body:='{}'::jsonb
      ) as request_id;
    $$
);
