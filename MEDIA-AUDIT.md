# Media Audit — Social Canvas Hub

> Date: 2026-06-30
> Scope: All components handling video, audio, and photo/image display and editing
> Total files audited: ~64 | Issues found: 18

---

## Critical Issues

### C1. MediaGalleryView uses mock data — completely non-functional

**File:** `src/components/dashboard/MediaGalleryView.tsx`
**Severity:** Critical
**Impact:** The entire "Galeria de Mídia" tab shows 8 hardcoded items pointing to `/placeholder.svg`. Upload, delete, filter, search only mutate local state. Nothing reaches Supabase.

```tsx
const mockMedia: MediaItem[] = [
  { id: '1', name: 'banner-promo.jpg', type: 'image', url: '/placeholder.svg', ... },
  ...
];
```

**Fix needed:** Integrate with Supabase `media` table — fetch, upload, delete via `useMediaUpload` hook.

---

### C2. MediaEditor crop tab is UI-only — no crop implementation

**File:** `src/components/dashboard/MediaEditor.tsx:380-404`
**Severity:** Critical
**Impact:** User can select an aspect ratio (`1:1`, `16:9`, etc.) but `renderCanvas()` never reads `cropAspect`. The canvas renders the full uncropped image regardless.

```tsx
// cropAspect is set but never passed to any rendering logic
const [cropAspect, setCropAspect] = useState<'free' | '1:1' | '16:9' | '9:16' | '4:5'>('free');
```

**Fix needed:** Implement actual crop rectangle selection and apply it in `renderCanvas`.

---

### C3. useMediaUpload blocks ALL audio file types

**File:** `src/hooks/useMediaUpload.ts:35-38`
**Severity:** Critical
**Impact:** The allowed types list includes image/* and video/* but **no audio MIME types**. Uploading `.mp3`, `.wav`, `.ogg`, `.flac` always returns "Tipo de arquivo não suportado", breaking the entire audio feature set.

```tsx
const allowedTypes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf'  // ← no audio/*
];
```

**Fix needed:** Add `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/flac`, `audio/mp4`.

---

### C4. StoryEditor type detection is fragile and incomplete

**File:** `src/components/dashboard/StoryEditor.tsx:92`
**Severity:** Critical
**Impact:** Detects video only by `.mp4`/`.mov` extensions, audio only by `.mp3`, and audio detection only works for the **first slide** (`i === 0`). All other formats (`.webm`, `.avi`, `.mkv`, `.wav`, `.ogg`) fall through to "image".

```tsx
type: url.includes(".mp4") || url.includes(".mov") ? "video" : i === 0 && url.includes(".mp3") ? "audio" : "image",
```

**Fix needed:** Use a proper type-detection function checking MIME type or a broader extension set; remove `i === 0` restriction.

---

### C5. Generated audio never persisted to storage or media table

**File:** `src/components/dashboard/CreatePostPanel.tsx:512-530`
**Severity:** Critical
**Impact:** When user generates AI audio (ElevenLabs), the result is stored as a local-only object with a temporary `file_url`. If the page is refreshed, the audio URL (a one-time signed or temporary URL) is lost. The audio is never uploaded to Supabase storage.

```tsx
id: `audio-${Date.now()}`,      // ← temp ID, not from DB
file_url: result.audioUrl,      // ← direct ElevenLabs URL, not uploaded
```

**Fix needed:** After receiving the AI audio URL, fetch the blob and upload it via `useMediaUpload`.

---

## High-Priority Issues

### H1. VideoCarousel memory leak — videoRefs Map never cleaned

**File:** `src/components/dashboard/VideoCarousel.tsx:24`
**Severity:** High
**Impact:** The `videoRefs` Map collects `<video>` elements on mount but never removes them on unmount or item change. This leaks DOM references.

```tsx
const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
// entries are created in the ref callback but never cleared
```

**Fix needed:** Use a cleanup in the ref callback or a useEffect return.

---

### H2. PostVideoPicker inconsistent URL construction across tabs

**File:** `src/components/dashboard/PostVideoPicker.tsx:57-78`
**Severity:** High
**Impact:** The "Stories" tab uses `media_url` directly from `stories_lives` (may be full URL or relative). The "Mídias" tab constructs a URL by concatenating bucket base + `file_url`. If `media.file_url` already contains a full URL, or if the bucket setting changes, URLs break.

```tsx
// stories tab — direct from DB
media_url: v.media_url || '',

// media tab — manually constructed
const bucketUrl = publicUrl.replace(/\/$/, '');
media_url: `${bucketUrl}/${m.file_url}`,
```

**Fix needed:** Use `getMediaUrl()` consistently for both sources; store normalized paths.

---

### H3. FeedPreview videos have no poster — blank slot in carousel

**File:** `src/components/dashboard/FeedPreview.tsx:104-117`
**Severity:** High
**Impact:** Video slides in the `SlideCarousel` use `<video>` with `preload="none"` and no `poster` attribute. Mixed carousels (images + videos) show a blank/black rectangle where the video sits until clicked.

```tsx
<video src={url} className="w-full h-full object-cover" muted loop playsInline preload="none" />
```

**Fix needed:** Generate or set a `poster` attribute (thumbnail from video, placeholder image, or canvas snapshot). At minimum add the thumbnail_url when available.

---

### H4. PostPreview shared `playing` state across all videos in carousel

**File:** `src/components/dashboard/PostPreview.tsx:80`
**Severity:** High
**Impact:** When `MultimodalMedia` contains multiple videos in a carousel, the single `playing` state toggles all videos simultaneously. Clicking one affects others.

```tsx
const MultimodalMedia = ({ media, playing, setPlaying, videoRef, audioRef, ... }: any) => {
```

**Fix needed:** Track playing state per-video (index-keyed map).

---

### H5. StoriesLivesView mixed URL types — some may be relative, some absolute

**File:** `src/components/dashboard/StoriesLivesView.tsx`
**Severity:** High
**Impact:** The `media_url` column in `stories_lives` may store direct URLs or relative storage paths, depending on how the story was created (direct upload vs. external URL). Multiple places read `media_url` directly without passing through `getMediaUrl()`.

**Fix needed:** Always resolve through `getMediaUrl()` or `useSignedMediaUrl`.

---

## Medium-Priority Issues

### M1. No error handling for MediaRecorder / getUserMedia rejection

**File:** `src/components/dashboard/StoryEditor.tsx:330-360`
**Severity:** Medium
**Impact:** If the user denies microphone/camera permission, `getUserMedia` throws but the error is only logged to console. No toast or UI feedback.

```tsx
const stream = await navigator.mediaDevices.getUserMedia({ ... }).catch(err => {
  console.error('Error accessing media devices:', err);  // ← only console
});
```

**Fix needed:** Show a user-facing error toast with clear instructions.

---

### M2. MediaEditor text overlays fixed at center — no drag support

**File:** `src/components/dashboard/MediaEditor.tsx:129-144`
**Severity:** Medium
**Impact:** "Adicionar Texto" always places text at `(canvas.width/2, canvas.height/2)`. There's no mechanism to reposition overlays.

```tsx
const newOverlay: TextOverlay = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  ...
};
```

**Fix needed:** Add drag-to-reposition on the canvas or X/Y slider controls.

---

### M3. MessagingView `startsWith("audio")` missing trailing slash

**File:** `src/components/dashboard/MessagingView.tsx:998`
**Severity:** Medium
**Impact:** `file.type.startsWith("audio")` could match unexpected MIME types like `audio/webm; codecs=opus` — actually this is correct, but the pattern is inconsistent with the `startsWith("image")` and `startsWith("video")` checks. It should be `startsWith("audio/")` for consistency.

```tsx
file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "file";
```

**Fix needed:** Use `startsWith("audio/")` for consistency.

---

### M4. VideoViewer zoom is scale-only, no pan support

**File:** `src/components/dashboard/VideoViewer.tsx:106-114`
**Severity:** Medium
**Impact:** Pinch-to-zoom scales the video but `transform.x` and `transform.y` are never updated — they remain 0. User cannot pan around a zoomed video.

```tsx
setTransform(prev => ({ ...prev, scale: newScale }));  // x and y never change
```

**Fix needed:** Add two-finger drag to pan when zoomed.

---

### M5. VideoRetentionChart doesn't handle empty/zero data gracefully

**File:** `src/components/dashboard/VideoRetentionChart.tsx:11`
**Severity:** Medium
**Impact:** If all `metric.views` are 0, `maxViews` is `Math.max(0, 1) = 1`, meaning every bar shows 100% width. Also doesn't handle the case where `totalViews` is 0 — it logs NaN for percentage.

```tsx
const maxViews = Math.max(...data.map(d => d.views), 1);   // 0→1 mask hides zero-data
const totalPct = totalViews > 0 ? ... : '0';               // correct check here
```

**Fix needed:** If all data is 0, render empty bars with a "no data" visual.

---

### M6. Multiple components save `media_url` directly without normalization

**Files:** `StoryEditor.tsx`, `StoriesLivesView.tsx`, `CreatePostPanel.tsx`
**Severity:** Medium
**Impact:** When saving stories/lives/posts, the `media_url` field gets whatever URL is available — could be a full external URL, a Supabase public URL, or a storage path. Downstream code doesn't always account for this.

**Fix needed:** Create and use a `normalizeMediaUrl()` utility that stores storage paths consistently.

---

## Low-Priority Issues

### L1. VideoCarousel — videos have `willChange: 'transform'` on every element

**File:** `src/components/dashboard/VideoCarousel.tsx:121`
**Severity:** Low
**Impact:** Overusing `willChange` can actually hurt performance by keeping GPU memory allocated. Should only apply during active hover.

```tsx
style={{ willChange: 'transform' }}
```

**Fix needed:** Remove or apply conditionally during mouseEnter/mouseLeave.

---

### L2. MediaEditor saves as PNG — no compression option

**File:** `src/components/dashboard/MediaEditor.tsx:165`
**Severity:** Low
**Impact:** `canvas.toDataURL('image/png', 1.0)` can produce multi-MB data URLs for high-resolution images. No JPEG/WebP option.

**Fix needed:** Offer format selection or default to JPEG with quality 0.92.

---

### L3. PostPreview `ResolvedVideo` — `playing` state may get stale in callback

**File:** `src/components/dashboard/PostPreview.tsx:46-52`
**Severity:** Low
**Impact:** The `handleClick` callback uses `playing` from its closure (created when `ResolvedVideo` renders). If `playing` changes rapidly, the toggle logic could be inverted.

```tsx
const handleClick = useCallback(() => {
  if (videoRef?.current) {
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying?.(!playing);  // !playing may be stale
  }
}, [videoRef, playing, setPlaying]);
```

**Fix needed:** Use a ref to track the latest `playing` value, or read `videoRef.current.paused` directly.

---

### L4. CarrosselView — slide transforms use direct style mutation

**File:** `src/components/dashboard/CarrosselView.tsx`
**Severity:** Low
**Impact:** Individual slide transforms may trigger layout if not GPU-composited.

---

## Summary Table

| ID | Component | Issue | Severity |
|----|-----------|-------|----------|
| C1 | MediaGalleryView | Mock data, no Supabase integration | Critical |
| C2 | MediaEditor | Crop tab UI-only, no implementation | Critical |
| C3 | useMediaUpload | Audio MIME types blocked | Critical |
| C4 | StoryEditor | Fragile type detection | Critical |
| C5 | CreatePostPanel | AI audio not persisted | Critical |
| H1 | VideoCarousel | videoRefs memory leak | High |
| H2 | PostVideoPicker | Inconsistent URL construction | High |
| H3 | FeedPreview | Videos in carousel have no poster | High |
| H4 | PostPreview | Shared `playing` state across videos | High |
| H5 | StoriesLivesView | Mixed URL types | High |
| M1 | StoryEditor | MediaRecorder error handling missing | Medium |
| M2 | MediaEditor | Text overlays fixed at center | Medium |
| M3 | MessagingView | `startsWith("audio")` no trailing slash | Medium |
| M4 | VideoViewer | Zoom without pan support | Medium |
| M5 | VideoRetentionChart | Zero-data edge case | Medium |
| M6 | Multiple files | Non-normalized media_url storage | Medium |
| L1 | VideoCarousel | `willChange` on all elements | Low |
| L2 | MediaEditor | PNG-only export, no compression | Low |
| L3 | PostPreview | Stale `playing` closure | Low |
| L4 | CarrosselView | Direct style mutations | Low |

---

## Correction Plan

### Wave 1 — Critical (must fix)
1. **C3** — Add audio MIME types to `useMediaUpload.ts` allowedTypes
2. **C4** — Fix `StoryEditor.tsx` type detection to use `getMediaUrl()` + broad extension check
3. **C5** — Upload AI-generated audio to Supabase storage after generation in `CreatePostPanel.tsx`
4. **C1** — Connect `MediaGalleryView.tsx` to Supabase `media` table (fetch, upload, delete)

### Wave 2 — High (functional gaps)
5. **H1** — Clean up `videoRefs` Map on unmount in `VideoCarousel.tsx`
6. **H2** — Use `getMediaUrl()` consistently in `PostVideoPicker.tsx`
7. **H3** — Add poster/thumbnail fallback for video slides in `FeedPreview.tsx`
8. **H4** — Per-index `playing` state in `MultimodalMedia`
9. **H5** — Normalize `media_url` reads in `StoriesLivesView.tsx`

### Wave 3 — Medium (UX & edge cases)
10. **M1** — Add toast on getUserMedia failure in `StoryEditor.tsx`
11. **M3** — Fix `startsWith("audio")` to `startsWith("audio/")` in `MessagingView.tsx`
12. **M5** — Handle zero-data case in `VideoRetentionChart.tsx`

### Wave 4 — Low (polish)
13. **L1** — Remove `willChange` from `VideoCarousel.tsx` inline styles
14. **L2** — Add format/quality options to `MediaEditor.tsx` save
