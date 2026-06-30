import React, { useState, useEffect, useMemo, memo, useRef, useCallback } from "react";
import { VideoViewer } from "./VideoViewer";
import { motion } from "framer-motion";
import { 
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, 
  ThumbsUp, Repeat2, Eye, Play, Check, CheckCheck, Send,
  SkipBack, SkipForward, Music, Mail, Globe, ArrowLeft,
  Youtube, Twitter, Facebook, Instagram, Linkedin, MessageSquare,
  Smile, Camera, Image as ImageIcon, Plus, CheckCircle2, Mic,
  Video, ArrowDownToLine, Smartphone, Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { SafeImage } from "@/components/ui/SafeImage";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import "./PostPreview.css";
import { useSocialStats } from "@/hooks/useSocialStats";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { formatNum, getMediaUrl } from "@/utils/mediaUtils";

interface UploadedMedia {
  id: string;
  file_url: string;
  file_type: string;
  name: string;
  file_size?: number;
}

interface PostPreviewProps {
  content: string;
  selectedPlatforms: string[];
  uploadedFiles: UploadedMedia[];
  videoTitle?: string;
  thumbnailUrl?: string;
  mediaType?: string | null;
  authorName?: string;
  authorAvatar?: string;
  platformId?: string;
  realMetrics?: any;
  visibility?: string;
}

const ResolvedVideo = React.memo(function ResolvedVideo({ fileUrl, className, controls, videoRef, playing, setPlaying }: any) {
  const resolvedUrl = getMediaUrl(fileUrl);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (videoRef) {
      if (typeof videoRef === 'function') {
        videoRef(el);
      } else if ('current' in videoRef) {
        videoRef.current = el;
      }
    }
  }, [videoRef]);

  const handleClick = useCallback(() => {
    const video = localVideoRef.current;
    if (video) {
      // Read current paused state directly to avoid stale closure (L3 fix)
      const isPaused = video.paused;
      if (isPaused) {
        video.play().catch(err => console.log("Video playback error:", err));
        setPlaying?.(true);
      } else {
        video.pause();
        setPlaying?.(false);
      }
    }
  }, [setPlaying]);

  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing]);

  if (!resolvedUrl) return <div className="w-full h-full bg-zinc-900 animate-pulse" />;

  if (controls) {
    return <video ref={handleVideoRef} src={resolvedUrl} className={cn("w-full h-full object-cover", className)} controls muted playsInline />;
  }

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={handleClick}>
      <video ref={handleVideoRef} src={resolvedUrl} className={cn("w-full h-full object-cover", className)} loop playsInline muted />
      {!playing && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Play className="w-12 h-12 text-white fill-white" /></div>}
    </div>
  );
});

const ResolvedAudio = React.memo(function ResolvedAudio({ fileUrl, className, audioRef, onEnded }: any) {
  const resolvedUrl = getMediaUrl(fileUrl);
  if (!resolvedUrl) return <div className="w-full h-10 bg-zinc-800 animate-pulse rounded" />;
  return <audio ref={audioRef} src={resolvedUrl} className={className} onEnded={onEnded} />;
});

const MediaWrapper = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("relative w-full overflow-hidden", className)} style={{ minHeight: '50px' }}>
    {children}
  </div>
);

const MultimodalMedia = ({ media, playing, setPlaying, videoRef, audioRef, className: _outerClassName, isStory = false }: any) => {
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [perVideoPlaying, setPerVideoPlaying] = useState<Record<number, boolean>>({});
  const perVideoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on("select", onSelect);
    onSelect();
    return () => { carouselApi.off("select", onSelect); };
  }, [carouselApi]);

  useEffect(() => {
    return () => { perVideoRefs.current.clear(); };
  }, []);

  if (!media || media.length === 0) return null;

  const renderImage = (fileUrl: string, idx: number, absolute = false) => (
    <SafeImage
      src={fileUrl}
      className={absolute ? "absolute inset-0" : "w-full h-full object-cover"}
      alt=""
      loading="eager"
      fetchPriority={idx === 0 ? "high" : "auto"}
    />
  );

  const renderVideo = (fileUrl: string, idx: number, absolute = false) => {
    const isMulti = media.length > 1;
    const isCurrent = idx === currentSlide;
    const p = isMulti ? isCurrent : playing;
    const setP = isMulti ? (v: boolean) => setPerVideoPlaying(prev => ({ ...prev, [idx]: v })) : setPlaying;
    const ref = isMulti ? (el: HTMLVideoElement | null) => { if (el) perVideoRefs.current.set(idx, el); else perVideoRefs.current.delete(idx); } : videoRef;
    return (
      <ResolvedVideo
        fileUrl={fileUrl}
        className={absolute ? "absolute inset-0" : "w-full h-full object-cover"}
        videoRef={ref}
        playing={p}
        setPlaying={setP}
        controls={isMulti}
      />
    );
  };

  const renderAudio = (fileUrl: string) => (
    <div className="p-8 bg-zinc-900 flex flex-col items-center gap-6 w-full h-full justify-center">
      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
        <Music className={cn("w-8 h-8 text-primary", playing && "animate-pulse")} />
      </div>
      <ResolvedAudio fileUrl={fileUrl} className="w-full h-10 px-4" audioRef={audioRef} onEnded={() => setPlaying?.(false)} />
    </div>
  );

  if (media.length === 1) {
    const m = media[0];
    if (m.file_type?.startsWith("image/")) return renderImage(m.file_url, 0);
    if (m.file_type?.startsWith("video/")) {
      return (
        <ResolvedVideo
          fileUrl={m.file_url}
          className="w-full h-full object-cover"
          videoRef={videoRef}
          playing={playing}
          setPlaying={setPlaying}
        />
      );
    }
    if (m.file_type?.startsWith("audio/")) return renderAudio(m.file_url);
    return null;
  }

  return (
    <MediaWrapper>
      <Carousel className="absolute inset-0" setApi={setCarouselApi} opts={{ watchDrag: true }}>
        <CarouselContent className="h-full ml-0">
          {media.map((m: any, idx: number) => (
            <CarouselItem key={m?.id ?? `media-${idx}`} className="h-full pl-0 relative">
              {m.file_type?.startsWith("image/") ? renderImage(m.file_url, idx, true) :
               m.file_type?.startsWith("video/") ? renderVideo(m.file_url, idx, true) :
               m.file_type?.startsWith("audio/") ? renderAudio(m.file_url) :
               <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                 <ImageIcon className="w-12 h-12 text-zinc-600" />
               </div>}
            </CarouselItem>
          ))}
        </CarouselContent>

        {media.length > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {media.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); carouselApi?.scrollTo(idx); }}
                  className={cn(
                    "rounded-full transition-all cursor-pointer border-0",
                    idx === currentSlide
                      ? "bg-white w-2 h-2 scale-110"
                      : "bg-white/40 hover:bg-white/60 w-1.5 h-1.5"
                  )}
                />
              ))}
            </div>
            {currentSlide > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); carouselApi?.scrollPrev(); }}
                className="absolute left-0 top-0 bottom-0 w-1/4 z-10 cursor-pointer"
                aria-label="Previous"
              />
            )}
            {currentSlide < media.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); carouselApi?.scrollNext(); }}
                className="absolute right-0 top-0 bottom-0 w-1/4 z-10 cursor-pointer"
                aria-label="Next"
              />
            )}
          </>
        )}
      </Carousel>
    </MediaWrapper>
  );
};

// Custom SVGs from user request
const CustomIcons = {
  XLike: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.605 3.01.894 1.81.846 4.17-.518 6.67z"/></svg>
  ),
  XRepost: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg>
  ),
  TruthRetruth: () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0-1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4 7.58 4 4 7.58 4 12H1l4 4 4-4H6z"/></svg>
  )
};

// --- PLATFORM RENDERERS ---

export const XLikeCard = memo(function XLikeCardRenderer({ content, media, authorName, authorAvatar, platformId, realMetrics, visibility }: any) {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [likes, setLikes] = useState(realMetrics?.likes ?? 0);
  const [reposts, setReposts] = useState(realMetrics?.shares ?? 0);
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  
  const images = media.filter((m: any) => m.file_type?.startsWith("image/"));
  const video = media.find((m: any) => m.file_type?.startsWith("video/"));
  const audio = media.find((m: any) => m.file_type?.startsWith("audio/"));
  const isTruth = platformId === "truthsocial";

  const toggleLike = () => { setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); };
  const toggleRepost = () => { setReposted(!reposted); setReposts(r => reposted ? r - 1 : r + 1); };

  return (
    <div className="preview-card x-like-card bg-black text-white p-4 border border-white border-opacity-5 rounded-none shadow-2xl">
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1 shrink-0">
          {authorAvatar ? (
            <img src={authorAvatar} className="x-avatar-img w-10 h-10 rounded-full" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-black text-white">{authorName?.[0] || "V"}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1 truncate">
              <span className="font-black text-[15px] truncate">{authorName || "Vitoria News"}</span>
              <CheckCircle2 className="w-4 h-4 text-sky-500 fill-sky-500 shrink-0" />
              {visibility && <span className="ml-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
              <span className="text-zinc-500 text-[14px]">@{authorName?.toLowerCase().replace(/\s/g, "") || "vitorianews"}</span>
              <span className="text-zinc-500 text-[14px] ml-1">• {formatNum(realMetrics?.followers ?? 0)}</span>
            </div>
            <MoreHorizontal className="w-5 h-5 text-zinc-500 shrink-0" />
          </div>
          <div className="x-text text-[15px] leading-normal mb-3 whitespace-pre-wrap">{content || "Explorando as novas fronteiras da comunicacao inteligente."}</div>
          {media.length > 0 && (
            <div className="media-wrapper rounded-2xl border border-white border-opacity-10 overflow-hidden mb-3 shadow-inner bg-zinc-900 aspect-video">
              <MultimodalMedia 
                media={media} 
                playing={playing} 
                setPlaying={setPlaying} 
                videoRef={videoRef} 
                audioRef={audioRef} 
              />
            </div>
          )}
          <div className="x-actions flex justify-between max-w-md text-zinc-500 border-t border-white border-opacity-5 pt-3">
            <button className="x-btn hover:text-sky-500 transition-all flex items-center gap-2 group">
              <div className="p-2 rounded-full group-hover:bg-sky-500/10"><MessageCircle className="w-[18px] h-[18px]" /></div>
              <span className="text-xs">{formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.0005))}</span>
            </button>
            <button 
              className={cn("x-btn transition-all flex items-center gap-2 group", reposted ? "text-green-500" : "hover:text-green-500")}
              onClick={toggleRepost}
            >
              <div className="p-2 rounded-full group-hover:bg-green-500/10">
                {isTruth ? <CustomIcons.TruthRetruth /> : <CustomIcons.XRepost />}
              </div>
              <span className="text-xs">{formatNum(reposts)}</span>
            </button>
            <button 
              className={cn("x-btn transition-all flex items-center gap-2 group", liked ? "text-pink-500" : "hover:text-pink-500")}
              onClick={toggleLike}
            >
              <div className={cn("p-2 rounded-full group-hover:bg-pink-500/10", liked && "fill-current")}>
                <CustomIcons.XLike />
              </div>
              <span className="text-xs">{formatNum(likes)}</span>
            </button>
            <button className="x-btn hover:text-sky-500 transition-all p-2 rounded-full hover:bg-sky-500/10">
              <Eye className="w-[18px] h-[18px]" />
              <span className="text-[10px] ml-1">{formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.15))}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export const TruthSocialCard = memo(function TruthSocialCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [likes, setLikes] = useState(realMetrics?.likes ?? 0);
  const [reposts, setReposts] = useState(realMetrics?.shares ?? 0);
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  
  const images = media.filter((m: any) => m.file_type?.startsWith("image/"));
  const video = media.find((m: any) => m.file_type?.startsWith("video/"));

  return (
    <div className="preview-card truth-social-card bg-white dark:bg-[#000000] text-[#141414] dark:text-white p-4 border border-[#552B7C]/20 rounded-xl shadow-md font-sans">
      <div className="flex gap-3">
        <div className="shrink-0">
          {authorAvatar ? (
            <img src={authorAvatar} className="w-12 h-12 rounded-full border-2 border-[#552B7C]/10" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#552B7C] flex items-center justify-center font-bold text-white">{authorName?.[0] || "T"}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="font-bold text-[15px] truncate text-[#552B7C] dark:text-[#8D49CC]">{authorName || "Vitória News"}</span>
            <CheckCircle2 className="w-4 h-4 text-[#552B7C] fill-[#552B7C] dark:text-[#8D49CC] dark:fill-[#8D49CC]" />
            <span className="text-zinc-500 text-[14px]">@{authorName?.toLowerCase().replace(/\s/g, "") || "vitorianews"}</span>
          </div>
          <div className="text-[15px] leading-snug mb-3 whitespace-pre-wrap">{content || "Explorando a liberdade de expressão com novas ideias."}</div>
          
          {media.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-3 bg-zinc-100 dark:bg-zinc-900 aspect-video">
              <MultimodalMedia 
                media={media} 
                playing={playing} 
                setPlaying={setPlaying} 
                videoRef={videoRef} 
              />
            </div>
          )}

          <div className="flex justify-between items-center text-[#552B7C]/70 dark:text-[#8D49CC]/70 max-w-[400px]">
            <button className="flex items-center gap-2 hover:text-[#552B7C] dark:hover:text-[#8D49CC] transition-colors">
              <MessageCircle className="w-[18px] h-[18px]" />
              <span className="text-xs">{formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.005))}</span>
            </button>
            <button 
              className={cn("flex items-center gap-2 transition-colors", reposted ? "text-green-500" : "hover:text-green-500")}
              onClick={() => { setReposted(!reposted); setReposts(r => reposted ? r - 1 : r + 1); }}
            >
              <Repeat2 className="w-[18px] h-[18px]" />
              <span className="text-xs">{formatNum(reposts)}</span>
            </button>
            <button 
              className={cn("flex items-center gap-2 transition-colors", liked ? "text-red-500" : "hover:text-red-500")}
              onClick={() => { setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }}
            >
              <Heart className={cn("w-[18px] h-[18px]", liked && "fill-current")} />
              <span className="text-xs">{formatNum(likes)}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-[#552B7C] dark:hover:text-[#8D49CC] transition-colors">
              <Share2 className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export const GettrCard = memo(function GettrCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [likes, setLikes] = useState(realMetrics?.likes ?? 0);
  const [reposts, setReposts] = useState(realMetrics?.shares ?? 0);
  
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  return (
    <div className="preview-card gettr-card bg-white dark:bg-[#121212] text-black dark:text-white p-4 border border-zinc-200 dark:border-zinc-800 rounded-none shadow-sm">
      <div className="flex gap-3">
        <div className="shrink-0">
          {authorAvatar ? (
            <img src={authorAvatar} className="w-12 h-12 rounded-full" alt="" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#FC223B] flex items-center justify-center font-bold text-white">{authorName?.[0] || "G"}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-bold text-[15px] truncate">{authorName || "Vitória News"}</span>
            <CheckCircle2 className="w-4 h-4 text-[#FC223B] fill-[#FC223B]" />
            <span className="text-zinc-500 text-[14px]">@{authorName?.toLowerCase().replace(/\s/g, "") || "vitorianews"}</span>
            <span className="text-zinc-500 text-[14px]">· 2m</span>
          </div>
          <div className="text-[15px] leading-snug mb-3 whitespace-pre-wrap">{content || "Notícias sem censura na plataforma."}</div>
          
          {media.length > 0 && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-3 aspect-video">
              <MultimodalMedia 
                media={media} 
                playing={playing} 
                setPlaying={setPlaying} 
                videoRef={videoRef} 
                audioRef={audioRef} 
              />
            </div>
          )}

          <div className="flex justify-between items-center text-zinc-500 max-w-[400px] mt-2">
            <button className="flex items-center gap-2 hover:text-[#FC223B] transition-colors">
              <MessageCircle className="w-5 h-5" />
            </button>
            <button 
              className={cn("flex items-center gap-2 transition-colors", reposted ? "text-[#FC223B]" : "hover:text-[#FC223B]")}
              onClick={() => { setReposted(!reposted); setReposts(r => reposted ? r - 1 : r + 1); }}
            >
              <Repeat2 className="w-5 h-5" />
              <span className="text-xs">{formatNum(reposts)}</span>
            </button>
            <button 
              className={cn("flex items-center gap-2 transition-colors", liked ? "text-[#FC223B]" : "hover:text-[#FC223B]")}
              onClick={() => { setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }}
            >
              <Heart className={cn("w-5 h-5", liked && "fill-current")} />
              <span className="text-xs">{formatNum(likes)}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-[#FC223B] transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});


export const FacebookCard = memo(function FacebookCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(realMetrics?.likes ?? 0);
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  


  return (
    <div className="preview-card fb-card bg-[#18191a] text-white border-none rounded-xl overflow-hidden">
      <div className="fb-header flex gap-3 p-4">
        {authorAvatar ? <img src={authorAvatar} className="fb-avatar-img w-10 h-10 rounded-full" alt="" /> : <div className="fb-avatar-img bg-zinc-700 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg">{authorName?.[0] || "V"}</div>}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black tracking-tight">{authorName || "Vitória News"}</span>
            {visibility && <span className="ml-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
          </div>
          <div className="fb-meta text-xs text-zinc-500 flex items-center gap-1">{formatNum(realMetrics?.followers ?? 0)} seguidores · <Globe className="w-3 h-3" /></div>
        </div>
      </div>
      <div className="fb-text text-[15px] px-4 pb-3 leading-snug">{content || "Estamos lançando a nova era do jornalismo automatizado."}</div>
      {media.length > 0 && (
        <div className="media-wrapper aspect-video bg-black flex items-center justify-center relative cursor-pointer group">
          <MultimodalMedia 
            media={media} 
            playing={playing} 
            setPlaying={setPlaying} 
            videoRef={videoRef} 
            audioRef={audioRef} 
          />
        </div>
      )}
      <div className="fb-stats px-4 py-2 flex justify-between items-center text-sm text-zinc-400 border-b border-white border-opacity-10">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shadow-lg"><ThumbsUp className="w-2.5 h-2.5 text-white fill-white" /></div>
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg"><Heart className="w-2.5 h-2.5 text-white fill-white" /></div>
          </div>
          <span className="font-bold text-xs">{formatNum(liked ? likes + 1 : likes)}</span>
        </div>
        <div className="flex gap-3 text-xs font-medium">
          <span>{formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.001))} comentários</span>
          <span>{formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.0003))} compartilhamentos</span>
        </div>
      </div>
      <div className="fb-actions px-1 py-1 flex justify-around border-b border-white border-opacity-5">
        <button 
          className={cn("fb-btn flex-1 py-2 rounded-lg hover:bg-white/5 transition-all font-black text-xs flex items-center justify-center gap-2", liked && "text-blue-500")}
          onClick={() => setLiked(!liked)}
        >
          <ThumbsUp className={cn("w-4 h-4", liked && "fill-current")} /> Curtir
        </button>
        <button className="fb-btn flex-1 py-2 rounded-lg hover:bg-white/5 transition-all font-black text-xs flex items-center justify-center gap-2 text-zinc-400">
          <MessageSquare className="w-4 h-4" /> Comentar
        </button>
        <button className="fb-btn flex-1 py-2 rounded-lg hover:bg-white/5 transition-all font-black text-xs flex items-center justify-center gap-2 text-zinc-400">
          <Share2 className="w-4 h-4" /> Compartilhar
        </button>
      </div>
      <div className="px-4 py-3 bg-zinc-900/40">
        <div className="flex gap-2 items-center">
          {authorAvatar ? <img src={authorAvatar} className="w-8 h-8 rounded-full border border-white border-opacity-10" alt="" /> : <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-black">{authorName?.[0]}</div>}
          <div className="flex-1 bg-zinc-800 rounded-full px-4 py-2 text-xs text-zinc-500 flex justify-between items-center border border-white border-opacity-5">
            Escreva um comentário público...
            <div className="flex gap-3 items-center opacity-70">
              <Smile className="w-4 h-4 hover:text-white cursor-pointer" />
              <Camera className="w-4 h-4 hover:text-white cursor-pointer" />
              <ImageIcon className="w-4 h-4 hover:text-white cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const InstagramCard = memo(function InstagramCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(realMetrics?.likes ?? 0);
  const hasVideo = media.some((m: any) => m.file_type?.startsWith("video/"));
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  return (
    <div className="preview-card insta-card bg-black text-white border-none rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 flex items-center justify-between border-b border-white border-opacity-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] shadow-2xl ring-2 ring-black">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden border border-black">
               {authorAvatar ? <img src={authorAvatar} className="w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-black uppercase">{authorName?.[0] || "V"}</span>}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-black tracking-tight">{authorName}</span>
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"><Check className="w-2.5 h-2.5 text-white stroke-[4]" /></div>
              {visibility && <span className="ml-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500 font-bold text-xs">
              <span className="text-zinc-600">@</span>
              <span className="truncate max-w-[100px]">{authorName?.toLowerCase().replace(/\s/g, '')}</span>
              <span>•</span>
              <span>{formatNum(realMetrics?.followers ?? 0)} seguidores</span>
            </div>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-zinc-500 hover:text-white transition-colors cursor-pointer" />
      </div>
      <div 
        className={cn("media-wrapper bg-zinc-950 flex items-center justify-center relative group cursor-pointer overflow-hidden", hasVideo ? "aspect-[9/16] max-h-[550px]" : "aspect-square")}
        onDoubleClick={() => { if(!liked) { setLiked(true); setLikes(l => l + 1); } }}
      >
        <MultimodalMedia 
          media={media} 
          playing={playing} 
          setPlaying={setPlaying} 
          videoRef={videoRef} 
          audioRef={audioRef} 
        />
        {liked && (
           <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute">
             <Heart className="w-24 h-24 text-white fill-white drop-shadow-[0_0_20px_rgba(255,0,0,0.5)] opacity-90" />
           </motion.div>
        )}
      </div>
      <div className="insta-actions px-4 py-4 flex justify-between items-center">
        <div className="insta-left-actions flex gap-5">
          <Heart className={cn("w-7 h-7 cursor-pointer transition-all active:scale-125", liked ? "text-red-500 fill-current" : "text-white hover:text-zinc-400")} onClick={() => { setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }} />
          <MessageCircle className="w-7 h-7 cursor-pointer hover:text-zinc-400 transition-colors" />
          <Send className="w-7 h-7 cursor-pointer hover:text-zinc-400 transition-colors" />
        </div>
        <Bookmark className={cn("w-7 h-7 cursor-pointer transition-all active:scale-125", saved ? "fill-current text-white" : "text-white hover:text-zinc-400")} onClick={() => setSaved(!saved)} />
      </div>
      <div className="insta-likes px-4 font-black text-[14px] mb-2">{formatNum(likes)} curtidas</div>
      <div className="insta-caption px-4 text-[14px] mb-3 leading-relaxed">
        <span className="font-black mr-2 hover:underline cursor-pointer">{authorName?.toLowerCase().replace(/\s/g, '') || "vitoria.news"}</span>
        <span className="text-zinc-200">{content || "A revolução do conteúdo digital."}</span>
      </div>
      <div className="px-4 text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-4">HÁ 2 MINUTOS</div>
      <div className="px-4 py-3 border-t border-white border-opacity-5 flex items-center gap-3">
        {authorAvatar ? <img src={authorAvatar} className="w-6 h-6 rounded-full opacity-60" /> : <div className="w-6 h-6 rounded-full bg-zinc-800" />}
        <span className="text-[13px] text-zinc-500 flex-1">Adicione um comentário...</span>
        <button className="text-sky-500 text-[13px] font-black opacity-40 hover:opacity-100 transition-opacity">Publicar</button>
      </div>
    </div>
  );
});

export const LinkedInCard = memo(function LinkedInCardRenderer({ content, media, authorName, authorAvatar, videoTitle, realMetrics, visibility }: any) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(realMetrics?.likes ?? 0);
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);



  return (
    <div className="preview-card ln-card bg-[#1d2226] text-white border-none rounded-xl shadow-2xl overflow-hidden">
      <div className="ln-header flex gap-3 p-4">
        {authorAvatar ? <img src={authorAvatar} className="ln-avatar-img w-12 h-12 rounded ring-1 ring-white/10" alt="" /> : <div className="ln-avatar-img bg-zinc-700 w-12 h-12 rounded flex items-center justify-center font-black text-xl">{authorName?.[0] || "V"}</div>}
        <div className="ln-user-info">
          <div className="flex items-center gap-1.5">
            <h4 className="font-black text-[15px] text-white">{authorName || "Vitória News"}</h4>
            <span className="text-[11px] text-zinc-500 font-medium"> • 1º</span>
            {visibility && <span className="ml-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight line-clamp-1">{formatNum(realMetrics?.followers ?? 0)} conexões • Especialista em IA</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">Agora • <Globe className="w-2.5 h-2.5 inline" /></p>
        </div>
      </div>
      <div className="ln-text px-4 pb-3 text-[14px] leading-relaxed text-zinc-100">
        {videoTitle && <p className="font-black mb-2 text-white">{videoTitle}</p>}
        {content || "Explorando as fronteiras da automação inteligente."}
      </div>
      {media.length > 0 && (
        <div className="media-wrapper aspect-video bg-black flex items-center justify-center relative group cursor-pointer">
          <MultimodalMedia 
            media={media} 
            playing={playing} 
            setPlaying={setPlaying} 
            videoRef={videoRef} 
            audioRef={audioRef} 
          />
        </div>
      )}
      <div className="ln-stats px-4 py-3 flex items-center justify-between text-[11px] text-zinc-500 border-b border-white border-opacity-5">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1">
             <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shadow-sm"><ThumbsUp className="w-2.5 h-2.5 text-white fill-white" /></div>
             <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>
          </div>
          <span className="font-bold hover:text-blue-400 cursor-pointer transition-colors">{formatNum(liked ? likes + 1 : likes)}</span>
        </div>
        <div className="flex gap-2 hover:text-blue-400 cursor-pointer transition-colors">
          <span>{formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.0008))} comentários</span>
          <span>•</span>
          <span>{formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.0002))} compartilhamentos</span>
        </div>
      </div>
      <div className="ln-actions flex justify-between px-1 py-1">
        <button className={cn("ln-btn flex-1 flex items-center justify-center gap-2 py-3 hover:bg-white/5 rounded-lg transition-all text-xs font-black", liked ? "text-blue-400" : "text-zinc-400")} onClick={() => setLiked(!liked)}>
          <ThumbsUp className={cn("w-5 h-5", liked && "fill-current")} /> Gostei
        </button>
        <button className="ln-btn flex-1 flex items-center justify-center gap-2 py-3 hover:bg-white/5 rounded-lg transition-all text-xs font-black text-zinc-400">
          <MessageSquare className="w-5 h-5" /> Comentar
        </button>
        <button className="ln-btn flex-1 flex items-center justify-center gap-2 py-3 hover:bg-white/5 rounded-lg transition-all text-xs font-black text-zinc-400">
          <Repeat2 className="w-5 h-5" /> Compartilhar
        </button>
      </div>
    </div>
  );
});

export const ThreadsCard = memo(function ThreadsCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(realMetrics?.likes ?? 0);
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);



  return (
    <div className="preview-card threads-card bg-black text-white border-none rounded-3xl overflow-hidden shadow-2xl p-5">
      <div className="grid grid-cols-[auto_1fr] gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {authorAvatar ? <img src={authorAvatar} className="w-11 h-11 rounded-full border border-white border-opacity-10" alt="" /> : <div className="bg-zinc-800 w-11 h-11 rounded-full flex items-center justify-center font-black text-white">{authorName?.[0] || "V"}</div>}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border-2 border-black">
               <div className="w-full h-full rounded-full bg-white flex items-center justify-center"><Plus className="w-3 h-3 text-black stroke-[3]" /></div>
            </div>
          </div>
          <div className="w-[1.5px] flex-1 bg-white/10 rounded-full"></div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="font-black text-[15px] hover:underline cursor-pointer">{authorName?.toLowerCase().replace(/\s/g, '') || "vitorianews"}</span>
              {visibility && <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
            </div>
            <div className="flex items-center gap-3">
               <span className="text-sm text-zinc-500">{formatNum(realMetrics?.followers ?? 0)}</span>
               <MoreHorizontal className="w-5 h-5 text-zinc-500 cursor-pointer" />
            </div>
          </div>
          <div className="text-[15px] text-zinc-100 leading-snug mb-4 whitespace-pre-wrap">{content || "Threads é o novo espaço para conversas profundas e conexões reais."}</div>
          {media.length > 0 && (
            <div className="mb-4 pr-2">
               <div className={cn("media-wrapper bg-zinc-900 rounded-2xl overflow-hidden border border-white border-opacity-5 relative group cursor-pointer shadow-inner", media.some((m: any) => m.file_type?.startsWith("audio/")) ? "aspect-auto h-24" : "aspect-[4/5]")}>
                <MultimodalMedia 
                  media={media} 
                  playing={playing} 
                  setPlaying={setPlaying} 
                  videoRef={videoRef} 
                  audioRef={audioRef} 
                />
               </div>
            </div>
          )}
          <div className="flex gap-6 text-white mb-4">
            <Heart className={cn("w-6 h-6 cursor-pointer transition-all active:scale-125", liked ? "text-red-500 fill-current" : "hover:text-zinc-400")} onClick={() => { setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }} />
            <MessageCircle className="w-6 h-6 cursor-pointer hover:text-zinc-400 transition-colors" />
            <Repeat2 className="w-6 h-6 cursor-pointer hover:text-zinc-400 transition-colors" />
            <Send className="w-6 h-6 cursor-pointer hover:text-zinc-400 transition-colors" />
          </div>
          <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium">
            <span className="hover:underline cursor-pointer">{formatNum(likes)} curtidas</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">{formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.0005))} respostas</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export const RedditCard = memo(function RedditCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [votes, setVotes] = useState(realMetrics?.likes ?? 0);
  const [voteType, setVoteType] = useState<null | 'up' | 'down'>(null);
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);



  return (
    <div className="preview-card reddit-card bg-[#1a1a1b] border border-white border-opacity-10 rounded-xl overflow-hidden shadow-2xl flex">
      <div className="rd-votes w-12 bg-black bg-opacity-20 flex flex-col items-center py-3 gap-2 border-r border-white border-opacity-5">
        <button 
          onClick={() => {
            if (voteType === 'up') { setVoteType(null); setVotes(v => v - 1); }
            else { setVotes(v => voteType === 'down' ? v + 2 : v + 1); setVoteType('up'); }
          }}
          className={cn("p-1 rounded hover:bg-white/10 transition-colors", voteType === 'up' ? "text-orange-600" : "text-zinc-500")}
        >
          <SkipBack className="w-5 h-5 rotate-90 fill-current" />
        </button>
        <span className={cn("text-xs font-black", voteType === 'up' ? "text-orange-600" : voteType === 'down' ? "text-blue-500" : "text-zinc-100")}>{formatNum(votes)}</span>
        <button 
          onClick={() => {
            if (voteType === 'down') { setVoteType(null); setVotes(v => v + 1); }
            else { setVotes(v => voteType === 'up' ? v - 2 : v - 1); setVoteType('down'); }
          }}
          className={cn("p-1 rounded hover:bg-white/10 transition-colors", voteType === 'down' ? "text-blue-500" : "text-zinc-500")}
        >
          <SkipBack className="w-5 h-5 -rotate-90 fill-current" />
        </button>
      </div>
      <div className="flex-1 p-4">
        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mb-2 font-bold uppercase tracking-wider">
          <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px]">r/</div>
          <span className="text-zinc-200">r/IntelligenceHub</span>
          <span>• u/{authorName?.toLowerCase().replace(/\s/g, '') || "vitorianews"}</span>
          {visibility && <span className="ml-1 text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
        </div>
        <h3 className="text-lg font-black text-white mb-3 leading-tight">{content?.split('\n')[0] || "O Futuro da Inteligência de Conteúdo em 2026"}</h3>
        <div className="text-sm text-zinc-300 leading-relaxed mb-4 whitespace-pre-wrap">{content || "Estamos testemunhando uma mudança radical no modo como a informação é processada e distribuída..."}</div>
        {media.length > 0 && (
          <div className="rounded-lg overflow-hidden border border-white border-opacity-10 mb-4 shadow-inner bg-black flex items-center justify-center aspect-video">
             <MultimodalMedia 
               media={media} 
               playing={playing} 
               setPlaying={setPlaying} 
               videoRef={videoRef} 
               audioRef={audioRef} 
             />
          </div>
        )}
        <div className="flex gap-2">
          <button className="bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg flex items-center gap-2 text-zinc-400 font-black text-[11px] transition-all"><MessageCircle className="w-4 h-4" /> {formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.0015))} Comentários</button>
          <button className="bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg flex items-center gap-2 text-zinc-400 font-black text-[11px] transition-all"><Share2 className="w-4 h-4" /> Compartilhar</button>
          <button className="bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg flex items-center gap-2 text-zinc-400 font-black text-[11px] transition-all"><Bookmark className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
});

export const TikTokCard = memo(function TikTokCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(realMetrics?.likes ?? 0);
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  return (
    <div className="preview-card tiktok-card relative aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl group max-w-[320px] mx-auto border border-white border-opacity-10">
      <div className="w-full h-full relative cursor-pointer">
        <MultimodalMedia 
          media={media} 
          playing={playing} 
          setPlaying={setPlaying} 
          videoRef={videoRef} 
          audioRef={audioRef} 
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
      <div className="tt-overlay absolute bottom-0 left-0 w-full p-5 flex items-end justify-between z-20">
        <div className="tt-info flex-1 pr-12 mb-6">
          <div className="tt-user flex items-center gap-2 mb-3">
            <span className="font-black text-base shadow-lg">@{authorName?.toLowerCase().replace(/\s/g, '') || "vitorianews"}</span>
            {visibility && <span className="text-[10px] font-black text-white/70 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded border border-white/10 backdrop-blur-md">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
            <button className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg active:scale-95 transition-all">Seguir</button>
          </div>
          <p className="tt-desc text-[14px] leading-tight shadow-lg line-clamp-2 mb-3">{content || "A revolução silenciosa da automação chegou. #Tech #AI #Futuro"}</p>
          <div className="flex items-center gap-2 bg-black bg-opacity-40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white border-opacity-10 w-fit">
             <Music className="w-3.5 h-3.5 animate-spin-slow" />
             <span className="text-xs font-bold truncate max-w-[120px]">Som original - {authorName || "Vitória"}</span>
          </div>
        </div>
        <div className="tt-actions-bar flex flex-col gap-5 items-center mb-6">
          <div className="relative mb-2">
            {authorAvatar ? <img src={authorAvatar} className="w-12 h-12 rounded-full border-2 border-white shadow-2xl" alt="" /> : <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-white flex items-center justify-center font-black">V</div>}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-black"><Plus className="w-3 h-3 text-white stroke-[4]" /></div>
          </div>
          <div className="tt-action-btn group" onClick={() => { setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }}>
            <div className="tt-circle-btn shadow-2xl group-active:scale-125 transition-all"><Heart className={cn("w-7 h-7 transition-colors", liked ? "text-red-500 fill-current" : "text-white")} /></div>
            <span className="text-xs font-black mt-1 shadow-lg">{formatNum(likes)}</span>
          </div>
          <div className="tt-action-btn"><div className="tt-circle-btn shadow-2xl"><MessageCircle className="w-7 h-7 text-white fill-white" /></div><span className="text-xs font-black mt-1 shadow-lg">{formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.02))}</span></div>
          <div className="tt-action-btn"><div className="tt-circle-btn shadow-2xl"><Share2 className="w-7 h-7 text-white fill-white" /></div><span className="text-xs font-black mt-1 shadow-lg">{formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.05))}</span></div>
          <div className="w-11 h-11 rounded-full bg-zinc-800 border-4 border-zinc-700 animate-spin-slow p-1 shadow-2xl overflow-hidden mt-4">
             {authorAvatar ? <img src={authorAvatar} className="w-full h-full rounded-full grayscale" /> : <div className="w-full h-full bg-black rounded-full" />}
          </div>
        </div>
      </div>
    </div>
  );
});

export const YouTubeCard = memo(function YouTubeCardRenderer({ content, media, authorName, authorAvatar, videoTitle, realMetrics, visibility }: any) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(realMetrics?.likes ?? 0);
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  
  return (
    <div className="preview-card yt-card bg-black text-white rounded-xl overflow-hidden shadow-2xl">
      <div className="aspect-video bg-zinc-900 relative group cursor-pointer">
        <MultimodalMedia 
          media={media} 
          playing={playing} 
          setPlaying={setPlaying} 
          videoRef={videoRef} 
          audioRef={audioRef} 
        />
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/0 transition-all pointer-events-none">
             <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform"><Play className="w-8 h-8 text-white fill-white translate-x-1" /></div>
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 px-1.5 py-0.5 rounded text-[10px] font-black">10:42</div>
      </div>
      <div className="p-4">
        <div className="flex gap-3">
          {authorAvatar ? <img src={authorAvatar} className="w-10 h-10 rounded-full shrink-0" alt="" /> : <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white shrink-0 font-black">{authorName?.[0] || "V"}</div>}
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-[15px] line-clamp-2 mb-1.5 leading-tight">{videoTitle || content?.split('\n')[0] || "Explorando o Futuro Digital"}</h3>
            <div className="flex flex-col gap-0.5">
               <div className="flex items-center gap-2">
                 <span className="text-zinc-400 text-xs font-black hover:text-white transition-colors cursor-pointer">{authorName || "Vitória News"}</span>
                 <div className="w-3.5 h-3.5 bg-zinc-500 rounded-full flex items-center justify-center"><Check className="w-2 h-2 text-black stroke-[4]" /></div>
                 {visibility && <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
               </div>
               <div className="text-xs text-zinc-500 font-bold tracking-tight">
                 <span>{formatNum(realMetrics?.followers ?? 0)} inscritos • {formatNum(Math.floor((realMetrics?.followers ?? 0) * 12.5))} visualizações • há 2 min</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const TelegramCard = memo(function TelegramCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  return (
    <div className="preview-card tg-frame p-6 bg-[#0e1621] rounded-3xl shadow-2xl min-h-[450px] border border-white border-opacity-5">
      <div className="tg-msg max-w-[85%] bg-[#182533] p-1 rounded-2xl shadow-xl overflow-hidden border border-white border-opacity-5">
        {media.length > 0 && (
          <div className="rounded-xl overflow-hidden mb-1 relative group cursor-pointer shadow-inner aspect-video">
            <MultimodalMedia 
              media={media} 
              playing={playing} 
              setPlaying={setPlaying} 
              videoRef={videoRef} 
              audioRef={audioRef} 
            />
          </div>
        )}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[#4ea4e0] font-black text-sm hover:underline cursor-pointer">{authorName || "Vitória News"}</span>
              {visibility && <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
            </div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{formatNum(realMetrics?.followers ?? 0)} membros</span>
          </div>
          <div className="tg-text text-[14.5px] leading-snug text-zinc-100 whitespace-pre-wrap mb-2">{content || "Acompanhe as últimas atualizações do hub oficial."}</div>
          <div className="tg-meta flex items-center justify-end gap-1.5 text-[10px] text-zinc-500 font-bold">
            <Eye className="w-3.5 h-3.5 opacity-60" /> {formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.12))} <span className="ml-1 opacity-60">10:42</span> <CheckCheck className="w-3.5 h-3.5 text-[#4ea4e0]" />
          </div>
        </div>
      </div>
    </div>
  );
});

export const WhatsAppCard = memo(function WhatsAppCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  return (
    <div className="preview-card wa-chat-bg p-6 bg-[#0b141a] rounded-3xl shadow-2xl min-h-[450px] border border-white border-opacity-5">
      <div className="sent float-right max-w-[85%] bg-[#005c4b] p-2 rounded-2xl shadow-xl border border-white border-opacity-5 relative">
        {media.length > 0 && (
          <div className="rounded-xl overflow-hidden mb-2 relative group cursor-pointer shadow-inner aspect-video">
            <MultimodalMedia 
              media={media} 
              playing={playing} 
              setPlaying={setPlaying} 
              videoRef={videoRef} 
              audioRef={audioRef} 
            />
          </div>
        )}
        <div className="px-2 py-1">
          <div className="wa-text text-[15px] leading-snug text-white pr-12 pb-3 whitespace-pre-wrap">{content || "Novidades exclusivas chegando pelo WhatsApp."}</div>
          <div className="wa-meta flex items-center justify-end gap-1.5 text-[10px] text-zinc-400 font-bold absolute bottom-2 right-3">
            {visibility && <span className="mr-1 text-[8px] font-black text-zinc-500 uppercase tracking-widest bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
            10:42 <CheckCheck className="w-4 h-4 text-blue-400" />
          </div>
        </div>
      </div>
    </div>
  );
});

export const SpotifyCard = memo(function SpotifyCardRenderer({ media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(35);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const image = media.find((m: any) => m.file_type?.startsWith("image/"));
  const audio = media.find((m: any) => m.file_type?.startsWith("audio/"));

  return (
    <div className="preview-card sp-frame bg-[#121212] p-6 rounded-3xl shadow-2xl text-white border border-white border-opacity-5">
      <div className="sp-header text-[11px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-8 text-center drop-shadow-lg">Tocando do seu Hub</div>
      <div className="sp-cover-art aspect-square bg-zinc-900 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden mb-8 group relative cursor-pointer ring-1 ring-white/5">
        <MultimodalMedia 
          media={media} 
          playing={playing} 
          setPlaying={setPlaying} 
          videoRef={videoRef} 
          audioRef={audioRef} 
        />
      </div>
      <div className="sp-track-info flex justify-between items-end mb-6">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="sp-title font-black text-xl truncate hover:underline cursor-pointer tracking-tight drop-shadow-md">Podcast do Futuro: Ep. 01</div>
            {visibility && <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
          </div>
          <div className="sp-artist text-[15px] font-bold text-zinc-400 truncate hover:text-white transition-colors cursor-pointer">{authorName || "Vitória News"}</div>
        </div>
        <Heart className="w-7 h-7 text-spotify-green fill-current cursor-pointer hover:scale-125 active:scale-95 transition-all drop-shadow-[0_0_10px_rgba(29,185,84,0.3)]" />
      </div>
      <div className="sp-progress-area group cursor-pointer mb-3" onClick={(e) => { const clientX = e.clientX; const target = e.currentTarget; requestAnimationFrame(() => { const rect = target.getBoundingClientRect(); const x = clientX - rect.left; setProgress((x / rect.width) * 100); }); }}>
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-white group-hover:bg-spotify-green transition-all duration-300 relative" style={{ width: `${progress}%` }}><div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-xl transition-opacity" /></div></div>
      </div>
      <div className="flex justify-between text-[11px] text-zinc-500 font-black tracking-widest mb-8 opacity-80"><span>0:{Math.floor(progress * 0.4).toString().padStart(2, '0')}</span><span>3:20</span></div>
      <div className="sp-controls flex justify-center items-center gap-10 pb-2">
        <SkipBack className="w-8 h-8 fill-white hover:text-zinc-300 transition-all cursor-pointer active:scale-90" />
        <button className="sp-play-btn w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-4 border-black/10" onClick={() => setPlaying(!playing)}>
          {playing ? <div className="flex gap-2"><div className="w-2 h-6 bg-black rounded-sm" /><div className="w-2 h-6 bg-black rounded-sm" /></div> : <Play className="w-8 h-8 fill-black text-black ml-1.5" />}
        </button>
        <SkipForward className="w-8 h-8 fill-white hover:text-zinc-300 transition-all cursor-pointer active:scale-90" />
      </div>
    </div>
  );
});

export const ResendCard = memo(function ResendCardRenderer({ content, authorName, authorAvatar, visibility, realMetrics }: any) {
  return (
    <div className="preview-card bg-black text-white rounded-2xl overflow-hidden shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] border border-white border-opacity-5 max-w-2xl mx-auto">
      <div className="p-5 border-b border-white border-opacity-5 bg-zinc-900/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <ArrowLeft className="w-5 h-5 text-zinc-500 hover:text-white transition-colors cursor-pointer" />
           <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white border-opacity-10 shadow-inner"><Mail className="w-5 h-5 text-zinc-400" /></div>
           <div className="hidden sm:block"><div className="text-xs font-black text-white">Nova Mensagem</div><div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Prioridade Alta</div></div>
        </div>
        <div className="flex gap-3 px-2"><div className="w-2 h-2 rounded-full bg-zinc-800" /><div className="w-2 h-2 rounded-full bg-zinc-800" /><div className="w-2 h-2 rounded-full bg-zinc-800" /></div>
      </div>
      <div className="p-8">
        <h2 className="text-3xl font-black text-white mb-8 leading-[1.1] tracking-tight drop-shadow-2xl">{content?.split('\n')[0]?.slice(0, 60) || "Inteligência Artificial & O Futuro da Sua Marca"}</h2>
        <div className="flex items-start gap-4 mb-10 bg-white/5 p-4 rounded-2xl border border-white border-opacity-5 shadow-inner">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-700 to-black flex items-center justify-center text-white font-black overflow-hidden shadow-2xl ring-2 ring-white/10">
            {authorAvatar ? <img src={authorAvatar} className="w-full h-full object-cover" alt="" /> : (authorName?.[0] || "V")}
          </div>
          <div className="flex flex-col">
             <div className="flex items-center gap-1.5">
               <span className="text-[15px] font-black tracking-tight">{authorName}</span>
               {visibility && <span className="ml-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
             </div>
             <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-bold uppercase tracking-widest">
               <span>{formatNum(realMetrics?.followers ?? 0)} seguidores</span>
               <span>•</span>
               <Globe className="w-3 h-3 text-zinc-500" />
             </div>
          </div>
        </div>
        <div className="text-[16px] leading-relaxed text-zinc-300 whitespace-pre-wrap mb-12 font-medium">{content || "Olá Vitória,\n\nA nova era da distribuição de conteúdo automatizada começou. Seu painel agora conta com inteligência preditiva para maximizar seu alcance orgânico.\n\nConfira as métricas em tempo real e prepare-se para escalar sua voz digital."}</div>
        <div className="mt-12 pt-10 border-t border-white border-opacity-5 flex flex-col items-center gap-8">
          <div className="flex gap-6">
             {[Twitter, Instagram, Linkedin].map((Icon, i) => (
               <div key={i} className="w-10 h-10 rounded-full bg-white/5 border border-white border-opacity-10 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer group shadow-lg"><Icon className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" /></div>
             ))}
          </div>
          <div className="text-[11px] text-zinc-600 text-center font-bold uppercase tracking-[0.15em] leading-relaxed max-w-xs opacity-60">Enviado via Vitória News Hub Pro<br /><span className="text-zinc-700 hover:text-zinc-500 cursor-pointer transition-colors mt-2 inline-block">Unsubscribe</span> • <span className="text-zinc-700 hover:text-zinc-500 cursor-pointer transition-colors">Manage Preferences</span></div>
        </div>
      </div>
    </div>
  );
});

export const RumbleCard = memo(function RumbleCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(realMetrics?.likes ?? 0);
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const video = media.find((m: any) => m.file_type?.startsWith("video/"));
  const image = media.find((m: any) => m.file_type?.startsWith("image/"));
  const audio = media.find((m: any) => m.file_type?.startsWith("audio/"));

  return (
    <div className="preview-card bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-white border-opacity-5">
      <div className="media-wrapper aspect-video bg-black flex items-center justify-center relative group cursor-pointer shadow-inner">
        <MultimodalMedia 
          media={media} 
          playing={playing} 
          setPlaying={setPlaying} 
          videoRef={videoRef} 
          audioRef={audioRef} 
        />
        <div className="absolute top-4 left-4 flex gap-2"><div className="bg-red-600 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse">Live</div><div className="bg-black bg-opacity-60 backdrop-blur-md text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-xl border border-white border-opacity-10">10:42</div></div>
      </div>
      <div className="p-6">
        <h3 className="text-white font-black text-xl mb-4 line-clamp-2 leading-tight hover:text-rumble-green transition-colors cursor-pointer drop-shadow-md">{content?.split('\n')[0] || "O Futuro Descentralizado da Mídia"}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rumble-green to-emerald-400 p-[2px] shadow-2xl ring-2 ring-zinc-900 overflow-hidden">
              {authorAvatar ? (
                <img src={authorAvatar} className="w-full h-full rounded-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-xs font-black text-white uppercase">{authorName?.[0] || "V"}</div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-black tracking-tight text-white">{authorName}</span>
                <div className="w-4 h-4 bg-rumble-green rounded-full flex items-center justify-center shadow-lg"><Check className="w-2.5 h-2.5 text-white stroke-[4]" /></div>
                {visibility && <span className="ml-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500 font-bold text-xs">
                <span>{formatNum(realMetrics?.followers ?? 0)} followers</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5 bg-zinc-900 px-5 py-2.5 rounded-full border border-white border-opacity-5 shadow-2xl">
            <button className={cn("flex items-center gap-2.5 font-black text-[13px] transition-all", liked ? "text-rumble-green drop-shadow-[0_0_10px_rgba(133,199,66,0.4)]" : "text-zinc-500 hover:text-white")} onClick={() => { setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }}><ThumbsUp className={cn("w-4.5 h-4.5", liked && "fill-current")} /> {formatNum(liked ? likes + 1 : likes)}</button>
            <div className="w-[1px] h-5 bg-zinc-800" />
            <button className="flex items-center gap-2.5 text-zinc-500 hover:text-white transition-colors font-black text-[13px]"><ThumbsUp className="w-4.5 h-4.5 rotate-180" /> {formatNum(Math.floor((realMetrics?.followers ?? 0) * 0.0001))}</button>
          </div>
        </div>
      </div>
    </div>
  );
});

export const PinterestCard = memo(function PinterestCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const image = media.find((m: any) => m.file_type?.startsWith("image/"));
  const video = media.find((m: any) => m.file_type?.startsWith("video/"));
  const audio = media.find((m: any) => m.file_type?.startsWith("audio/"));

  return (
    <div className="preview-card pin-card group relative bg-black rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] hover:shadow-2xl transition-all duration-700 cursor-zoom-in border border-white border-opacity-5">
        <div className={cn("media-wrapper relative overflow-hidden", media.some((m: any) => m.file_type?.startsWith("audio/")) ? "aspect-auto h-24 mt-20" : "aspect-[2/3]")}>
          <MultimodalMedia 
            media={media} 
            playing={playing} 
            setPlaying={setPlaying} 
            videoRef={videoRef} 
            audioRef={audioRef} 
          />
        </div>
        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[1px]">
           <button className={cn("absolute top-6 right-6 px-8 py-3.5 rounded-full font-black text-[15px] shadow-2xl transition-all active:scale-90 hover:scale-105", saved ? "bg-white text-black" : "bg-pinterest-red text-white hover:bg-red-700")} onClick={(e) => { e.stopPropagation(); setSaved(!saved); }}>{saved ? "Salvo" : "Salvar"}</button>
           <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
              <div className="bg-white/10 backdrop-blur-2xl p-2.5 rounded-full shadow-2xl flex items-center gap-3 px-5 border border-white border-opacity-10 cursor-pointer hover:bg-white/20 transition-all group/link"><Globe className="w-4 h-4 text-white group-hover:scale-110 transition-transform" /><span className="text-[11px] font-black text-white uppercase tracking-wider truncate max-w-[100px]">vitorianews.com</span></div>
              <div className="flex gap-3"><div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-2xl flex items-center justify-center shadow-2xl cursor-pointer hover:bg-white/20 border border-white border-opacity-10 transition-all active:scale-90"><Share2 className="w-5 h-5 text-white" /></div><div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-2xl flex items-center justify-center shadow-2xl cursor-pointer hover:bg-white/20 border border-white border-opacity-10 transition-all active:scale-90"><MoreHorizontal className="w-5 h-5 text-white" /></div></div>
           </div>
        </div>
      <div className="pin-info p-6 bg-gradient-to-b from-transparent to-black/20">
        <h3 className="pin-title text-base font-black text-white line-clamp-1 mb-4 group-hover:text-zinc-300 transition-colors cursor-pointer tracking-tight drop-shadow-md">{content?.split('\n')[0] || "Novas Ideias para Seu Hub"}</h3>
        <div className="pin-user flex items-center gap-3.5 group/user cursor-pointer">
          <div className="relative">
            {authorAvatar ? <img src={authorAvatar} className="pin-avatar-img w-10 h-10 rounded-full border-2 border-white border-opacity-10 group-hover/user:scale-110 transition-all shadow-xl" alt="" /> : <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-black text-white border border-white border-opacity-5">V</div>}
            {visibility && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-black" />}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-black text-white hover:underline truncate">{authorName || "Vitória News"}</span>
              {visibility && <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">{visibility === 'public' ? 'Público' : visibility === 'private' ? 'Privado' : 'Assinantes'}</span>}
            </div>
            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest">{formatNum(realMetrics?.followers ?? 0)} seguidores</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export const WebsiteCard = memo(function WebsiteCardRenderer({ content, media, authorName, authorAvatar, realMetrics, visibility }: any) {
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const images = media.filter((m: any) => m.file_type?.startsWith("image/"));
  const video = media.find((m: any) => m.file_type?.startsWith("video/"));
  
  return (
    <div className="preview-card site-card bg-white rounded-xl overflow-hidden shadow-2xl border border-zinc-200">
      <div className="bg-zinc-100 px-4 py-2 border-b flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 bg-white rounded border px-3 py-1 text-[10px] text-zinc-400 truncate">
          https://vitorianews.com.br/{content?.split('\n')[0].toLowerCase().replace(/\s/g, '-') || "noticia-exclusiva"}
        </div>
      </div>
      {media.length > 0 && (
        <div className="aspect-video bg-zinc-900 relative overflow-hidden">
          <MultimodalMedia 
            media={media} 
            playing={playing} 
            setPlaying={setPlaying} 
            videoRef={videoRef} 
            audioRef={audioRef} 
          />
        </div>
      )}
      <div className="p-6">
        <h2 className="text-2xl font-black text-zinc-900 mb-3 leading-tight">{content?.split('\n')[0] || "Manchete Principal"}</h2>
        <p className="text-zinc-600 text-sm leading-relaxed mb-6 line-clamp-3">{content?.split('\n').slice(1).join('\n') || "A revolução digital continua transformando o modo como consumimos informações no dia a dia..."}</p>
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            {authorAvatar ? <img src={authorAvatar} className="w-6 h-6 rounded-full" alt="" /> : <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-white font-bold">V</div>}
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{authorName || "Vitória News"}</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-bold">{new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
});

// --- MAIN COMPONENT ---

export const PostPreview = memo(function PostPreview({ content, selectedPlatforms, uploadedFiles, videoTitle, thumbnailUrl, mediaType, authorName: initialAuthorName, authorAvatar: initialAuthorAvatar, platformId: initialPlatformId, realMetrics: initialRealMetrics, visibility }: PostPreviewProps) {
  const { stats: socialAccounts } = useSocialStats();
  const { connections } = useSocialConnections();
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const videoItems = useMemo(() => {
    return uploadedFiles
      .filter(f => f.file_type?.startsWith("video/"))
      .map((f, idx) => ({
        id: f.id || `${Date.now()}-v${idx}`,
        title: videoTitle || f.name || 'Vídeo',
        media_url: getMediaUrl(f.file_url) || f.file_url,
        thumbnail_url: thumbnailUrl || null,
        duration: null,
        views: null,
        platform: mediaType || 'Vídeo',
        created_at: new Date().toISOString(),
      }));
  }, [uploadedFiles, videoTitle, thumbnailUrl, mediaType]);

  const previewItems = useMemo(() => {
    return selectedPlatforms.map(pId => {
      const [platform, accountId] = pId.split("|");
      return { platform, accountId, pId };
    }); // no limit — show all selected platforms
  }, [selectedPlatforms]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || videoItems.length === 0) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const videoEl = target.closest('video');
      if (videoEl && videoEl.src) {
        const url = videoEl.src;
        const idx = videoItems.findIndex(v => {
          const resolved = getMediaUrl(v.media_url);
          return resolved === url || v.media_url === url;
        });
        if (idx >= 0) {
          e.preventDefault();
          e.stopPropagation();
          setViewerIndex(idx);
          setViewerOpen(true);
        }
      }
    };
    container.addEventListener('click', handler, { capture: true });
    return () => container.removeEventListener('click', handler, { capture: true });
  }, [videoItems]);

  useEffect(() => {
    if (activeTabIdx >= previewItems.length) {
      setActiveTabIdx(Math.max(0, previewItems.length - 1));
    }
  }, [previewItems.length, activeTabIdx]);

  if (previewItems.length === 0 && !content && uploadedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-3"><Eye className="w-6 h-6" /></div>
        <p className="text-sm font-medium">Selecione uma conta social</p>
        <p className="text-xs mt-1">O preview aparece aqui conforme você cria o post</p>
      </div>
    );
  }

  const renderCard = (platformId: string, accountId: string, idx: number) => {
    // Try to find the exact account in stats or connections
    const statAccount = socialAccounts.find(acc => acc.id === accountId);
    const connAccount = connections.find(conn => conn.id === accountId);
    
    const authorName = statAccount?.username || (statAccount as any)?.page_name || connAccount?.page_name || initialAuthorName || "Vitória News";
    const authorAvatar = statAccount?.profile_picture || connAccount?.profile_picture || connAccount?.profile_image_url || initialAuthorAvatar;
    const platform = socialPlatforms.find(p => p.id === platformId);
    
    // Fallback metrics to 0 so we don't show fake Math.random data
    const followers = statAccount?.followers_count || connAccount?.followers_count || 0;
    const posts = statAccount?.posts_count || connAccount?.posts_count || 0;
    const likes = 0; // It's a preview, no fake likes
    
    const props = { content, media: uploadedFiles, videoTitle, thumbnailUrl, mediaType, authorName, authorAvatar, platform, platformId, realMetrics: { followers, posts, likes, shares: 0 }, visibility };

    switch (platformId) {
      case "instagram": return <InstagramCard key={idx} {...props} />;
      case "facebook": return <FacebookCard key={idx} {...props} />;
      case "twitter": return <XLikeCard key={idx} {...props} />;
      case "gettr": return <GettrCard key={idx} {...props} />;
      case "truthsocial": return <TruthSocialCard key={idx} {...props} />;
      case "linkedin": return <LinkedInCard key={idx} {...props} />;
      case "threads": return <ThreadsCard key={idx} {...props} />;
      case "reddit": return <RedditCard key={idx} {...props} />;
      case "tiktok": case "kwai": case "snapchat": return <TikTokCard key={idx} {...props} />;
      case "youtube": return <YouTubeCard key={idx} {...props} />;
      case "rumble": return <RumbleCard key={idx} {...props} />;
      case "pinterest": return <PinterestCard key={idx} {...props} />;
      case "telegram": return <TelegramCard key={idx} {...props} />;
      case "whatsapp": return <WhatsAppCard key={idx} {...props} />;
      case "spotify": return <SpotifyCard key={idx} {...props} />;
      case "resend": return <WebsiteCard key={idx} {...props} />;
      case "website": case "blog": case "site": case "google_news": case "medium": case "substack": return <WebsiteCard key={idx} {...props} />;
      default: return <InstagramCard key={idx} {...props} />; 
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 dark designer-black" style={{ contain: 'layout style paint' }}>
      <div className="flex justify-end mb-4">
        <div className="bg-zinc-900 p-1 rounded-xl border border-white border-opacity-5 flex gap-1 shadow-2xl">
          <button 
            onClick={() => setPreviewMode("desktop")}
            className={cn("px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-black transition-all", previewMode === "desktop" ? "bg-primary text-white shadow-lg" : "text-zinc-500 hover:text-white")}
          >
            <Monitor className="w-4 h-4" /> Desktop
          </button>
          <button 
            onClick={() => setPreviewMode("mobile")}
            className={cn("px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-black transition-all", previewMode === "mobile" ? "bg-primary text-white shadow-lg" : "text-zinc-500 hover:text-white")}
          >
            <Smartphone className="w-4 h-4" /> Celular
          </button>
        </div>
      </div>

      <div className={cn("transition-all duration-700 mx-auto", previewMode === "mobile" ? "max-w-[375px]" : "max-w-full")}>
        {previewMode === "mobile" && (
           <div className="mb-4 text-center">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-full border border-white border-opacity-5">Mobile View Active</span>
           </div>
        )}
        
        {previewItems.length > 0 ? (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
              {previewItems.map(({ platform: platformId, pId }, idx) => {
                 const plat = socialPlatforms.find(p => p.id === platformId);
                 if (!plat) return null;
                 const Icon = plat.icon;
                 const isActive = activeTabIdx === idx;
                 return (
                   <button
                       key={pId}
                       onClick={() => setActiveTabIdx(idx)}
                       className={cn(
                         "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 border relative",
                          isActive ? "border-primary bg-primary/10 text-primary scale-105 shadow-lg" : "border-white/10 bg-black text-zinc-500 hover:bg-zinc-900"
                       )}
                       title={plat.name}
                    >
                       <Icon className="w-6 h-6" />
                       {isActive && (
                           <div className="absolute -bottom-1 w-4 h-1 bg-primary rounded-full" />
                        )}
                   </button>
                 );
              })}
            </div>

            {previewItems[activeTabIdx] && (() => {
              const item = previewItems[activeTabIdx];
              return (
                <div key={item.pId} className={`platform-${item.platform}`}>
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                      {socialPlatforms.find(p => p.id === item.platform)?.name || item.platform}
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    </span>
                  </div>
                  <div className={cn("designer-black-frame border border-white border-opacity-5 rounded-2xl overflow-hidden shadow-2xl bg-black", previewMode === "mobile" && "ring-4 ring-zinc-900 shadow-[0_0_100px_rgba(0,0,0,0.5)]")}>
                    {renderCard(item.platform, item.accountId, activeTabIdx)}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="platform-generic designer-black-frame border border-white border-opacity-5 rounded-2xl overflow-hidden shadow-2xl bg-black">
             <ResendCard content={content} authorName={socialAccounts.find(acc => acc.platform === 'resend')?.username || initialAuthorName} authorAvatar={socialAccounts.find(acc => acc.platform === 'resend')?.profile_picture || initialAuthorAvatar} />
          </div>
        )}
      </div>
      {viewerOpen && videoItems.length > 0 && (
        <VideoViewer
          videos={videoItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
});
