

# Plan: Normalize Platform Names & Add Tweet Links

## Problem
The `socialPlatforms` array uses `id: "twitter"` but API data may contain "x", "twitter", or "X (Twitter)" — causing duplicate entries in charts and failed icon lookups.

## Changes

### 1. Add `normalizePlatform()` to `src/lib/utils.ts`
Utility function that maps all Twitter/X variants to `"twitter"` (matching the `socialPlatforms` id), and normalizes all other platform names to lowercase. Also add a `getPlatformDisplayName()` helper.

### 2. Update `src/components/dashboard/AdvancedAnalytics.tsx`
- Import `normalizePlatform`
- Normalize keys in `platformBreakdownData` (line 67-72) before the `socialPlatforms.find()` lookup
- Normalize platform ids in `topContent` platforms array (line 405)
- Merge entries with same normalized key

### 3. Update `src/components/dashboard/RecentPosts.tsx`
- Import `normalizePlatform`
- Normalize `platformId` before `socialPlatforms.find()` lookup (line 117)
- Add tweet link: if post has published status and platform includes "twitter"/"x", show link to `https://x.com/i/web/status/{tweet_id}` (requires fetching from `published_posts` or checking post metadata)

### 4. Update `supabase/functions/get-analytics/index.ts`
- Normalize platform names in the `platformBreakdown` aggregation loop so "x" and "twitter" merge into one entry

### 5. Update `src/pages/Dashboard.tsx`
- Normalize platform ids in the "Redes Conectadas" section (line ~230) for consistent icon display

## Files Modified
1. `src/lib/utils.ts` — add `normalizePlatform()`
2. `src/components/dashboard/AdvancedAnalytics.tsx` — normalize before chart rendering
3. `src/components/dashboard/RecentPosts.tsx` — normalize + add tweet link
4. `supabase/functions/get-analytics/index.ts` — normalize in aggregation
5. `src/pages/Dashboard.tsx` — normalize in connected networks display

