import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from "lucide-react";

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

interface VideoViewerProps {
  videos: VideoItem[];
  initialIndex: number;
  onClose: () => void;
}

export function VideoViewer({ videos, initialIndex, onClose }: VideoViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPinching = useRef(false);
  const isSwiping = useRef(false);
  const touchState = useRef({ startX: 0, startY: 0, startDist: 0, startScale: 1 });

  const current = videos[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goTo(index - 1);
      if (e.key === 'ArrowRight') goTo(index + 1);
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, onClose]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    setPlaying(true);
    setProgress(0);
    setZoomed(false);
    setTransform({ scale: 1, x: 0, y: 0 });
    el.muted = false;
    el.currentTime = 0;
    el.play()?.catch(() => {});
  }, [index]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    };
    el.addEventListener('timeupdate', onTime);
    return () => el.removeEventListener('timeupdate', onTime);
  }, [current]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= videos.length) return;
    setIndex(i);
  }, [videos.length]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play()?.catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    if (touches.length === 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      touchState.current.startDist = Math.sqrt(dx * dx + dy * dy);
      touchState.current.startScale = transform.scale;
      // Track midpoint for pan during pinch
      touchState.current.startX = (touches[0].clientX + touches[1].clientX) / 2;
      touchState.current.startY = (touches[0].clientY + touches[1].clientY) / 2;
      isPinching.current = true;
      isSwiping.current = false;
    } else if (touches.length === 1) {
      touchState.current.startX = touches[0].clientX;
      touchState.current.startY = touches[0].clientY;
      isPinching.current = false;
    }
  }, [transform.scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching.current) {
      e.preventDefault();
      const touches = e.touches;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.max(1, Math.min(4, touchState.current.startScale * (dist / touchState.current.startDist)));
      // Pan: track midpoint movement
      const midX = (touches[0].clientX + touches[1].clientX) / 2;
      const midY = (touches[0].clientY + touches[1].clientY) / 2;
      const panX = midX - touchState.current.startX;
      const panY = midY - touchState.current.startY;
      setTransform(prev => ({ scale: newScale, x: prev.x + panX / newScale, y: prev.y + panY / newScale }));
      touchState.current.startX = midX;
      touchState.current.startY = midY;
      setZoomed(newScale > 1.1);
    } else if (e.touches.length === 1 && !isPinching.current) {
      const deltaX = e.touches[0].clientX - touchState.current.startX;
      const deltaY = e.touches[0].clientY - touchState.current.startY;
      // If already zoomed, pan with single finger instead of swipe
      if (zoomed) {
        e.preventDefault();
        setTransform(prev => ({ ...prev, x: prev.x + deltaX / transform.scale, y: prev.y + deltaY / transform.scale }));
        touchState.current.startX = e.touches[0].clientX;
        touchState.current.startY = e.touches[0].clientY;
      } else if (Math.abs(deltaX) > 10) {
        isSwiping.current = true;
      }
    }
  }, [zoomed, transform.scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isPinching.current) {
      isPinching.current = false;
      const s = transform.scale;
      if (s <= 1.1) {
        setTransform({ scale: 1, x: 0, y: 0 });
        setZoomed(false);
      }
      return;
    }

    if (isSwiping.current) {
      isSwiping.current = false;
      const deltaX = e.changedTouches[0].clientX - touchState.current.startX;
      if (Math.abs(deltaX) > 50) goTo(deltaX < 0 ? index + 1 : index - 1);
      return;
    }

    togglePlay();
  }, [index, transform.scale, goTo, togglePlay]);

  if (!current) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={() => { const el = videoRef.current; if (el) { const next = !el.muted; el.muted = next; setMuted(next); } }}
        className="absolute top-4 right-16 z-20 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
        aria-label={muted ? "Ativar som" : "Desativar som"}
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
        aria-label="Fechar"
      >
        <X className="w-5 h-5" />
      </button>

      {index > 0 && (
        <button
          onClick={() => goTo(index - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors hidden md:flex"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {index < videos.length - 1 && (
        <button
          onClick={() => goTo(index + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors hidden md:flex"
          aria-label="Próximo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          transform: `scale(${transform.scale}) translate(${transform.x}px, ${transform.y}px)`,
          transition: isPinching.current ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        <video
          ref={videoRef}
          src={current.media_url}
          className="w-full h-full object-contain"
          poster={current.thumbnail_url || undefined}
          loop
          playsInline
          onClick={togglePlay}
        />
      </div>

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-4 px-4 pointer-events-none z-10">
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm font-medium text-white">{current.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-white/70 uppercase">{current.platform}</span>
          {current.views != null && (
            <span className="text-xs text-white/70">{current.views} visualizações</span>
          )}
        </div>
      </div>

      {videos.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          {videos.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
