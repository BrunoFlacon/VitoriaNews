

# Plan: Analytics with Real Data, pg_cron Schedulers & Verification

## Current State

- **Analytics**: The `get-analytics` edge function generates **fake/seeded data** — engagement metrics are computed with `seededRandom()` instead of querying `post_metrics` and `account_metrics` tables.
- **Sidebar/Views**: All sections (News, Lives, Clips, Accounts) already exist with proper lazy loading and Supabase queries. They should load correctly now that RLS is permissive.
- **News Portal**: `/news` and `/news/:slug` routes exist. The `NewsPortal` dashboard component handles CRUD. The public `News` page queries `articles` with `status = 'published'`.
- **pg_cron**: Not configured yet. The database functions `enqueue_scheduled_posts()`, `collect_social_analytics()`, and `refresh_social_tokens()` already exist.

## Changes

### 1. Update `get-analytics` Edge Function to Use Real Data

Replace fake seeded metrics with real queries to `post_metrics` and `account_metrics`:

- Query `post_metrics` for the user within the selected period, aggregated by platform
- Query `account_metrics` for follower growth data
- Keep the existing response shape so the frontend doesn't break
- Fall back to the current seeded logic when no real metrics exist (so the dashboard isn't empty for new users)

### 2. Add Follower Growth Section to AdvancedAnalytics

Add a new card showing:
- Current followers per connected account (from `account_metrics` or `social_connections`)
- Growth trend over the selected period

### 3. Configure pg_cron Schedulers

Use the insert tool (not migration) to set up 3 cron jobs:
- **Publish scheduler**: Every minute — calls `enqueue_scheduled_posts()`
- **Analytics collector**: Every 6 hours — calls `collect_social_analytics()`  
- **Token refresh**: Daily at 3am — calls `refresh_social_tokens()`

Requires enabling `pg_cron` and `pg_net` extensions first via migration.

### 4. Verify All Sections Load

No code changes needed — the sidebar, views, and routes are already wired. The RLS fix from previous migrations should allow data to load. This is a manual verification step.

## Files Modified

1. **`supabase/functions/get-analytics/index.ts`** — Query `post_metrics` + `account_metrics` for real data, fall back to seeded data
2. **`src/components/dashboard/AdvancedAnalytics.tsx`** — Add follower growth card using new `followerData` from API
3. **`src/hooks/useAnalytics.ts`** — Extend `AnalyticsData` interface with `followerData` field
4. **New migration** — Enable `pg_cron` and `pg_net` extensions
5. **SQL insert** — Create 3 cron job schedules

## Execution Order

1. Migration: enable extensions
2. Update edge function with real data queries
3. Update frontend analytics types + UI
4. Configure cron jobs via insert tool

