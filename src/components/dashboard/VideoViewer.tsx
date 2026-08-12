import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Eye } from "lucide-react";

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
    label: "X / Twitter",
    svg: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.848L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  linkedin: {
    color: "#0A66C2",
    label: "LinkedIn",
    svg: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
};

function PlatformBadge({ platform }: { platform: string }) {
  const meta = PLATFORM_META[platform?.toLowerCase()];
  if (!meta) return (
    <span className="text-xs text-white/90 font-bold uppercase tracking-wider" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
      {platform}
    </span>
  );
  return (
    <div className="flex items-center gap-1.5">
      <svg width={18} height={18} viewBox="0 0 24 24" fill={meta.color} xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.9))" }}>
        <path d={meta.svg} />
      </svg>
      <span className="text-xs font-bold tracking-wide" style={{ color: meta.color, textShadow: "0 1px 6px rgba(0,0,0,1)" }}>
        {meta.label}
      </span>
    </div>
  );
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function VideoViewer({ videos, initialIndex, onClose }: VideoViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const [isImageFallback, setIsImageFallback] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPinching = useRef(false);
  const isSwiping = useRef(false);
  const touchState = useRef({ startX: 0, startY: 0, startDist: 0, startScale: 1 });
  const touchRAFRef = useRef<number | null>(null);

  const current = videos[index];
  const isImage = current.media_url?.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i) !== null || isImageFallback;

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [index, resetControlsTimer]);

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
    el.muted = muted;
    el.currentTime = 0;
    el.play()?.catch(() => {});
  }, [index]);

  useEffect(() => {
    setIsImageFallback(false);
  }, [current]);

  useEffect(() => {
    if (!isImage || !playing) return;
    const duration = 5000; // 5 segundos para imagens
    const interval = 50;
    let elapsed = 0;
    
    const timer = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);
      if (elapsed >= duration) {
        clearInterval(timer);
        if (index < videos.length - 1) {
           setIndex(index + 1);
        } else {
           setPlaying(false);
        }
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [isImage, playing, index, videos.length]);

  useEffect(() => {
    const styleId = 'video-viewer-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = 'body.video-viewer-open { overflow: hidden !important; }';
      document.head.appendChild(style);
    }
    document.body.classList.add('video-viewer-open');
    return () => {
      document.body.classList.remove('video-viewer-open');
      const s = document.getElementById(styleId);
      if (s) s.remove();
    };
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
    resetControlsTimer();
  }, [resetControlsTimer]);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    resetControlsTimer();
    const touches = e.touches;
    if (touches.length === 2) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      touchState.current.startDist = Math.sqrt(dx * dx + dy * dy);
      touchState.current.startScale = transform.scale;
      touchState.current.startX = (touches[0].clientX + touches[1].clientX) / 2;
      touchState.current.startY = (touches[0].clientY + touches[1].clientY) / 2;
      isPinching.current = true;
      isSwiping.current = false;
    } else if (touches.length === 1) {
      touchState.current.startX = touches[0].clientX;
      touchState.current.startY = touches[0].clientY;
      isPinching.current = false;
    }
  }, [transform.scale, resetControlsTimer]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchRAFRef.current) return;
    if (e.touches.length === 2 && isPinching.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const touches = e.touches;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      touchRAFRef.current = requestAnimationFrame(() => {
        touchRAFRef.current = null;
        const newScale = Math.max(1, Math.min(4, touchState.current.startScale * (dist / touchState.current.startDist)));
        const panX = midX - touchState.current.startX;
        const panY = midY - touchState.current.startY;
        setTransform(prev => ({ scale: newScale, x: prev.x + panX / newScale, y: prev.y + panY / newScale }));
        touchState.current.startX = midX;
        touchState.current.startY = midY;
        setZoomed(newScale > 1.1);
      });
    } else if (e.touches.length === 1 && !isPinching.current) {
      const t = e.touches[0];
      touchRAFRef.current = requestAnimationFrame(() => {
        touchRAFRef.current = null;
        const deltaX = t.clientX - touchState.current.startX;
        const deltaY = t.clientY - touchState.current.startY;
        if (zoomed) {
          setTransform(prev => ({ ...prev, x: prev.x + deltaX / transform.scale, y: prev.y + deltaY / transform.scale }));
          touchState.current.startX = t.clientX;
          touchState.current.startY = t.clientY;
        } else if (Math.abs(deltaX) > 10) {
          isSwiping.current = true;
        }
      });
    }
  }, [zoomed, transform.scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchRAFRef.current) {
      cancelAnimationFrame(touchRAFRef.current);
      touchRAFRef.current = null;
    }
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
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center touch-none select-none"
      onMouseMove={resetControlsTimer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Story progress bars (top) ── */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 px-3 pt-3 pb-2 flex gap-1 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
      >
        {videos.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[3px] rounded-full overflow-hidden cursor-pointer"
            style={{ background: "rgba(255,255,255,0.30)" }}
            onClick={() => goTo(i)}
          >
            <div
              className="h-full rounded-full transition-none"
              style={{
                background: "rgba(255,255,255,0.95)",
                width: i < index ? "100%" : i === index ? `${progress}%` : "0%",
                transition: i === index ? "width 0.2s linear" : "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Top bar: platform + counter + controls ── */}
      <div
        className={`absolute top-8 left-0 right-0 z-30 flex items-center justify-between px-4 pt-2 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}
      >
        <div className="flex items-center gap-3">
          <PlatformBadge platform={current.platform} />
          <span className="text-xs text-white/60 font-medium">
            {index + 1} / {videos.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            aria-label={muted ? "Ativar som" : "Silenciar"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Prev / Next arrows (desktop) ── */}
      {index > 0 && (
        <button
          onClick={() => goTo(index - 1)}
          className={`absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all hidden md:flex ${showControls ? "opacity-100" : "opacity-0"}`}
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {index < videos.length - 1 && (
        <button
          onClick={() => goTo(index + 1)}
          className={`absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-all hidden md:flex ${showControls ? "opacity-100" : "opacity-0"}`}
          aria-label="Próximo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* ── Invisible swipe zones (mobile) ── */}
      <div className="absolute inset-y-0 left-0 w-1/3 z-20 hidden md:hidden" onClick={() => goTo(index - 1)} />
      <div className="absolute inset-y-0 right-0 w-1/3 z-20 hidden md:hidden" onClick={() => goTo(index + 1)} />

      {/* ── Video / Fallback ── */}
      <div
        className="absolute inset-0 flex items-center justify-center -z-10"
        style={{ 
          background: PLATFORM_META[current.platform?.toLowerCase()] 
            ? `linear-gradient(to bottom, ${PLATFORM_META[current.platform?.toLowerCase()].color}40, #000000)` 
            : '#000000' 
        }}
      >
        <PlatformBadge platform={current.platform} />
      </div>
      <div
        className="w-full h-full flex items-center justify-center z-0"
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
          playsInline
          onClick={togglePlay}
          onEnded={() => {
            if (index < videos.length - 1) setIndex(index + 1);
            else setPlaying(false);
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration) setProgress((el.currentTime / el.duration) * 100);
          }}
          onError={(e) => {
            // Se falhar como video, tentamos ver se é uma imagem
            const target = e.target as HTMLVideoElement;
            if (target.src && target.src.match(/\.(jpeg|jpg|gif|png)$/i)) {
              setIsImageFallback(true);
              const img = document.createElement('img');
              img.src = target.src;
              img.className = target.className;
              img.style.objectFit = 'contain';
              target.parentNode?.replaceChild(img, target);
            }
          }}
        />
      </div>

      {/* ── Play/Pause center icon ── */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* ── Bottom overlay: title + views ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-8 pt-20 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)" }}
      >
        <p
          className="text-base font-bold text-white leading-snug"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,1), 0 0 20px rgba(0,0,0,0.8)" }}
        >
          {current.title}
        </p>
        {current.views != null && (
          <div className="flex items-center gap-1.5 mt-2">
            <Eye className="w-4 h-4 text-white/80" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))" }} />
            <span
              className="text-sm text-white/90 font-semibold"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,1)" }}
            >
              {Number(current.views).toLocaleString("pt-BR")} visualizações
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
