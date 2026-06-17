-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create job to run radar and automation schedules
SELECT cron.schedule(
    'invoke-automation-radar',
    '0 * * * *', -- Run every hour
    $$
    SELECT
      net.http_post(
          url:='http://127.0.0.1:54321/functions/v1/automation-api/process_queue',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Note: Replace SERVICE_ROLE_KEY and URL with actual values in production.
