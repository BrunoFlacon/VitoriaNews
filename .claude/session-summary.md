# Session Summary — Performance & Media Fixes

## Goal
Fix images and videos in post creation preview (carousel/draft) — eliminate flickering, signed-URL delays, broken media, CLS, and high INP/LCP.

## Constraints & Preferences
- "(none)"

## Progress
### Done
- **SafeImage** rewritten to use sync `getMediaUrl` (public URL) directly, fallback to signed URL only on `onError`.
- **Removed `useResolvedMediaUrl`** from SafeImage, PostPreview, and CreatePostPanel — all media resolves synchronously via `getMediaUrl`.
- **Removed `useResolvedMediaUrl` import** from PostPreview completely; `ResolvedVideo`/`ResolvedAudio` now use `getMediaUrl` directly.
- **Replaced `ResolvedVideo`/`ResolvedAudio`** in PostPreview/CreatePostPanel to use `getMediaUrl` directly (no more hook).
- **Rewrote `MultimodalMedia` carousel**:
  - Single media → `w-full h-full object-cover` (normal flow).
  - Carousel → `absolute inset-0` inside `MediaWrapper` (`relative w-full overflow-hidden` + `min-height: 50px`).
  - Added Instagram-style dots + tap zones for navigation.
  - Carousel images use `loading="eager"`, first gets `fetchpriority="high"`.
- **Wrapped PostPreview in `React.memo`** — prevents re-render on every keystroke.
- **Removed `layoutId="active-tab-preview"`** from PostPreview tab indicator — kills forced reflow from framer-motion layout measurement.
- Cleaned unused `User` import, stray `{...(props as any)}`, `useEffect` reset that caused flash.

### In Progress
- CLS 0.28: Carousel in `MediaWrapper` uses `absolute inset-0` which collapses wrapper to `min-height: 50px` in cards without `aspect-*` (XLikeCard, TruthSocialCard, TelegramCard, WhatsAppCard) — needs `aspect-[4/5]` default on MediaWrapper or fixed-height parents.

### Blocked
- Vite dev parse error at `CreatePostPanel.tsx:977` during HMR — false positive from oxc transform; production build passes cleanly.

## Key Decisions
- **Single images → `w-full h-full object-cover`**: Works when parent has `aspect-*` (Instagram preview does). Avoids CLS from `absolute` positioning.
- **Carousel → `absolute inset-0` + `MediaWrapper`**: Carousel needs reliable sizing; `absolute` inside `relative` wrapper ensures embla fills parent regardless of `h-full` chain issues.
- **`React.memo(PostPreview)`**: Reduces INP from keyboard interaction.
- **Remove `layoutId`**: Framer-motion's `layoutId` calls `getBoundingClientRect` on every tab switch, forcing synchronous reflow.

## Remaining Issues
1. **CLS 0.28 > 0.1**: Carousel images in cards without `aspect-*` collapse to `min-height: 50px`. Fix: `aspect-[4/5]` on MediaWrapper.
2. **LCP 2.82s**: `<h1>` heading in DashboardHomeView — delayed by 168KB CreatePostPanel chunk + 122KB framer-motion. Fix: `React.lazy(CreatePostPanel)`.
3. **INP 256ms**: shadcn `SelectTrigger` (192ms processing on open) — portal rendering dropdown.
4. **`setTimeout`/`message` handler violations**: `debouncedContent` timer + Supabase Realtime websocket.
5. **orphaned `useResolvedMediaUrl.ts`**: Still in repo, no longer imported anywhere. Safe to delete.

## Relevant Files
- `src/components/ui/SafeImage.tsx` — sync `getMediaUrl` + signed URL fallback
- `src/components/dashboard/PostPreview.tsx` — memo-wrapped, no `layoutId`, `MultimodalMedia`/`MediaWrapper`, `ResolvedVideo`/`ResolvedAudio` with `getMediaUrl`
- `src/components/dashboard/CreatePostPanel.tsx` — inline `ResolvedVideo` with `getMediaUrl`
- `src/utils/mediaUtils.ts` — `getMediaUrl` sync helper
- `src/hooks/useResolvedMediaUrl.ts` — orphaned
- `src/hooks/useSignedMediaUrl.ts` — still used by DocumentsView
