
## Plan Overview

This plan addresses five areas: migration safety fix, social account connections, analytics with real data, cron job monitoring, and PDF report generation.

---

### 1. Migration Safety Fix

Create a new migration that ensures `platform_user_id` column exists on `social_accounts` and `social_connections` before any conditional unique indexes reference it. The column already exists in production, but the migration will use `IF NOT EXISTS` guards to be idempotent and prevent future deploy failures.

---

### 2. Social Account Connection Screen Enhancement

The "Redes Sociais" view (tab `networks` in Dashboard) already renders `SocialNetworkCard` for platforms defined in `socialPlatforms`. Currently it shows ~12 platforms.

**Changes:**
- Add missing platforms to `src/components/icons/platform-metadata.ts`: Kwai, Rumble, Truth Social, Gettr, Reddit, News API, Google News, WhatsApp Business (if not already present as distinct entries)
- Each card already calls `handleConnect` / `disconnect` from `useSocialConnections` hook which stores tokens via `social_connections` table
- Ensure the OAuth init edge function handles all listed platforms (most already do; add fallback for manual token entry for platforms without OAuth like News API)
- Add a "Manual Token" dialog for platforms that don't have OAuth flows (News API, Google News) -- reuses existing API credentials tab pattern

---

### 3. Analytics with Real Data and Filters

The `AdvancedAnalytics` component already has period filters and platform filters. The `useAnalytics` hook queries `post_metrics`, `account_metrics`, and `social_connections`.

**Changes:**
- Add content type filter (`postType`) to the `useAnalytics` hook query -- filter `post_metrics` by `media_type` column
- Ensure `collect-social-analytics` edge function writes real metrics from connected APIs (Meta Graph API, TikTok, YouTube Data API) into `post_metrics` and `account_metrics` with proper `media_type` values
- Add per-post detail rows in the analytics table showing individual post performance
- Connect the existing `postType` state in `AdvancedAnalytics` to the hook's query

---

### 4. Cron Job Monitoring View

Create a new dashboard view accessible from the sidebar.

**Changes:**
- Add a "Monitoramento" entry to the Sidebar menu items
- Create `src/components/dashboard/CronMonitorView.tsx` that:
  - Queries `cron.job` table (via an edge function since client can't access `cron` schema directly) to show all scheduled jobs, their schedule, and active status
  - Queries `cron.job_run_details` to show last 50 runs with status, return_message, start_time, end_time
  - Groups by job name showing success/failure counts
  - Color-coded status badges (green=succeeded, red=failed)
  - Auto-refresh every 30 seconds
- Create `supabase/functions/cron-status/index.ts` edge function that reads from `cron.job` and `cron.job_run_details` using service_role and returns the data
- Add the view to the Dashboard switch-case

---

### 5. PDF Report Generation Fix

The existing `handleExportPDF` uses `html2canvas` to screenshot the analytics div and write to PDF. This approach works but can fail with cross-origin images or complex layouts.

**Changes:**
- Ensure `reportRef` wraps the correct analytics content area (verify it covers all chart sections)
- Add error handling for missing data scenarios
- Add a loading state overlay during generation
- Include report metadata: generation date, period, platform filter, total metrics summary on page 1
- Ensure the button is always visible and functional (currently it exists at line 616)

---

### Technical Details

**New files:**
- `src/components/dashboard/CronMonitorView.tsx` -- monitoring UI
- `supabase/functions/cron-status/index.ts` -- edge function for cron data

**Modified files:**
- `src/components/icons/platform-metadata.ts` -- add missing platform entries
- `src/components/dashboard/Sidebar.tsx` -- add monitoring menu item
- `src/pages/Dashboard.tsx` -- add monitoring case, wire postType filter
- `src/hooks/useAnalytics.ts` -- add content type filtering
- `src/components/dashboard/AdvancedAnalytics.tsx` -- connect postType to hook, improve PDF export
- `supabase/functions/collect-social-analytics/index.ts` -- ensure real data capture with media_type

**New migration:**
- Safety migration ensuring all required columns exist before index creation
