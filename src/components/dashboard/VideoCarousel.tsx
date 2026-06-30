import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Clock, Eye } from "lucide-react";
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
        .select('id, title, media_url, thumbnail_url, platform, viewers, duration, created_at')
        .eq('user_id', user.user.id)
        .in('type', ['video', 'story'])
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!mounted) return;
      if (data) {
        setVideos(data.map(v => ({
          id: v.id,
          title: v.title || 'Vídeo',
          media_url: v.media_url || '',
          thumbnail_url: v.thumbnail_url,
          duration: v.duration,
          views: v.viewers,
          platform: v.platform,
          created_at: v.created_at,
        })));
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
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[200px]">
              <Skeleton className="h-[120px] w-full rounded-xl" />
              <Skeleton className="h-3 w-24 mt-2" />
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
        <Play className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Vídeos Recentes</h3>
      </div>
      <Carousel opts={{ align: "start", dragFree: true }}>
        <CarouselContent className="-ml-3">
          {videos.map((video, i) => (
            <CarouselItem key={video.id} className="pl-3 basis-[200px] md:basis-[260px]">
              <div
                className="relative aspect-video bg-black/40 overflow-hidden rounded-xl group cursor-pointer"
                onMouseEnter={() => handleMouseEnter(video.id)}
                onMouseLeave={() => handleMouseLeave(video.id)}
                onClick={() => { setViewerIndex(i); setViewerOpen(true); }}
              >
                {video.media_url ? (
                  <video
                    ref={el => { if (el) videoRefs.current.set(video.id, el); }}
                    src={video.media_url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                    loop
                    playsInline
                    poster={video.thumbnail_url || undefined}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/30">
                    <Play className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                )}
                {playingId !== video.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-black/70 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    </div>
                  </div>
                )}
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/80 rounded-md px-1.5 py-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-white/80" />
                    <span className="text-[11px] text-white/80 font-medium">
                      {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                  <p className="text-xs font-medium text-white truncate">{video.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/70 uppercase">{video.platform}</span>
                    {video.views != null && (
                      <span className="text-[10px] text-white/70 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {video.views}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
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
