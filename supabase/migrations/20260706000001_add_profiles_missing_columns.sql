-- Add missing columns to profiles table used by AuthContext and SettingsView
-- These columns are expected by the frontend code but were never added via migration

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_status TEXT DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS email_posts_published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_engagement_alerts BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_weekly_report BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_posts_published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_realtime_engagement BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_scheduling_reminders BOOLEAN DEFAULT true;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
