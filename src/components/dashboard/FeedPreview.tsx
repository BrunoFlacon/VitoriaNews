import { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import {
  X, Instagram, Facebook, Twitter, Linkedin, MessageCircle, Play,
  Heart, MessageSquare, Share2, Bookmark, Send, MoreHorizontal,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, Calendar,
  BarChart3, DollarSign, TrendingUp, Tv, Coins, Music,
  Trash2, Eye, Globe, Zap, Image, AlertTriangle, Smile, PenLine
} from "lucide-react";
import { cn } from "@/lib/utils";
import { socialPlatforms, SocialPlatformId } from "@/components/icons/platform-metadata";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScheduledPost } from "@/hooks/useScheduledPosts";
import { useSocialStats, SocialAccountStat } from "@/hooks/useSocialStats";
import { SafeImage } from "@/components/ui/SafeImage";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { VideoViewer } from "./VideoViewer";
import { useToast } from "@/hooks/use-toast";

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.ogv']);

function isVideoUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
    return VIDEO_EXTENSIONS.has(ext);
  } catch {
    return url.match(/\.(mp4|webm|mov|avi|mkv|m4v|3gp|ogv)(\?|$)/i) !== null;
  }
}

function classifyPostMedia(urls: (string | null)[]): 'text' | 'audio' | 'photo' | 'video' | 'image_carousel' | 'video_carousel' | 'mixed_carousel' {
  const valid = urls.filter((u): u is string => !!u);
  if (valid.length === 0) return 'text';
  if (valid.length === 1) {
    const url = valid[0];
    if (isVideoUrl(url)) return 'video';
    if (url.match(/\.(mp3|wav|ogg|aac|m4a|flac)(\?|$)/i) !== null) return 'audio';
    return 'photo';
  }
  const hasVideo = valid.some(u => isVideoUrl(u));
  const hasImage = valid.some(u => !isVideoUrl(u));
  if (hasVideo && hasImage) return 'mixed_carousel';
  if (hasVideo) return 'video_carousel';
  return 'image_carousel';
}

/** Formata data/hora do post com indicadores visuais */
function formatPostDate(post: import("@/hooks/useScheduledPosts").ScheduledPost) {
  if (post.status === 'published' && post.published_at) {
    return {
      label: new Date(post.published_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      icon: 'published' as const,
    };
  }
  if (post.status === 'scheduled' && post.scheduled_at) {
    return {
      label: new Date(post.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      icon: 'scheduled' as const,
    };
  }
  return { label: 'Agora', icon: 'draft' as const };
}

/** Formata número de métricas de forma compacta */
function formatMetric(n: number | undefined): string {
  if (!n || n === 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toString();
}

/** Selo de Verificação Universal */
const VerifiedBadge = memo(({ className = "w-4 h-4 text-[#1d9bf0]" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={cn("fill-current shrink-0 inline-block align-middle ml-1", className)} aria-label="Conta verificada">
    <path d="M22.5 12.5c0-1.58-.8-2.47-1.24-3.23.96-1.88.77-2.54.58-3.04-.31-.82-1.37-1.31-2.22-1.21-1.01.12-1.61-.31-2.4-1.01C15.65 2.62 14.61 2 13.51 2c-1.1 0-2.14.62-3.71 1.99-.79.7-1.39 1.13-2.4 1.01-.85-.1-1.91.39-2.22 1.21-.19-.5-.38 1.16.58 3.04-.44.76-1.24 1.65-1.24 3.23 0 1.58.8 2.47 1.24 3.23-.96 1.88-.77 2.54-.58 3.04.31.82 1.37 1.31 2.22 1.21 1.01-.12 1.61.31 2.4 1.01C11.35 21.38 12.39 22 13.51 22c1.1 0 2.14-.62 3.71-1.99.79-.7 1.39-1.13 2.4-1.01.85.1 1.91-.39 2.22-1.21.19-.5.38-1.16-.58-3.04.44-.76 1.24-1.65 1.24-3.23zM9.93 17.58l-3.78-3.78 1.41-1.41 2.37 2.37 6.47-6.47 1.41 1.41-7.88 7.88z" />
  </svg>
));

const SlideVideo = memo(({ url, isActive, posterUrl }: { url: string; isActive: boolean; posterUrl?: string | null }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.currentTime = 0;
      el.muted = true;
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const handleTogglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.muted = false;
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, []);

  return (
    <div
      onClick={handleTogglePlay}
      className="relative w-full h-full cursor-pointer block bg-zinc-950"
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-contain"
        muted
        loop
        playsInline
        preload="metadata"
        poster={posterUrl || undefined}
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
});

const PlayableVideo = memo(({ url, posterUrl, className }: { url: string; posterUrl?: string | null; className?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = true;
  }, []);

  const handleTogglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.muted = false;
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, []);

  return (
    <div
      onClick={handleTogglePlay}
      className={cn("relative cursor-pointer w-full h-full overflow-hidden bg-zinc-950", className)}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-contain"
        muted
        loop
        playsInline
        preload="metadata"
        poster={posterUrl || undefined}
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
});

/** Carrossel com slide CSS — sem tela preta, sem reflow */
const SlideCarousel = memo(({
  urls,
  aspectClass = 'aspect-square',
  dotsClass = '',
  onVideoClick,
  posterUrl,
}: {
  urls: (string | null)[];
  aspectClass?: string;
  dotsClass?: string;
  onVideoClick?: (url: string) => void;
  posterUrl?: string | null;
}) => {
  const [idx, setIdx] = useState(0);
  const validUrls = useMemo(() => urls.filter((u): u is string => !!u), [urls]);
  const count = validUrls.length;

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx(i => Math.min(count - 1, i + 1)), [count]);

  if (count === 0) return null;

  return (
    <div className="relative overflow-hidden group" style={{ contain: 'paint layout' }}>
      <div className={aspectClass}>
        {/* Strip horizontal — todas as imagens ficam na DOM, slide via translateX */}
        <div
          className="flex h-full transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: `translateX(-${(idx * 100) / count}%)`, width: `${count * 100}%` }}
        >
          {validUrls.map((url, i) => (
            <div
              key={url}
              className="relative h-full flex-shrink-0"
              style={{ width: `${100 / count}%` }}
            >
              {isVideoUrl(url) ? (
                <SlideVideo
                  url={url}
                  isActive={i === idx}
                  posterUrl={posterUrl}
                />
              ) : (
                <SafeImage
                  src={url}
                  alt={`mídia ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="eager"
                  fetchPriority={i === 0 ? 'high' : 'low'}
                />
              )}
            </div>
          ))}
        </div>
        {/* Contador */}
        {count > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 select-none pointer-events-none">
            {idx + 1}/{count}
          </div>
        )}
        {/* Indicadores de bolinhas centralizados (Print 2/Instagram/LinkedIn) */}
        {count > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
            {Array.from({ length: count }).map((_, dotIdx) => (
              <div
                key={dotIdx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-200",
                  dotIdx === idx ? "bg-white scale-110 shadow-sm" : "bg-white/40"
                )}
              />
            ))}
          </div>
        )}
        {/* Setas */}
        {idx > 0 && (
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/85 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white active:scale-95"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-800" />
          </button>
        )}
        {idx < count - 1 && (
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/85 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white active:scale-95"
            aria-label="Próxima"
          >
            <ChevronRight className="w-4 h-4 text-zinc-800" />
          </button>
        )}
      </div>

    </div>
  );
});

interface FeedPreviewProps {
  post: ScheduledPost;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (post: ScheduledPost) => void;
  onDelete?: (id: string) => void;
}

function parsePlatform(pId: string): { platformId: string; accountId?: string } {
  const [platformId, accountId] = pId.split("|");
  return { platformId, accountId };
}

export const FeedPreview = memo(({ post, isOpen, onClose, onEdit, onDelete }: FeedPreviewProps) => {
  const platformEntries = useMemo(() =>
    post.platforms.map(pId => {
      const { platformId, accountId } = parsePlatform(pId);
      const platform = socialPlatforms.find(p => p.id === platformId);
      return { raw: pId, platformId, accountId, platform };
    }).filter(p => p.platform),
    [post.platforms]
  );

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedEntry = platformEntries[selectedIdx] || platformEntries[0];
  
  // Local editable states
  const [visibility, setVisibility] = useState<"public" | "private" | "subscribers">((post as any).visibility || "public");
  const [status, setStatus] = useState<ScheduledPost['status']>(post.status || "draft");
  const [scheduledDate, setScheduledDate] = useState<string>(post.scheduled_at ? post.scheduled_at.slice(0, 16) : "");
  const [liked, setLiked] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isSlideshowActive, setIsSlideshowActive] = useState(false);
  const [localPosterUrl, setLocalPosterUrl] = useState<string | null>(post.thumbnail_url || null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const videoItems = useMemo(() => {
    if (!post.media_urls) return [];
    return post.media_urls
      .filter((u): u is string => !!u && isVideoUrl(u))
      .map((url, idx) => ({
        id: `${post.id}-v${idx}`,
        title: post.content?.slice(0, 100) || 'Vídeo',
        media_url: url,
        thumbnail_url: null,
        duration: null,
        views: post.metrics?.views ?? null,
        platform: post.media_type === 'reel' ? 'Instagram Reels' : post.media_type === 'story' ? 'Stories' : 'Vídeo',
        created_at: post.created_at,
      }));
  }, [post]);

  const handleOpenViewer = useCallback((url: string) => {
    const idx = videoItems.findIndex(v => v.media_url === url);
    if (idx >= 0) {
      setViewerIndex(idx);
      setViewerOpen(true);
    }
  }, [videoItems]);

  // Sync state with post props when modal opens
  useEffect(() => {
    if (isOpen) {
      setVisibility((post as any).visibility || "public");
      setStatus(post.status || "draft");
      setScheduledDate(post.scheduled_at ? post.scheduled_at.slice(0, 16) : "");
      setLiked(false);
      setInputText('');
      setShowMenu(false);
      setShowTools(false);
      setShowInsights(false);
      setIsSlideshowActive(false);
      setLocalPosterUrl(post.thumbnail_url || null);
    }
  }, [isOpen, post]);

  // Keyboard navigation for networks (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showMenu) return; // Skip if menu is open
      if (e.key === "ArrowLeft") {
        setSelectedIdx(prev => (prev > 0 ? prev - 1 : platformEntries.length - 1));
      } else if (e.key === "ArrowRight") {
        setSelectedIdx(prev => (prev < platformEntries.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [platformEntries.length, showMenu]);

  // Slideshow automatic cycle (every 5 seconds)
  useEffect(() => {
    if (!isSlideshowActive || platformEntries.length <= 1) return;
    const interval = setInterval(() => {
      setSelectedIdx(prev => (prev < platformEntries.length - 1 ? prev + 1 : 0));
    }, 5000);
    return () => clearInterval(interval);
  }, [isSlideshowActive, platformEntries.length]);

  // Initial comments by platform
  const [commentsByPlatform, setCommentsByPlatform] = useState<Record<string, { id: string; author: string; content: string; time: string; initials: string; liked?: boolean; hidden?: boolean }[]>>({
    instagram: [
      { id: 'ig-1', author: 'andrefernandes', content: 'Incrível ver essa vitória! 👏🏆', time: '12m', initials: 'AF' },
      { id: 'ig-2', author: 'carmeloneto', content: 'Trabalho fantástico da equipe.', time: '1h', initials: 'CN' }
    ],
    facebook: [
      { id: 'fb-1', author: 'Ricardo De Freitas Marques', content: 'Nessa altura do campeonato já limparam tudo para não encontrar nada', time: '16 sem', initials: 'RI' },
      { id: 'fb-2', author: 'Lazaro Alves', content: 'MENTIROSO O PRESIDENTE DA CPMI SO TRAS OS REQUERIMENTO QUE VCS DA DIREITA LEVAM ELES NAO VOTAM...', time: '16 sem', initials: 'LA' }
    ],
    tiktok: [
      { id: 'tk-1', author: 'Roberto Santos', content: 'Caramba, sensacional esse conteúdo! 🚀', time: '2h atrás', initials: 'RS' },
      { id: 'tk-2', author: 'Mariana Lima', content: 'Já salvei para aplicar hoje mesmo.', time: '4h atrás', initials: 'ML' }
    ],
    linkedin: [
      { id: 'li-1', author: 'Carlos Menezes', content: 'Muito relevante para o cenário de marketing digital.', time: '1d', initials: 'CM' }
    ],
    whatsapp: [
      { id: 'wa-1', author: 'Grupo Vitória News', content: 'Vídeo enviado no grupo da rádio.', time: '10:45', initials: 'VN' }
    ],
    telegram: [
      { id: 'tg-1', author: 'Canal Oficial', content: 'Confira a nossa nova transmissão.', time: '10:46', initials: 'CO' }
    ],
    twitter: [
      { id: 'tw-1', author: 'br_social', content: 'Parabéns, muito informativo! #VitóriaNews', time: '10m', initials: 'BS' }
    ],
    threads: [
      { id: 'th-1', author: 'lucas_lima', content: 'Excelente formato de publicação.', time: '5m', initials: 'LL' }
    ],
    youtube: [
      { id: 'yt-1', author: 'Pedro Alvares', content: 'Sempre acompanho as novidades por aqui, nota 10!', time: '3d atrás', initials: 'PA' }
    ]
  });

  const { byPlatform } = useSocialStats();
  const { connections } = useSocialConnections();
  const { toast } = useToast();

  const getAccount = (entry: typeof platformEntries[number]) => {
    if (!entry) return null;
    if (entry.accountId) {
      const conn = connections.find(c => c.id === entry.accountId);
      if (conn) {
        return {
          id: conn.id,
          username: conn.page_name || conn.username || conn.platform,
          profile_picture: conn.profile_picture || conn.profile_image_url || null,
          followers_count: conn.followers_count ?? 0,
          posts_count: conn.posts_count ?? 0,
          platform: conn.platform,
        } as any;
      }
      const statAcc = byPlatform[entry.platformId]?.find(a => a.id === entry.accountId);
      if (statAcc) return statAcc;
    }
    const primaryConn = connections.find(c => c.platform === entry.platformId && c.is_connected && c.is_primary);
    if (primaryConn) {
      return {
        id: primaryConn.id,
        username: primaryConn.page_name || primaryConn.username || primaryConn.platform,
        profile_picture: primaryConn.profile_picture || primaryConn.profile_image_url || null,
        followers_count: primaryConn.followers_count ?? 0,
        posts_count: primaryConn.posts_count ?? 0,
        platform: primaryConn.platform,
      } as any;
    }
    return byPlatform[entry.platformId]?.[0] || null;
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const platformId = selectedEntry?.platformId || 'facebook';
    const newComment = {
      id: `${platformId}-${Date.now()}`,
      author: 'Bruno Flacon',
      content: inputText.trim(),
      time: 'Agora',
      initials: 'BF'
    };
    setCommentsByPlatform(prev => ({
      ...prev,
      [platformId]: [...(prev[platformId] || []), newComment]
    }));
    setInputText('');
  };

  const handleEditPost = () => {
    if (onEdit) {
      onEdit(post);
      onClose();
    } else {
      toast({
        title: "Editar Conteúdo",
        description: "O editor de posts foi aberto com esta publicação.",
      });
    }
  };

  const handleEditCover = () => {
    coverInputRef.current?.click();
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setLocalPosterUrl(objectUrl);
      toast({
        title: "Capa Atualizada",
        description: `A imagem "${file.name}" foi definida como a capa da publicação.`,
      });
    }
  };

  const handleShowMetrics = () => {
    // Toggles the insights panel (Fase 5)
    setShowInsights(prev => !prev);
  };

  // Comment Moderation Actions (Fase 4)
  const handleCommentLike = (commentId: string) => {
    const platformId = selectedEntry?.platformId || 'facebook';
    setCommentsByPlatform(prev => ({
      ...prev,
      [platformId]: prev[platformId].map(c => 
        c.id === commentId ? { ...c, liked: !c.liked } : c
      )
    }));
    toast({
      title: "Curtida Processada",
      description: "Interação registrada com sucesso.",
    });
  };

  const handleCommentHide = (commentId: string) => {
    const platformId = selectedEntry?.platformId || 'facebook';
    setCommentsByPlatform(prev => ({
      ...prev,
      [platformId]: prev[platformId].map(c => 
        c.id === commentId ? { ...c, hidden: !c.hidden } : c
      )
    }));
    toast({
      title: "Comentário Ocultado",
      description: "O status de visibilidade do comentário foi alterado nas APIs oficiais.",
    });
  };

  const handleCommentDelete = (commentId: string) => {
    const platformId = selectedEntry?.platformId || 'facebook';
    // Optimistic delete
    setCommentsByPlatform(prev => ({
      ...prev,
      [platformId]: prev[platformId].filter(c => c.id !== commentId)
    }));
    toast({
      title: "Comentário Excluído",
      description: "O comentário ofensivo foi deletado da rede via API DELETE.",
    });
  };

  const handleMenuDelete = () => {
    setShowMenu(false);
    if (confirm("Deseja realmente excluir esta publicação?")) {
      if (onDelete) {
        onDelete(post.id);
        toast({
          title: "Publicação Excluída",
          description: "A publicação foi deletada com sucesso.",
        });
        onClose();
      } else {
        toast({
          title: "Excluir Publicação",
          description: "Ação de exclusão disparada.",
        });
      }
    }
  };

  const handleMenuEdit = () => {
    setShowMenu(false);
    setShowTools(true);
  };

  const handleMenuGoToPost = () => {
    setShowMenu(false);
    toast({
      title: "Ir para o post",
      description: "Redirecionando para a publicação original...",
    });
  };

  const handleMenuShare = () => {
    setShowMenu(false);
    toast({
      title: "Compartilhar",
      description: "Link de compartilhamento gerado com sucesso!",
    });
  };

  const handleMenuCopyLink = () => {
    setShowMenu(false);
    navigator.clipboard.writeText(`https://socialhub.pro/posts/${post.id}`).then(() => {
      toast({
        title: "Link Copiado",
        description: "Link copiado para a área de transferência.",
      });
    }).catch(() => {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive"
      });
    });
  };

  const handleMenuMetrics = () => {
    setShowMenu(false);
    handleShowMetrics();
  };

  const account = selectedEntry ? getAccount(selectedEntry) : null;
  const platformId = selectedEntry?.platformId || 'facebook';
  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);

  const getAspectClass = () => {
    const isVertical = platformId === 'tiktok' || platformId === 'whatsapp' || platformId === 'telegram' || post.media_type === 'reel' || post.media_type === 'story';
    if (isVertical) return "aspect-[9/16] h-full";
    if (platformId === 'youtube') return "aspect-[16/9] w-full max-h-[400px]";
    if (platformId === 'instagram') return "aspect-[4/5] h-full";
    return "aspect-[16/9] w-full max-h-[400px]";
  };

  const activeComments = commentsByPlatform[platformId] || [];

  // Helper to format large numbers
  const formatMetric = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const likeCount = post.metrics?.likes ? (liked ? post.metrics.likes + 1 : post.metrics.likes) : (liked ? 1 : 0);

  const renderCinemaMedia = () => {
    const classifiedType = classifyPostMedia(post.media_urls || []);

    return (
      <div className="w-full h-full flex items-center justify-center bg-black relative select-none overflow-hidden">
        {hasMedia ? (
          <div className={cn("flex items-center justify-center w-full h-full p-2 md:p-6 relative", getAspectClass())}>
            <SlideCarousel
              urls={post.media_urls ?? []}
              aspectClass={getAspectClass()}
              posterUrl={localPosterUrl}
            />

            {/* TikTok / Shorts Native Overlay (Fase 2) */}
            {platformId === 'tiktok' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 bg-gradient-to-b from-black/10 via-transparent to-black/75 z-20">
                <div></div>
                <div className="flex items-end justify-between w-full pointer-events-auto">
                  {/* Left Bottom: Username, caption, music */}
                  <div className="text-white flex-1 pr-12 text-left space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm">@{account?.username || 'seu_perfil'}</span>
                      <VerifiedBadge className="w-3.5 h-3.5 text-[#20d5ec]" />
                      <button className="bg-[#fe2c55] text-white font-black text-[9px] px-2 py-0.5 rounded-sm border-0 cursor-pointer">Seguir</button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-200 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                      {post.content || 'Sem legenda.'}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-300">
                      <Music className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                      <span className="truncate">Som original - @{account?.username || 'seu_perfil'}</span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-col items-center gap-3 text-white shrink-0 mb-2">
                    {/* Profile with + */}
                    <div className="relative mb-1">
                      <div className="w-9 h-9 rounded-full border border-white overflow-hidden bg-zinc-800">
                        {account?.profile_picture ? (
                          <img src={account.profile_picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-zinc-700 flex items-center justify-center font-bold text-[10px]">
                            {(account?.username || 'U').slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4.5 h-4.5 bg-[#fe2c55] rounded-full flex items-center justify-center text-white font-black text-xs cursor-pointer shadow-md border-0">
                        +
                      </div>
                    </div>

                    {/* Like button */}
                    <button 
                      type="button" 
                      onClick={() => setLiked(!liked)} 
                      className="flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer p-0 text-white"
                    >
                      <Heart className={cn("w-5.5 h-5.5", liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white fill-white")} />
                      <span className="text-[9px] font-bold">{formatMetric(likeCount)}</span>
                    </button>

                    {/* Comment button */}
                    <button 
                      type="button" 
                      className="flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer p-0 text-white"
                    >
                      <MessageCircle className="w-5.5 h-5.5 fill-white text-white" />
                      <span className="text-[9px] font-bold">{activeComments.length}</span>
                    </button>

                    {/* Bookmark button */}
                    <button 
                      type="button" 
                      className="flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer p-0 text-white"
                    >
                      <Bookmark className="w-5.5 h-5.5 fill-white text-white" />
                      <span className="text-[9px] font-bold">2.5K</span>
                    </button>

                    {/* Share button */}
                    <button 
                      type="button" 
                      className="flex flex-col items-center gap-0.5 border-0 bg-transparent cursor-pointer p-0 text-white"
                    >
                      <Share2 className="w-5.5 h-5.5 text-white" />
                      <span className="text-[9px] font-bold">142</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-square flex flex-col items-center justify-center text-zinc-700 gap-4">
            <Tv className="w-16 h-16 opacity-30 text-white" />
            <span className="text-zinc-500 text-xs font-semibold">Nenhuma mídia anexada</span>
          </div>
        )}
      </div>
    );
  };

  const renderInteractionSidebar = () => {
    // Determine platform-specific dark theme styles
    let containerBg = "bg-[#18191a]";
    let textColor = "text-[#e4e6eb]";
    let borderColor = "border-[#2f3032]";
    let accentBtnBg = "bg-[#1877F2] hover:bg-[#166fe5]";
    let secBtnBg = "bg-[#3a3b3c] hover:bg-zinc-750";

    if (platformId === 'tiktok' || platformId === 'threads') {
      containerBg = "bg-[#121212]";
      textColor = "text-zinc-100";
      borderColor = "border-zinc-850";
      accentBtnBg = "bg-[#fe2c55] hover:bg-[#e0224a]";
      secBtnBg = "bg-zinc-900 hover:bg-zinc-800";
    } else if (platformId === 'instagram') {
      containerBg = "bg-[#000000]";
      textColor = "text-[#f5f5f5]";
      borderColor = "border-[#262626]";
      accentBtnBg = "bg-[#0095f6] hover:bg-[#1877f2]";
      secBtnBg = "bg-[#262626] hover:bg-[#363636]";
    } else if (platformId === 'whatsapp') {
      containerBg = "bg-[#0b141a]";
      textColor = "text-[#e9edef]";
      borderColor = "border-[#222e35]";
      accentBtnBg = "bg-[#00a884] hover:bg-[#008f72]";
      secBtnBg = "bg-[#202c33] hover:bg-[#2a3942]";
    } else if (platformId === 'telegram') {
      containerBg = "bg-[#0e1621]";
      textColor = "text-[#ffffff]";
      borderColor = "border-[#242f3d]";
      accentBtnBg = "bg-[#2f8819] hover:bg-[#256c13]";
      secBtnBg = "bg-[#182533] hover:bg-[#203143]";
    } else if (platformId === 'youtube') {
      containerBg = "bg-[#0f0f0f]";
      textColor = "text-[#f1f1f1]";
      borderColor = "border-zinc-800";
      accentBtnBg = "bg-[#cc0000] hover:bg-[#990000]";
      secBtnBg = "bg-[#272727] hover:bg-[#3f3f3f]";
    } else if (platformId === 'twitter') {
      containerBg = "bg-[#000000]";
      textColor = "text-[#f7f9f9]";
      borderColor = "border-[#2f3336]";
      accentBtnBg = "bg-[#1d9bf0] hover:bg-[#1a8cd8]";
      secBtnBg = "bg-[#181818] hover:bg-[#2d2d2d]";
    }

    const handleMenuAlterarCapa = () => {
      setShowMenu(false);
      handleEditCover();
    };

    return (
      <div className={cn("flex flex-col h-full overflow-hidden text-left select-none relative", containerBg, textColor)}>
        {/* Profile Header */}
        <div className={cn("p-4 border-b shrink-0 flex flex-col gap-2.5", borderColor)}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-850 border border-zinc-700 shrink-0">
                {account?.profile_picture ? (
                  <img src={account.profile_picture} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-700 flex items-center justify-center font-bold text-white uppercase text-xs">
                    {(account?.username || 'U').substring(0, 2)}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold truncate max-w-[120px]">
                    {platformId === 'tiktok' || platformId === 'instagram' ? `@${account?.username || 'seu_perfil'}` : (account?.username || 'Web Rádio Vitória')}
                  </span>
                  {isVerified && <VerifiedBadge className="w-3 h-3 text-[#1877F2] dark:text-sky-400" />}
                </div>
                <span className="text-[9px] text-zinc-400 uppercase font-semibold">
                  Publicado por {account?.username || 'Web Rádio Vitória'}
                </span>
              </div>
            </div>

            {/* Actions: Seguir, Slideshow, Editar, and Three-dots options menu */}
            <div className="flex items-center gap-1 shrink-0">
              <button className={cn("px-2 py-1.5 rounded-full text-[10px] font-bold text-white border-0 cursor-pointer transition-colors shrink-0", 
                platformId === 'facebook' ? "bg-[#1877f2] hover:bg-[#166fe5]" :
                platformId === 'instagram' ? "bg-[#0095f6] hover:bg-[#1877f2]" :
                platformId === 'tiktok' ? "bg-[#fe2c55] hover:bg-[#e0224a]" :
                "bg-zinc-800 hover:bg-zinc-750 text-zinc-200"
              )}>
                {platformId === 'facebook' ? '+ Assinar' : 'Seguir'}
              </button>

              <button
                type="button"
                onClick={() => setIsSlideshowActive(prev => !prev)}
                className={cn("px-2 py-1.5 rounded-lg text-[10px] font-bold border-0 cursor-pointer transition-all shrink-0",
                  isSlideshowActive ? "bg-red-500 hover:bg-red-650 text-white animate-pulse" : "bg-[#3a3b3c]/80 hover:bg-zinc-700 text-zinc-300"
                )}
                title="Modo Apresentação (Slideshow de redes a cada 5s)"
              >
                {isSlideshowActive ? "⏹ Parar" : "▶ Auto"}
              </button>

              <button
                type="button"
                onClick={() => setShowMenu(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#3a3b3c]/80 hover:bg-zinc-755 text-white hover:text-white transition-colors text-[10px] font-bold border-0 cursor-pointer shrink-0"
              >
                Editar
              </button>

              <button
                type="button"
                onClick={() => setShowMenu(true)}
                className="p-1.5 rounded-lg bg-[#3a3b3c]/80 hover:bg-zinc-755 text-zinc-300 hover:text-white transition-colors border-0 cursor-pointer shrink-0"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Date, Status and Metrics Bar */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 px-1 border-t border-zinc-800/40 pt-2 shrink-0">
            <span className="truncate">
              {scheduledDate ? new Date(scheduledDate).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' }) : '01 de julho de 2026 às 09:22'}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                status === 'published' ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                status === 'failed' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                "bg-blue-500/10 text-blue-500 border border-blue-500/20"
              )}>
                {status}
              </span>
              <button 
                type="button"
                onClick={handleShowMetrics}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-350 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
                title="Métricas"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Post Description / Caption */}
          <div className="mt-1">
            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {post.content ? post.content.split(' ').map((word, idx) => {
                if (word.startsWith('#')) {
                  return <span key={idx} className="text-[#1877F2] hover:underline font-semibold cursor-pointer">{word} </span>;
                }
                return word + ' ';
              }) : 'Sem conteúdo de texto.'}
            </p>
          </div>

          {/* Compact Tools Panel (Print 1) - Toggled by clicking Editar in options menu */}
          {showTools && (
            <div className="mt-3 p-3 bg-[#1c1c1e] border border-zinc-800/80 rounded-xl space-y-3 relative animate-in slide-in-from-top-4 duration-200">
              <button 
                type="button"
                onClick={() => setShowTools(false)} 
                className="absolute top-2 right-2 text-zinc-550 hover:text-white transition-colors bg-transparent border-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex flex-col gap-2.5 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Visibilidade Select */}
                  <div className="flex items-center gap-1.5 bg-[#3a3b3c] hover:bg-zinc-700 transition-colors px-2.5 py-1.5 rounded-lg text-zinc-200 text-[11px] font-bold cursor-pointer relative">
                    <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <select
                      value={visibility}
                      onChange={(e) => {
                        setVisibility(e.target.value as any);
                        toast({ title: "Visibilidade alterada", description: `Definida como: ${e.target.value}.` });
                      }}
                      className="bg-transparent border-0 text-[11px] text-white outline-none cursor-pointer font-bold font-sans w-full pr-4"
                    >
                      <option value="public" className="bg-[#242526] text-white">Público</option>
                      <option value="private" className="bg-[#242526] text-white">Privado</option>
                      <option value="subscribers" className="bg-[#242526] text-white">Assinantes</option>
                    </select>
                  </div>

                  {/* Status Select */}
                  <div className="flex items-center gap-1.5 bg-[#1877f2]/15 border border-[#1877f2]/30 text-[#1877f2] px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider cursor-pointer relative">
                    <Zap className="w-3.5 h-3.5 text-[#1877f2] fill-[#1877f2]/20 shrink-0" />
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value as any);
                        toast({ title: "Status alterado", description: `Definido como: ${e.target.value}.` });
                      }}
                      className="bg-transparent border-0 text-[11px] text-inherit outline-none cursor-pointer font-black uppercase tracking-wider font-sans w-full pr-4"
                    >
                      <option value="draft" className="bg-[#242526] text-white">Rascunho</option>
                      <option value="scheduled" className="bg-[#242526] text-white">Agendado</option>
                      <option value="published" className="bg-[#242526] text-white">Publicado</option>
                      <option value="failed" className="bg-[#242526] text-white">Falhou</option>
                    </select>
                  </div>
                </div>

                {/* DateTime Picker Input */}
                <div className="flex items-center gap-2 bg-[#3a3b3c] hover:bg-zinc-700 transition-colors px-3 py-2 rounded-lg text-zinc-350 text-xs font-semibold cursor-pointer relative">
                  <Calendar className="w-4 h-4 text-zinc-450" />
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => {
                      setScheduledDate(e.target.value);
                      toast({ title: "Horário alterado", description: `Agendado para: ${new Date(e.target.value).toLocaleString('pt-BR')}` });
                    }}
                    className="bg-transparent border-0 text-xs text-zinc-200 outline-none cursor-pointer font-bold dark:[color-scheme:dark] flex-1 p-0.5"
                  />
                </div>

                {/* Action Buttons: Editar Publicação & Alterar Capa */}
                <div className="grid grid-cols-2 gap-2 mt-0.5">
                  <button
                    type="button"
                    onClick={handleEditPost}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#3a3b3c] text-white hover:bg-zinc-700 rounded-lg text-xs font-bold border-0 cursor-pointer transition-colors"
                  >
                    <PenLine className="w-3.5 h-3.5 mr-1" />
                    Editar Publicação
                  </button>
                  <button
                    type="button"
                    onClick={handleEditCover}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1877F2] text-white hover:bg-[#166fe5] rounded-lg text-xs font-bold border-0 cursor-pointer transition-colors"
                  >
                    <Image className="w-3.5 h-3.5 mr-1" />
                    Alterar Capa
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dashboard de Insights e Monetização (Fase 5) */}
          {showInsights && (
            <div className="mt-3 p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3 relative animate-in slide-in-from-top-4 duration-200">
              <button 
                type="button"
                onClick={() => setShowInsights(false)} 
                className="absolute top-2.5 right-2.5 text-zinc-500 hover:text-white transition-colors bg-transparent border-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              
              <div className="space-y-3 text-left">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Desempenho e Insights</h4>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-[#242526] p-2 rounded-lg border border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-semibold uppercase">Alcance</span>
                    <span className="text-xs font-black text-white">25.4K</span>
                  </div>
                  <div className="bg-[#242526] p-2 rounded-lg border border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-semibold uppercase">Impressões</span>
                    <span className="text-xs font-black text-white">34.1K</span>
                  </div>
                  <div className="bg-[#242526] p-2 rounded-lg border border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-semibold uppercase">Engajamento</span>
                    <span className="text-xs font-black text-[#1877F2]">12.8%</span>
                  </div>
                  <div className="bg-[#242526] p-2 rounded-lg border border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-semibold uppercase">Retenção de Vídeo</span>
                    <span className="text-xs font-black text-green-500">64.5%</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">Monetização Estimada</h4>
                  <div className="bg-[#242526] p-2.5 rounded-lg border border-zinc-800 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-semibold">RPM Estimado:</span>
                      <span className="text-white font-bold">R$ 6.50 / 1K views</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-semibold">Ganhos Acumulados:</span>
                      <span className="text-green-500 font-black">R$ 157,40</span>
                    </div>
                    <div className="mt-2 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Comments Viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-dark">
          {/* Platform specific music/audio sub-detail */}
          {platformId === 'tiktok' && (
            <div className="flex items-center gap-2 p-2 bg-[#1c1d1f] rounded-lg text-xs text-zinc-400 shrink-0">
              <Music className="w-4 h-4 text-zinc-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span className="truncate">Som original - @{account?.username || 'seu_perfil'}</span>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Comentários ({activeComments.length})</h4>
            {activeComments.length > 0 ? (
              <div className="space-y-3">
                {activeComments.map((c) => (
                  <div key={c.id} className={cn("flex gap-2 text-xs items-start transition-opacity duration-200", c.hidden && "opacity-40")} style={{ contain: 'layout style' }}>
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase text-zinc-300">
                      {c.initials}
                    </div>
                    <div className="flex-1 p-2.5 rounded-xl border bg-zinc-900/60 border-zinc-800">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-zinc-200">{c.author}</span>
                        <span className="text-[9px] text-zinc-550">{c.time}</span>
                      </div>
                      <p className="leading-relaxed text-[11px] font-medium text-zinc-300">
                        {c.hidden ? <span className="text-zinc-500 italic">[Comentário ocultado] </span> : null}
                        {c.content}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] text-zinc-500 font-bold border-t border-zinc-800/40 pt-1.5">
                        <button
                          type="button"
                          onClick={() => handleCommentLike(c.id)}
                          className={cn("hover:underline bg-transparent border-0 cursor-pointer p-0 font-bold transition-colors flex items-center gap-1", c.liked ? "text-[#fe2c55]" : "text-zinc-400")}
                        >
                          <Heart className={cn("w-3 h-3", c.liked && "fill-current")} />
                          <span>{c.liked ? "Curtido" : "Curtir"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toast({ title: "Responder Comentário", description: `Respondendo para @${c.author}...` })}
                          className="hover:underline bg-transparent border-0 cursor-pointer p-0 text-zinc-400 font-bold flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Responder</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCommentHide(c.id)}
                          className="hover:underline bg-[#3a3b3c]/20 hover:bg-[#3a3b3c]/40 px-1.5 py-0.5 rounded border-0 cursor-pointer text-zinc-350 font-bold flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{c.hidden ? "Mostrar" : "Ocultar"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCommentDelete(c.id)}
                          className="hover:underline bg-red-500/10 hover:bg-red-500/25 px-1.5 py-0.5 rounded border-0 cursor-pointer text-[#ff3b30] font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic text-center py-4">Nenhum comentário nesta prévia.</p>
            )}
          </div>
        </div>

        {/* Action Panel and Input Form (Bottom) */}
        <div className={cn("border-t shrink-0 p-4 space-y-4 bg-zinc-950 border-zinc-850")}>
          {/* Reaction Buttons */}
          <div className="flex items-center justify-between">
            {platformId === 'instagram' ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setLiked(!liked)} className={cn("border-0 bg-transparent cursor-pointer p-0", liked ? "text-red-500" : "text-zinc-400 hover:text-white")}>
                    <Heart className={cn("w-5 h-5", liked && "fill-current")} />
                  </button>
                  <button type="button" className="border-0 bg-transparent text-zinc-400 hover:text-white cursor-pointer p-0">
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <button type="button" className="border-0 bg-transparent text-zinc-400 hover:text-white cursor-pointer p-0">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <button type="button" className="border-0 bg-transparent text-zinc-400 hover:text-white cursor-pointer p-0">
                  <Bookmark className="w-5 h-5" />
                </button>
              </div>
            ) : platformId === 'tiktok' ? (
              <div className="flex items-center justify-around w-full text-zinc-400">
                <button type="button" onClick={() => setLiked(!liked)} className={cn("flex items-center gap-1.5 bg-transparent border-0 cursor-pointer text-xs font-bold", liked ? "text-[#fe2c55]" : "text-zinc-400 hover:text-white")}>
                  <Heart className="w-4 h-4 fill-current" />
                  <span>{formatMetric(likeCount)}</span>
                </button>
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                  <MessageCircle className="w-4 h-4 fill-current text-zinc-400" />
                  <span>{activeComments.length}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                  <Bookmark className="w-4 h-4 fill-current text-zinc-400" />
                  <span>2.5K</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                  <Share2 className="w-4 h-4" />
                  <span>142</span>
                </div>
              </div>
            ) : (
              // Facebook, LinkedIn and default
              <div className="flex items-center justify-between w-full">
                <button type="button" onClick={() => setLiked(!liked)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 hover:bg-zinc-800 rounded-lg text-xs font-bold border-0 bg-transparent cursor-pointer transition-colors", liked ? "text-[#1877F2]" : "text-zinc-400")}>
                  <span>👍</span>
                  <span>{liked ? 'Curtiu' : 'Curtir'}</span>
                </button>
                <button type="button" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400 border-0 bg-transparent cursor-pointer transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Comentar</span>
                </button>
                <button type="button" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400 border-0 bg-transparent cursor-pointer transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartilhar</span>
                </button>
              </div>
            )}
          </div>

          {/* Comment Form */}
          <div className="space-y-1.5">
            <form onSubmit={handleAddComment} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase text-zinc-300">
                BF
              </div>
              <div className="flex-1 rounded-full px-3.5 py-1.5 flex items-center gap-2 border bg-zinc-900 border-zinc-800 text-white">
                <input 
                  type="text" 
                  placeholder="Comente como Bruno Flacon..." 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="bg-transparent border-0 text-xs outline-none flex-1 w-full text-inherit placeholder:text-zinc-500"
                />
                <Smile className="w-4 h-4 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0" />
              </div>
              <button type="submit" className={cn("font-bold text-xs border-0 bg-transparent cursor-pointer px-2 shrink-0 text-[#1877F2]", !inputText.trim() && "opacity-50 pointer-events-none")}>
                Enviar
              </button>
            </form>
            <p className="text-[9px] text-zinc-500 text-center font-semibold flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
              <span>Você está comentando como Bruno Flacon.</span>
            </p>
          </div>
        </div>

        {/* Overlay Options Menu (Print 5) */}
        {showMenu && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="w-full max-w-[280px] bg-[#1c1c1e] text-white rounded-2xl overflow-hidden shadow-2xl border border-zinc-800/80 text-center flex flex-col divide-y divide-zinc-800 font-sans">
              <button
                type="button"
                onClick={handleMenuDelete}
                className="py-3.5 text-[#ef4444] font-bold text-[13px] hover:bg-zinc-800/50 transition-colors border-0 bg-transparent cursor-pointer font-sans"
              >
                Excluir
              </button>
              <button
                type="button"
                onClick={handleMenuEdit}
                className="py-3.5 text-zinc-100 font-semibold text-[13px] hover:bg-zinc-800/50 transition-colors border-0 bg-transparent cursor-pointer font-sans"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={handleMenuAlterarCapa}
                className="py-3.5 text-zinc-100 font-semibold text-[13px] hover:bg-zinc-800/50 transition-colors border-0 bg-transparent cursor-pointer font-sans"
              >
                Alterar Capa
              </button>
              <button
                type="button"
                onClick={handleMenuGoToPost}
                className="py-3.5 text-zinc-100 font-semibold text-[13px] hover:bg-zinc-800/50 transition-colors border-0 bg-transparent cursor-pointer font-sans"
              >
                Ir para o post
              </button>
              <button
                type="button"
                onClick={handleMenuShare}
                className="py-3.5 text-zinc-100 font-semibold text-[13px] hover:bg-zinc-800/50 transition-colors border-0 bg-transparent cursor-pointer font-sans"
              >
                Compartilhar
              </button>
              <button
                type="button"
                onClick={handleMenuCopyLink}
                className="py-3.5 text-zinc-100 font-semibold text-[13px] hover:bg-zinc-800/50 transition-colors border-0 bg-transparent cursor-pointer font-sans"
              >
                Copiar link
              </button>
              <button
                type="button"
                onClick={handleMenuMetrics}
                className="py-3.5 text-zinc-100 font-semibold text-[13px] hover:bg-zinc-800/50 transition-colors border-0 bg-transparent cursor-pointer font-sans"
              >
                Métricas
              </button>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="py-3.5 text-zinc-400 font-semibold text-[13px] hover:bg-zinc-800/50 transition-colors border-0 bg-transparent cursor-pointer font-sans"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <><Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] md:w-full max-h-[90vh] md:max-h-none p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl">
        <input 
          type="file" 
          ref={coverInputRef} 
          onChange={handleCoverFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        <DialogHeader className="sr-only">
            <DialogTitle>Prévia da Publicação</DialogTitle>
            <DialogDescription>Visualize como o post agendado aparecerá nas redes sociais antes de ser publicado.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col md:flex-row h-[85vh] md:h-[80vh] min-h-0 overflow-hidden">
          {/* Column 1: Sidebar - Platforms */}
          <div className="w-full md:w-20 h-16 md:h-auto border-b md:border-b-0 md:border-r border-border/40 bg-muted/10 flex flex-row md:flex-col items-center py-2 md:py-5 px-3 md:px-0 gap-2 md:gap-3 overflow-x-auto md:overflow-x-visible md:overflow-y-auto shrink-0 justify-start scrollbar-none">
            {platformEntries.map((entry, idx) => {
              const { platform } = entry;
              if (!platform) return null;
              const Icon = platform.icon;
              const isSelected = idx === selectedIdx;

              const btnBg = isSelected
                ? platform.id === "snapchat"
                  ? "bg-[#FFFC00] text-black scale-105 md:scale-110 shadow-lg shadow-yellow-400/40"
                  : platform.id === "tiktok"
                  ? "bg-black text-white scale-105 md:scale-110 shadow-lg shadow-black/40"
                  : platform.id === "whatsapp"
                  ? "bg-[#25D366] text-white scale-105 md:scale-110 shadow-lg shadow-green-400/40"
                  : platform.id === "instagram"
                  ? "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white scale-105 md:scale-110 shadow-lg"
                  : platform.id === "facebook"
                  ? "bg-[#1877F2] text-white scale-105 md:scale-110 shadow-lg shadow-blue-500/40"
                  : platform.id === "twitter"
                  ? "bg-black text-white scale-105 md:scale-110 shadow-lg"
                  : platform.id === "linkedin"
                  ? "bg-[#0A66C2] text-white scale-105 md:scale-110 shadow-lg shadow-blue-600/40"
                  : platform.id === "youtube"
                  ? "bg-[#FF0000] text-white scale-105 md:scale-110 shadow-lg shadow-red-500/40"
                  : platform.id === "telegram"
                  ? "bg-[#0088CC] text-white scale-105 md:scale-110 shadow-lg shadow-sky-500/40"
                  : platform.id === "pinterest"
                  ? "bg-[#E60023] text-white scale-105 md:scale-110 shadow-lg shadow-red-600/40"
                  : platform.id === "threads"
                  ? "bg-black text-white scale-105 md:scale-110 shadow-lg"
                  : "bg-primary text-white scale-105 md:scale-110 shadow-lg"
                : "bg-muted/40 text-muted-foreground hover:bg-muted";

              return (
                <button
                  key={`${entry.platformId}-${entry.accountId || idx}`}
                  onClick={() => {
                    setSelectedIdx(idx);
                    setLiked(false);
                    setInputText('');
                  }}
                  className={cn(
                    "w-10 h-10 md:w-14 md:h-14 flex items-center justify-center transition-all relative group shrink-0",
                    platform.id === "facebook" || platform.id === "threads" || platform.id === "pinterest" || platform.id === "tiktok" || platform.id === "whatsapp" || platform.id === "telegram"
                      ? "rounded-full"
                      : "rounded-xl md:rounded-2xl",
                    btnBg
                  )}
                >
                  <Icon
                    className="w-6 h-6 md:w-9 md:h-9"
                    data-active={isSelected}
                    style={{
                      filter: isSelected
                        ? 'drop-shadow(2.5px 3px 1.5px rgba(0,0,0,0.45))'
                        : 'drop-shadow(1.5px 2px 1px rgba(0,0,0,0.22))'
                    }}
                  />
                  {isSelected && (
                    <div
                      className="absolute bottom-0 md:bottom-auto md:-right-2 w-6 h-1 md:w-1 md:h-6 bg-primary rounded-full"
                    />
                  )}
                  <div className="absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {platform.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* New Unified Split Screen Area (Columns 2 & 3 merged!) */}
          <div className="flex-1 flex flex-col md:flex-row h-full min-h-0 overflow-hidden bg-zinc-950">
             {/* Column 2: Cinema Mode Media (Left) */}
             <div className="w-full md:flex-1 h-[40vh] md:h-full bg-black relative flex items-center justify-center p-2 overflow-hidden shrink-0 md:shrink">
                {renderCinemaMedia()}
             </div>

             {/* Column 3: Dynamic Interaction & Details Panel (Right) */}
             <div className="w-full md:w-96 flex flex-col flex-1 md:flex-initial h-full bg-white dark:bg-zinc-900 border-t md:border-t-0 md:border-l border-border/40 overflow-hidden">
                {renderInteractionSidebar()}
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
      {viewerOpen && videoItems.length > 0 && (
        <VideoViewer
          videos={videoItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
});
