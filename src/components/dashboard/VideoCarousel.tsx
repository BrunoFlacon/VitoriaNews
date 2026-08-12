import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Eye, Film } from "lucide-react";
import { VideoViewer } from "@/components/dashboard/VideoViewer";

interface VideoItem {
  id: string;
  title: string;
  media_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  platform: string;
  created_at: string;
}

// Platform icon as SVG path — returns the brand color + svg content
const PLATFORM_META: Record<string, { color: string; label: string; svg: string }> = {
  instagram: {
    color: "#E1306C",
    label: "Instagram",
    svg: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
  tiktok: {
    color: "#69C9D0",
    label: "TikTok",
    svg: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.89a8.27 8.27 0 004.84 1.55V7a4.85 4.85 0 01-1.07-.31z",
  },
  whatsapp: {
    color: "#25D366",
    label: "WhatsApp",
    svg: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  },
  youtube: {
    color: "#FF0000",
    label: "YouTube",
    svg: "M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z",
  },
  facebook: {
    color: "#1877F2",
    label: "Facebook",
    svg: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  twitter: {
    color: "#1DA1F2",
    label: "Twitter / X",
    svg: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.848L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  linkedin: {
    color: "#0A66C2",
    label: "LinkedIn",
    svg: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
};

function PlatformIcon({ platform, size = 14 }: { platform: string; size?: number }) {
  const meta = PLATFORM_META[platform?.toLowerCase()] || null;
  if (!meta) return <span className="text-[9px] text-white/80 uppercase font-bold tracking-wide">{platform}</span>;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={meta.color}
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.7))" }}
    >
      <path d={meta.svg} />
    </svg>
  );
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoCarousel() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    return () => { videoRefs.current.clear(); };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) { setLoading(false); return; }

      const { data } = await supabase
        .from('stories_lives')
        .select('id, title, media_url, thumbnail_url, platform, viewers, duration, metadata, created_at')
        .eq('user_id', user.user.id)
        .in('type', ['video', 'story'])
        .order('created_at', { ascending: false })
        .limit(12);

      if (!mounted) return;
      if (data) {
        setVideos((data as any[]).map(v => {
          const meta = v.metadata && typeof v.metadata === 'object' ? (v.metadata as any) : {};
          const rawPlatform = v.platform || '';
          const cleanPlatform = rawPlatform.includes('|') ? rawPlatform.split('|')[0].trim().toLowerCase() : rawPlatform.trim().toLowerCase();
          
          return {
            id: v.id,
            title: v.title || 'Vídeo',
            media_url: v.media_url || '',
            thumbnail_url: v.thumbnail_url,
            duration: typeof v.duration === 'number' ? v.duration : (typeof meta.duration === 'number' ? meta.duration : null),
            views: v.viewers ?? meta.views ?? null,
            platform: cleanPlatform,
            created_at: v.created_at,
          };
        }));
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleMouseEnter = useCallback((id: string) => {
    const el = videoRefs.current.get(id);
    if (!el || el.dataset.playing === 'true') return;
    el.dataset.playing = 'true';
    el.play()?.catch(() => {});
    setPlayingId(id);
  }, []);

  const handleMouseLeave = useCallback((id: string) => {
    const el = videoRefs.current.get(id);
    if (!el) return;
    delete el.dataset.playing;
    el.pause();
    el.currentTime = 0;
    setPlayingId(null);
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Vídeos Recentes</h3>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[120px]">
              <Skeleton className="h-[210px] w-full rounded-2xl" />
              <Skeleton className="h-3 w-16 mt-2 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Film className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Vídeos Recentes</h3>
      </div>

      <Carousel opts={{ align: "start", dragFree: true }}>
        <CarouselContent className="-ml-2">
          {videos.map((video, i) => {
            const platformMeta = PLATFORM_META[video.platform?.toLowerCase()];
            const isPlaying = playingId === video.id;
            const fallbackColor = platformMeta ? platformMeta.color : '#3f3f46';

            return (
              <CarouselItem key={video.id} className="pl-2 basis-[120px] md:basis-[140px]">
                {/* Story card — 9:16 portrait */}
                <div
                  className="relative overflow-hidden rounded-2xl cursor-pointer group bg-zinc-900"
                  style={{ aspectRatio: "9/16" }}
                  onMouseEnter={() => handleMouseEnter(video.id)}
                  onMouseLeave={() => handleMouseLeave(video.id)}
                  onClick={() => { setViewerIndex(i); setViewerOpen(true); }}
                >
                  {/* Colored Fallback Background */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center opacity-40 transition-opacity"
                    style={{ 
                      background: `linear-gradient(to bottom, ${fallbackColor}80, #18181b)` 
                    }}
                  >
                     <PlatformIcon platform={video.platform} size={48} />
                  </div>

                  {/* Thumbnail layer — always visible */}
                  {video.thumbnail_url && (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover z-0"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}

                  {/* Video layer — loads on hover */}
                  {video.media_url && (
                    <video
                      ref={el => { if (el) videoRefs.current.set(video.id, el); }}
                      src={video.media_url}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-0 ${isPlaying ? "opacity-100" : "opacity-0"}`}
                      preload="none"
                      muted
                      loop
                      playsInline
                    />
                  )}

                  {/* Top gradient + platform icon */}
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/20 to-transparent z-10 pointer-events-none" />
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                    <PlatformIcon platform={video.platform} size={14} />
                    {platformMeta && (
                      <span
                        className="text-[9px] font-bold tracking-wide uppercase"
                        style={{ color: platformMeta.color, textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
                      >
                        {platformMeta.label}
                      </span>
                    )}
                  </div>

                  {/* Duration badge */}
                  {video.duration != null && video.duration > 0 && (
                    <div className="absolute top-2 right-2 z-20 bg-black/75 rounded-md px-1.5 py-0.5">
                      <span className="text-[10px] text-white font-medium">{formatDuration(video.duration)}</span>
                    </div>
                  )}

                  {/* Play overlay */}
                  {!isPlaying && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-10 h-10 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <Play className="w-5 h-5 text-white ml-0.5 fill-white" />
                      </div>
                    </div>
                  )}

                  {/* Bottom gradient + title + views */}
                  <div
                    className="absolute inset-x-0 bottom-0 z-10 px-2 pb-2 pt-8 pointer-events-none"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)"
                    }}
                  >
                    <p
                      className="text-[11px] font-semibold text-white leading-tight line-clamp-2"
                      style={{ textShadow: "0 1px 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.8)" }}
                    >
                      {video.title}
                    </p>
                    {video.views != null && (
                      <div className="flex items-center gap-1 mt-1">
                        <Eye className="w-3 h-3 text-white/80" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.9))" }} />
                        <span
                          className="text-[10px] text-white/90 font-medium"
                          style={{ textShadow: "0 1px 4px rgba(0,0,0,1)" }}
                        >
                          {formatViews(video.views)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-3 w-8 h-8" />
        <CarouselNext className="hidden md:flex -right-3 w-8 h-8" />
      </Carousel>

      {viewerOpen && (
        <VideoViewer
          videos={videos}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}
