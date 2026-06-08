-- Enable pg_cron extension if not already present
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create job to run News Radar Sync daily at 04:00 AM
-- This ensures the dashboard is warm and populated when users log in.
-- We use a POST request with the service role key to trigger the system-level sync.

SELECT cron.schedule(
    'daily-news-radar-sync',
    '0 4 * * *', -- 04:00 every day
    $$
    SELECT
      net.http_post(
          url:=(SELECT value FROM settings WHERE key = 'supabase_url') || '/functions/v1/radar-api/sync-intelligence',
          headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM settings WHERE key = 'supabase_service_role_key')
          ),
          body:='{"path": "sync-intelligence"}'::jsonb
      ) as request_id;
    $$
);

-- Note: In production, change the URL to the official Supabase Function URL 
-- and replace SERVICE_ROLE_KEY with the actual secret.
