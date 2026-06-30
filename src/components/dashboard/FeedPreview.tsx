import { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import {
  X, Instagram, Facebook, Twitter, Linkedin, MessageCircle, Play,
  Heart, MessageSquare, Share2, Bookmark, Send, MoreHorizontal,
  ChevronLeft, ChevronRight, CheckCircle2, Clock, Calendar,
  BarChart3, DollarSign, TrendingUp, Tv, Coins
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
      className="relative w-full h-full cursor-pointer block"
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
        poster={posterUrl || undefined}
        style={{ background: 'rgba(0,0,0,0.08)' }}
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
      className={cn("relative cursor-pointer w-full h-full overflow-hidden bg-black/5", className)}
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-cover"
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
      {/* Dots */}
      {count > 1 && (
        <div className={cn('flex justify-center gap-1 py-1.5', dotsClass)}>
          {validUrls.slice(0, 8).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Ir para imagem ${i + 1}`}
              className={cn(
                'rounded-full transition-all',
                i === idx
                  ? 'w-3 h-1.5 bg-blue-500'
                  : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90'
              )}
            />
          ))}
          {count > 8 && <span className="text-[9px] text-white/70 self-center">+{count - 8}</span>}
        </div>
      )}
    </div>
  );
});

interface FeedPreviewProps {
  post: ScheduledPost;
  isOpen: boolean;
  onClose: () => void;
}

function parsePlatform(pId: string): { platformId: string; accountId?: string } {
  const [platformId, accountId] = pId.split("|");
  return { platformId, accountId };
}

export const FeedPreview = memo(({ post, isOpen, onClose }: FeedPreviewProps) => {
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

  const [activeTab, setActiveTab] = useState<'details' | 'metrics'>('details');
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

  useEffect(() => {
    if (post.status !== 'published') {
      setActiveTab('details');
    }
  }, [post.status]);

  const { byPlatform } = useSocialStats();
  const { connections } = useSocialConnections();

  const getAccount = (entry: typeof platformEntries[number]) => {
    // 1. Se o post foi criado com accountId específico, busca essa conexão
    if (entry.accountId) {
      const conn = connections.find(c => c.id === entry.accountId);
      if (conn) {
        // Retorna um objeto compatível com SocialAccountStat usando dados da conexão
        return {
          id: conn.id,
          username: conn.page_name || conn.username || conn.platform,
          profile_picture: conn.profile_picture || conn.profile_image_url || null,
          followers_count: conn.followers_count ?? 0,
          posts_count: conn.posts_count ?? 0,
          platform: conn.platform,
        } as any;
      }
      // Tenta pelo platform_user_id no byPlatform
      const statAcc = byPlatform[entry.platformId]?.find(a => a.id === entry.accountId);
      if (statAcc) return statAcc;
    }
    // 2. Busca conexão marcada como is_primary para a plataforma
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
    // 3. Primeira conta da plataforma nos stats
    return byPlatform[entry.platformId]?.[0] || null;
  };

  const renderPreview = () => {
    if (!selectedEntry) return null;
    const account = getAccount(selectedEntry);
    const platformId = selectedEntry.platformId;

    switch (platformId) {
      case "instagram":
        return <InstagramPreview post={post} account={account} onVideoClick={handleOpenViewer} />;
      case "facebook":
        return <FacebookPreview post={post} account={account} onVideoClick={handleOpenViewer} />;
      case "twitter":
      case "x" as any:
        return <XPreview post={post} account={account} onVideoClick={handleOpenViewer} />;
      case "threads":
        return <ThreadsPreview post={post} account={account} onVideoClick={handleOpenViewer} />;
      case "linkedin":
        return <LinkedInPreview post={post} account={account} onVideoClick={handleOpenViewer} />;
      case "whatsapp":
        return <WhatsAppPreview post={post} account={account} />;
      case "telegram":
        return <TelegramPreview post={post} account={account} />;
      case "tiktok":
        return <TikTokPreview post={post} account={account} />;
      case "youtube":
        return <YouTubePreview post={post} account={account} />;
      case "pinterest":
        return <PinterestPreview post={post} account={account} />;
      case "snapchat":
        return <SnapchatPreview post={post} account={account} />;
      case "site":
        return <WebsitePreview post={post} account={account} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-500 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
            <p>Visualização não disponível para esta plataforma.</p>
          </div>
        );
    }
  };

  return (
    <><Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl">
        <DialogHeader className="sr-only">
            <DialogTitle>Prévia da Publicação</DialogTitle>
            <DialogDescription>Visualize como o post agendado aparecerá nas redes sociais antes de ser publicado.</DialogDescription>
        </DialogHeader>
        <div className="flex h-[80vh]">
          {/* Sidebar - Platforms */}
          <div className="w-20 border-r border-border/40 bg-muted/10 flex flex-col items-center py-5 gap-3">
            {platformEntries.map((entry, idx) => {
              const { platform } = entry;
              if (!platform) return null;
              const Icon = platform.icon;
              const isSelected = idx === selectedIdx;

              const btnBg = isSelected
                ? platform.id === "snapchat"
                  ? "bg-[#FFFC00] text-black scale-110 shadow-lg shadow-yellow-400/40"
                  : platform.id === "tiktok"
                  ? "bg-black text-white scale-110 shadow-lg shadow-black/40"
                  : platform.id === "whatsapp"
                  ? "bg-[#25D366] text-white scale-110 shadow-lg shadow-green-400/40"
                  : platform.id === "instagram"
                  ? "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white scale-110 shadow-lg"
                  : platform.id === "facebook"
                  ? "bg-[#1877F2] text-white scale-110 shadow-lg shadow-blue-500/40"
                  : platform.id === "twitter"
                  ? "bg-black text-white scale-110 shadow-lg"
                  : platform.id === "linkedin"
                  ? "bg-[#0A66C2] text-white scale-110 shadow-lg shadow-blue-600/40"
                  : platform.id === "youtube"
                  ? "bg-[#FF0000] text-white scale-110 shadow-lg shadow-red-500/40"
                  : platform.id === "telegram"
                  ? "bg-[#0088CC] text-white scale-110 shadow-lg shadow-sky-500/40"
                  : platform.id === "pinterest"
                  ? "bg-[#E60023] text-white scale-110 shadow-lg shadow-red-600/40"
                  : platform.id === "threads"
                  ? "bg-black text-white scale-110 shadow-lg"
                  : "bg-primary text-white scale-110 shadow-lg"
                : "bg-muted/40 text-muted-foreground hover:bg-muted";

              return (
                <button
                  key={`${entry.platformId}-${entry.accountId || idx}`}
                  onClick={() => setSelectedIdx(idx)}
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative group",
                    btnBg
                  )}
                >
                  <Icon
                    className="w-9 h-9"
                    data-active={isSelected}
                    style={{
                      filter: isSelected
                        ? 'drop-shadow(2.5px 3px 1.5px rgba(0,0,0,0.45))'
                        : 'drop-shadow(1.5px 2px 1px rgba(0,0,0,0.22))'
                    }}
                  />
                  {isSelected && (
                    <div
                      className="absolute -right-2 w-1 h-6 bg-primary rounded-full"
                    />
                  )}
                  <div className="absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {platform.name}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Preview Area */}
          <div className="flex-1 overflow-y-auto bg-muted/5 flex items-center justify-center p-8">
            <div
              key={selectedEntry?.raw || selectedEntry?.platformId}
              className="w-full max-w-md shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
            >
              {renderPreview()}
            </div>
          </div>

          {/* Info Side Panel */}
          <div className="w-80 border-l border-border/40 p-6 hidden lg:block bg-muted/10 overflow-y-auto">
            {post.status === 'published' && (
              <div className="flex bg-muted/30 rounded-xl p-1 mb-6 border border-border/20">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={cn(
                    "flex-1 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer border-0",
                    activeTab === 'details'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground bg-transparent"
                  )}
                >
                  Detalhes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('metrics')}
                  className={cn(
                    "flex-1 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer border-0",
                    activeTab === 'metrics'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground bg-transparent"
                  )}
                >
                  Métricas
                </button>
              </div>
            )}

            {activeTab === 'details' ? (
              <div className="space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg mb-4">Detalhes do Post</h3>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", post.status === 'published' ? "bg-green-500" : "bg-yellow-500")} />
                    <span className="text-sm font-medium capitalize">{post.status}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Conteúdo Original</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agenda</p>
                  <p className="text-sm">
                    {post.published_at
                      ? `Publicado em: ${new Date(post.published_at).toLocaleString()}`
                      : post.scheduled_at
                      ? `Agendado para: ${new Date(post.scheduled_at).toLocaleString()}`
                      : "Publicação Imediata"}
                  </p>
                </div>

                {post.media_urls && post.media_urls.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Mídias ({post.media_urls.length})
                      {post.media_type === 'carousel' && <span className="ml-1 text-primary">• Carrossel</span>}
                    </p>
                    {post.media_urls.length > 1 ? (
                      <SidebarCarousel urls={post.media_urls.filter((u): u is string => !!u)} posterUrl={post.thumbnail_url} />
                    ) : (
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/50 relative">
                        {isVideoUrl(post.media_urls[0]) ? (
                          <video
                            src={post.media_urls[0]}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            poster={post.thumbnail_url || undefined}
                          />
                        ) : (
                          <SafeImage src={post.media_urls[0]} className="w-full h-full object-cover" />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <h3 className="font-display font-bold text-base">Desempenho Geral</h3>
                </div>
                
                {/* Visual Chart Comparison */}
                {post.platform_metrics && post.platform_metrics.length > 0 ? (
                  <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-2">Visualizações por Canal</span>
                    <div className="space-y-3">
                      {post.platform_metrics.map((m) => {
                        const platform = socialPlatforms.find(sp => sp.id === m.platform);
                        const totalViews = post.platform_metrics?.reduce((sum, item) => sum + (item.views || 0), 0) || 1;
                        const percent = Math.round(((m.views || 0) / totalViews) * 100);
                        return (
                          <div key={`${m.platform}-${m.social_account_id}`} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="capitalize">{platform?.name || m.platform}</span>
                              <span className="text-muted-foreground">{(m.views || 0).toLocaleString('pt-BR')} ({percent}%)</span>
                            </div>
                            <div className="w-full bg-muted/40 h-2 rounded-full overflow-hidden">
                              <div className={cn("h-full", platform?.color || "bg-primary")} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground p-4 bg-muted/20 border border-border/40 rounded-xl text-center">
                    Aguardando sincronização de dados das plataformas.
                  </div>
                )}

                {/* Per Platform Metrics breakdown */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Detalhado por Rede e Perfil</h4>
                  {post.platform_metrics?.map((m) => {
                    const platform = socialPlatforms.find(sp => sp.id === m.platform);
                    const account = connections.find(c => c.id === m.social_account_id || c.platform === m.platform);
                    const Icon = platform?.icon || BarChart3;

                    // Compute monetization and watch details
                    const earnings = m.earnings || 0;
                    const adRevenue = m.ad_revenue || 0;
                    const totalProfit = earnings + adRevenue;
                    const watchTime = m.breakdown?.watch_time || m.breakdown?.watchTime || "0h";
                    const engRate = m.breakdown?.engagement_rate || m.breakdown?.engagementRate || 
                      (m.reach > 0 ? ((m.likes + m.comments + m.shares) / m.reach * 100).toFixed(1) + "%" : "0.0%");

                    return (
                      <div key={`${m.platform}-${m.social_account_id}`} className="bg-card border border-border/50 rounded-2xl p-4 space-y-4 shadow-sm hover:border-primary/20 transition-all">
                        {/* Header Account */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white", platform?.color || "bg-primary")}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold leading-none">{account?.page_name || account?.username || platform?.name || m.platform}</span>
                              <span className="text-[9px] text-muted-foreground mt-0.5">@{account?.username || 'canal'}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">Ativo</span>
                        </div>

                        {/* Basic Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold">Curtidas</span>
                            <span className="text-xs font-black">{(m.likes || 0).toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold">Comentários</span>
                            <span className="text-xs font-black">{(m.comments || 0).toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold">Compartilhados</span>
                            <span className="text-xs font-black">{(m.shares || 0).toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold">Visualizações</span>
                            <span className="text-xs font-black">{(m.views || 0).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>

                        {/* Advanced Stats Section */}
                        <div className="space-y-2 pt-3 border-t border-border/40">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                              <span>Engajamento</span>
                            </div>
                            <span className="font-bold">{engRate}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="w-3.5 h-3.5 text-sky-500" />
                              <span>Tempo Assistido</span>
                            </div>
                            <span className="font-bold">{watchTime}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                              <span>Monetização</span>
                            </div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {totalProfit > 0 ? `R$ ${totalProfit.toFixed(2)}` : "R$ 0,00"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

/* Mini carousel for sidebar — reutiliza SlideCarousel com dots escuros */
const SidebarCarousel = memo(({ urls, posterUrl }: { urls: string[]; posterUrl?: string | null }) => {
  return (
    <div className="rounded-lg overflow-hidden bg-muted border border-border/50">
      <SlideCarousel
        urls={urls}
        aspectClass="aspect-square"
        dotsClass="bg-muted/80"
        posterUrl={posterUrl}
      />
    </div>
  );
});

/* Platform Specific Mini-Previews */

const InstagramPreview = memo(({ post, account, onVideoClick }: { post: ScheduledPost, account?: SocialAccountStat, onVideoClick?: (url: string) => void }) => {
  const isStory = post.media_type === 'story';
  const hasMedia = (post.media_urls?.length ?? 0) > 0;
  const dateInfo = formatPostDate(post);
  const isPublished = post.status === 'published';
  const m = post.metrics;
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  // Se publicado, likes reais + toggle local
  const likeCount = m ? (liked ? m.likes + 1 : m.likes) : (liked ? 1 : 0);

  const avatarRing = isStory
    ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px]'
    : 'bg-transparent p-[1.5px]';

  return (
    <div className="flex flex-col bg-white text-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-full overflow-hidden', avatarRing)}>
            <div className="w-full h-full rounded-full bg-white p-[1.5px] overflow-hidden">
              {account?.profile_picture ? (
                <img src={account.profile_picture} alt={account.username || 'perfil'}
                  className="w-full h-full object-cover rounded-full" width={32} height={32} loading="eager" decoding="async" />
              ) : <div className="w-full h-full rounded-full bg-zinc-200" />}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-zinc-900">{account?.username || 'seu_perfil'}</span>
            {isVerified && <VerifiedBadge className="w-3.5 h-3.5 text-[#0095f6]" />}
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-zinc-500" />
      </div>

      {/* Media */}
      <div className="relative bg-zinc-100" style={{ contain: 'paint layout' }}>
        {hasMedia ? (
          <SlideCarousel urls={post.media_urls ?? []} aspectClass={isStory ? "aspect-[9/16]" : "aspect-square"}
            dotsClass="absolute bottom-0 left-0 right-0 bg-transparent pb-1" onVideoClick={onVideoClick}
            posterUrl={post.thumbnail_url} />
        ) : (
          <div className="aspect-square flex items-center justify-center"><Instagram className="w-12 h-12 text-zinc-300" /></div>
        )}
      </div>

      {/* Action bar */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setLiked(l => !l)}
              className="group flex items-center gap-1.5 transition-transform active:scale-125">
              <Heart className={cn('w-6 h-6 transition-colors', liked ? 'fill-red-500 text-red-500' : 'text-zinc-900')} />
            </button>
            <button type="button" className="text-zinc-900 hover:text-zinc-500 transition-colors">
              <MessageCircle className="w-6 h-6" />
            </button>
            <button type="button" className="text-zinc-900 hover:text-zinc-500 transition-colors">
              <Send className="w-6 h-6" />
            </button>
          </div>
          <button type="button" onClick={() => setSaved(s => !s)}>
            <Bookmark className={cn('w-6 h-6 transition-colors', saved ? 'fill-zinc-900 text-zinc-900' : 'text-zinc-900')} />
          </button>
        </div>

        {/* Likes count */}
        {(isPublished || liked) && (
          <p className="text-sm font-bold text-zinc-900 mb-0.5">
            {formatMetric(likeCount)} curtida{likeCount !== 1 ? 's' : ''}
          </p>
        )}

        {/* Caption + stats */}
        <div className="space-y-0.5">
          <p className="text-sm leading-snug">
            <span className="font-bold mr-2 text-zinc-900">{account?.username || 'seu_perfil'}</span>
            <span className="text-zinc-800">{post.content}</span>
          </p>
          {isPublished && m && m.comments > 0 && (
            <button type="button" className="text-xs text-zinc-400 hover:text-zinc-600">
              Ver todos os {formatMetric(m.comments)} comentários
            </button>
          )}
          <div className="flex items-center gap-1 mt-0.5">
            {dateInfo.icon === 'published' && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
            {dateInfo.icon === 'scheduled' && <Clock className="w-3 h-3 text-blue-500 shrink-0" />}
            <p className={cn('text-[10px] font-medium uppercase',
              dateInfo.icon === 'published' ? 'text-green-600' :
              dateInfo.icon === 'scheduled' ? 'text-blue-500' : 'text-zinc-400'
            )}>{dateInfo.label}</p>
            {isPublished && m && m.views > 0 && (
              <span className="text-[10px] text-zinc-400 ml-2">• {formatMetric(m.views)} views</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const FacebookPreview = memo(({ post, account, onVideoClick }: { post: ScheduledPost, account?: SocialAccountStat, onVideoClick?: (url: string) => void }) => {
  const isStory = post.media_type === 'story';
  const hasMedia = (post.media_urls?.length ?? 0) > 0;
  const dateInfo = formatPostDate(post);
  const isPublished = post.status === 'published';
  const m = post.metrics;
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);

  const [liked, setLiked] = useState(false);
  const likeCount = m ? (liked ? m.likes + 1 : m.likes) : (liked ? 1 : 0);

  return (
    <div className="flex flex-col bg-white text-zinc-900">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn('w-10 h-10 rounded-full overflow-hidden flex-shrink-0',
            isStory ? 'ring-2 ring-offset-1 ring-[#1877F2]' : 'bg-zinc-100 border border-zinc-200'
          )}>
            {account?.profile_picture ? (
              <img src={account.profile_picture} alt={account.username || 'perfil'}
                className="w-full h-full object-cover" width={40} height={40} loading="eager" decoding="async" />
            ) : <div className="w-full h-full bg-zinc-200" />}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold text-zinc-900">{account?.username || 'Sua Página'}</p>
              {isVerified && <VerifiedBadge className="w-3.5 h-3.5 text-[#1877F2]" />}
            </div>
            <div className="flex items-center gap-1">
              {dateInfo.icon === 'published' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
              {dateInfo.icon === 'scheduled' && <Clock className="w-3.5 h-3.5 text-blue-500" />}
              <p className={cn('text-[10px] font-medium',
                dateInfo.icon === 'published' ? 'text-green-600' :
                dateInfo.icon === 'scheduled' ? 'text-blue-500' : 'text-zinc-500'
              )}>{dateInfo.label}</p>
              <span className="text-zinc-400 text-[10px]">·</span>
              <svg viewBox="0 0 16 16" className="w-3 h-3 text-zinc-500 fill-current">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0z" opacity="0.15"/>
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM2 8a6 6 0 1112 0A6 6 0 012 8z"/>
              </svg>
            </div>
          </div>
        </div>
        <p className="text-sm mb-3 whitespace-pre-wrap text-zinc-800 leading-relaxed">{post.content}</p>
      </div>
      <div className="border-y border-zinc-100" style={{ contain: 'paint layout' }}>
        {hasMedia ? (
          <SlideCarousel urls={post.media_urls ?? []} aspectClass={isStory ? "aspect-[9/16]" : "aspect-[1.91/1]"}
            dotsClass="absolute bottom-0 left-0 right-0 bg-transparent pb-1" onVideoClick={onVideoClick}
            posterUrl={post.thumbnail_url} />
        ) : (
          <div className="aspect-[1.91/1] flex items-center justify-center opacity-10">
            <Facebook className="w-16 h-16" />
          </div>
        )}
      </div>

      {/* Contador de reações FB */}
      {(isPublished && m && (m.likes > 0 || m.comments > 0)) && (
        <div className="px-3 pt-2 pb-1 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1">
            <span className="text-base">👍❤️😮</span>
            <span>{formatMetric(likeCount)}</span>
          </div>
          <div className="flex items-center gap-2">
            {m.comments > 0 && <span>{formatMetric(m.comments)} coment.</span>}
            {m.shares > 0 && <span>{formatMetric(m.shares)} compart.</span>}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-1.5 py-1 flex items-center border-t border-zinc-100">
        <button type="button" onClick={() => setLiked(l => !l)}
          className={cn('flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-semibold transition-colors',
            liked ? 'text-[#1877F2] bg-blue-50' : 'text-zinc-600 hover:bg-zinc-100'
          )}>
          <span className="text-base">{liked ? '👍' : '👍'}</span>
          <span>{liked ? 'Curtido' : 'Curtir'}</span>
        </button>
        <button type="button" className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
          <MessageSquare className="w-4 h-4" />
          <span>Comentar{isPublished && m && m.comments > 0 ? ` (${formatMetric(m.comments)})` : ''}</span>
        </button>
        <button type="button" className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
          <Share2 className="w-4 h-4" />
          <span>Compartilhar{isPublished && m && m.shares > 0 ? ` (${formatMetric(m.shares)})` : ''}</span>
        </button>
      </div>
    </div>
  );
});

const XPreview = memo(({ post, account, onVideoClick }: { post: ScheduledPost, account?: SocialAccountStat, onVideoClick?: (url: string) => void }) => {
  const dateInfo = formatPostDate(post);
  const isPublished = post.status === 'published';
  const m = post.metrics;
  const [liked, setLiked] = useState(false);
  const likeCount = m ? (liked ? m.likes + 1 : m.likes) : (liked ? 1 : 0);
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);

  return (
    <div className="flex flex-col p-4 bg-white text-zinc-900 border-zinc-200">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 shrink-0 overflow-hidden">
          {account?.profile_picture && <img src={account.profile_picture} alt={account.username || 'perfil'} className="w-full h-full object-cover" width={48} height={48} loading="eager" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="font-bold text-sm text-zinc-900">{account?.username || 'Perfil X'}</span>
            {(isVerified || !account) && <VerifiedBadge className="w-4 h-4 text-[#1d9bf0]" />}
            <span className="text-zinc-500 text-sm">@{account?.username?.toLowerCase().replace(/\s/g, '') || 'perfil_x'}
              {' · '}
              {dateInfo.icon === 'published' ? <span className="text-green-600">{dateInfo.label}</span>
                : dateInfo.icon === 'scheduled' ? <span className="text-blue-500">{dateInfo.label}</span>
                : 'agora'}
            </span>
          </div>
          <p className="text-sm mb-3 whitespace-pre-wrap leading-normal text-zinc-900">{post.content}</p>
          {(post.media_urls?.length ?? 0) > 0 && (
            <div className="rounded-2xl overflow-hidden border border-zinc-200 mb-3" style={{ contain: 'paint layout' }}>
              <SlideCarousel urls={post.media_urls ?? []} aspectClass="aspect-video" onVideoClick={onVideoClick} />
            </div>
          )}
          {/* Metrics bar */}
          <div className="flex items-center justify-between text-zinc-500 border-t border-zinc-100 pt-2 mt-1">
            <button type="button" className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{isPublished && m ? formatMetric(m.comments) : '0'}</span>
            </button>
            <button type="button" className="flex items-center gap-1.5 hover:text-green-500 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">{isPublished && m ? formatMetric(m.shares) : '0'}</span>
            </button>
            <button type="button" onClick={() => setLiked(l => !l)}
              className={cn('flex items-center gap-1.5 transition-colors', liked ? 'text-pink-500' : 'hover:text-pink-500')}>
              <Heart className={cn('w-4 h-4', liked && 'fill-pink-500')} />
              <span className="text-xs">{formatMetric(likeCount)}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"/></svg>
              <span className="text-xs">{isPublished && m ? formatMetric(m.views) : '—'}</span>
            </div>
            <button type="button" className="hover:text-blue-500 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

const ThreadsPreview = memo(({ post, account, onVideoClick }: { post: ScheduledPost, account?: SocialAccountStat, onVideoClick?: (url: string) => void }) => {
  const dateInfo = formatPostDate(post);
  const isPublished = post.status === 'published';
  const m = post.metrics;
  const [liked, setLiked] = useState(false);
  const likeCount = m ? (liked ? m.likes + 1 : m.likes) : (liked ? 1 : 0);
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);

  return (
    <div className="flex flex-col bg-black text-white min-h-[400px]">
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
        <div className="w-9 h-9 rounded-full bg-zinc-700 overflow-hidden">
          {account?.profile_picture && <img src={account.profile_picture} alt={account.username || 'perfil'} className="w-full h-full object-cover" width={36} height={36} loading="eager" />}
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bold text-sm">{account?.username || 'seu_perfil'}</span>
          {isVerified && <VerifiedBadge className="w-3.5 h-3.5 text-[#0095f6]" />}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {dateInfo.icon === 'published' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
          {dateInfo.icon === 'scheduled' && <Clock className="w-3 h-3 text-blue-400" />}
          <span className={cn('text-xs',
            dateInfo.icon === 'published' ? 'text-green-400' :
            dateInfo.icon === 'scheduled' ? 'text-blue-400' : 'text-zinc-500'
          )}>{dateInfo.label}</span>
        </div>
      </div>
      <p className="text-sm px-4 py-3 whitespace-pre-wrap leading-relaxed">{post.content}</p>
      {(post.media_urls?.length ?? 0) > 0 && (
        <div className="bg-zinc-900 overflow-hidden" style={{ contain: 'paint layout' }}>
          <SlideCarousel urls={post.media_urls ?? []} aspectClass="aspect-square" onVideoClick={onVideoClick} />
        </div>
      )}
      <div className="flex items-center gap-5 px-4 py-3 text-zinc-400">
        <button type="button" onClick={() => setLiked(l => !l)}
          className="flex items-center gap-1.5 transition-colors group">
          <Heart className={cn('w-5 h-5 group-hover:text-pink-500', liked ? 'fill-pink-500 text-pink-500' : '')} />
          <span className="text-xs">{formatMetric(likeCount)}</span>
        </button>
        <button type="button" className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs">{isPublished && m ? formatMetric(m.comments) : '0'}</span>
        </button>
        <button type="button" className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
          <Send className="w-5 h-5" />
          <span className="text-xs">{isPublished && m ? formatMetric(m.shares) : '0'}</span>
        </button>
        <button type="button" className="ml-auto hover:text-blue-400 transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

const RefreshCw = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);

const LinkedInPreview = memo(({ post, account, onVideoClick }: { post: ScheduledPost, account?: SocialAccountStat, onVideoClick?: (url: string) => void }) => {
  const dateInfo = formatPostDate(post);
  const isPublished = post.status === 'published';
  const m = post.metrics;
  const [liked, setLiked] = useState(false);
  const likeCount = m ? (liked ? m.likes + 1 : m.likes) : (liked ? 1 : 0);
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);

  return (
    <div className="flex flex-col bg-white text-zinc-900 shadow-sm border border-zinc-200">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded bg-zinc-100 border border-zinc-200 shrink-0 overflow-hidden">
            {account?.profile_picture && <img src={account.profile_picture} alt={account.username || 'perfil'} className="w-full h-full object-cover" width={48} height={48} loading="eager" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold text-zinc-900">{account?.username || 'Seu Perfil Profissional'}</p>
              {isVerified && <VerifiedBadge className="w-3.5 h-3.5 text-[#0a66c2]" />}
            </div>
            <div className="flex items-center gap-1">
              {dateInfo.icon === 'published' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              {dateInfo.icon === 'scheduled' && <Clock className="w-3 h-3 text-blue-500" />}
              <p className={cn('text-[10px] leading-tight',
                dateInfo.icon === 'published' ? 'text-green-600' :
                dateInfo.icon === 'scheduled' ? 'text-blue-500' : 'text-zinc-500'
              )}>{dateInfo.label} · 🌐</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-zinc-800 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>
      </div>
      {(post.media_urls?.length ?? 0) > 0 && (
        <div className="border-y border-zinc-100" style={{ contain: 'paint layout' }}>
          <SlideCarousel urls={post.media_urls ?? []} aspectClass="aspect-[1.91/1]" onVideoClick={onVideoClick} />
        </div>
      )}
      {/* Reactions summary */}
      {isPublished && m && (m.likes > 0 || m.comments > 0) && (
        <div className="px-4 py-1.5 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-100">
          <div className="flex items-center gap-1">
            <span className="text-base">👍❤️💡</span>
            <span>{formatMetric(m.likes)}</span>
          </div>
          <div className="flex items-center gap-2">
            {m.comments > 0 && <span>{formatMetric(m.comments)} coment.</span>}
            {m.shares > 0 && <span>{formatMetric(m.shares)} compart.</span>}
            {m.views > 0 && <span>{formatMetric(m.views)} views</span>}
          </div>
        </div>
      )}
      <div className="p-1 px-3 flex items-center gap-1 border-t border-zinc-100">
        <button type="button" onClick={() => setLiked(l => !l)}
          className={cn('flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold h-10 px-2 rounded-md transition-colors',
            liked ? 'text-[#0A66C2] bg-blue-50' : 'text-zinc-600 hover:bg-zinc-100'
          )}>
          <ThumbsUp className="w-5 h-5" />
          <span>Gostei{isPublished && m && likeCount > 0 ? ` (${formatMetric(likeCount)})` : ''}</span>
        </button>
        <button type="button" className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold h-10 px-2 rounded-md text-zinc-600 hover:bg-zinc-100">
          <MessageSquare className="w-5 h-5" />
          <span>Comentar{isPublished && m && m.comments > 0 ? ` (${formatMetric(m.comments)})` : ''}</span>
        </button>
        <button type="button" className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold h-10 px-2 rounded-md text-zinc-600 hover:bg-zinc-100">
          <Share2 className="w-5 h-5" />
          <span>Compartilhar{isPublished && m && m.shares > 0 ? ` (${formatMetric(m.shares)})` : ''}</span>
        </button>
        <button type="button" className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold h-10 px-2 rounded-md text-zinc-600 hover:bg-zinc-100">
          <Send className="w-5 h-5" /><span>Enviar</span>
        </button>
      </div>
    </div>
  );
});

const ThumbsUp = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
);

const TelegramPreview = memo(({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => {
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);
  return (
    <div className="flex flex-col bg-[#54a9eb] h-full min-h-[400px] p-4 relative font-sans text-zinc-900">
      <div className="absolute top-0 left-0 right-0 h-12 bg-[#54a9eb] border-b border-white/10 flex items-center px-4 justify-between z-10">
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/10 overflow-hidden">
                {account?.profile_picture && <SafeImage src={account.profile_picture} alt={account.username || "perfil"} className="w-full h-full object-cover" />}
              </div>
              <div>
                  <div className="flex items-center gap-1">
                      <p className="text-white text-sm font-bold leading-tight">{account?.username || "Seu Canal/Grupo"}</p>
                      {isVerified && <VerifiedBadge className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <p className="text-white/70 text-[10px]">{account?.followers_count || 0} inscritos</p>
              </div>
          </div>
          <MoreHorizontal className="w-5 h-5 text-white" />
      </div>

      <div className="mt-12 max-w-[85%] bg-white rounded-xl overflow-hidden shadow-md self-start relative border-l-4 border-[#54a9eb] w-full">
        {post.media_urls?.[0] && (
          <div className="overflow-hidden w-full aspect-video">
            {isVideoUrl(post.media_urls[0]) ? (
              <PlayableVideo url={post.media_urls[0]} posterUrl={post.thumbnail_url} className="w-full h-full" />
            ) : (
              <SafeImage src={post.media_urls[0]} className="w-full h-auto object-cover max-h-[300px]" />
            )}
          </div>
        )}
        <div className="p-3">
          <p className="text-[0.9rem] leading-relaxed whitespace-pre-wrap text-zinc-800">{post.content}</p>
          <div className="flex justify-end items-center gap-1 mt-1">
            <span className="text-[10px] text-zinc-400 font-medium">{post.published_at ? new Date(post.published_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <span className="text-[#3c96d6] text-[10px]">✓✓</span>
          </div>
        </div>
      </div>
    </div>
  );
});

const WhatsAppPreview = memo(({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => {
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);
  return (
    <div className="flex flex-col bg-[#efeae2] h-full min-h-[400px] p-4 relative font-sans text-zinc-900">
      <div className="absolute top-0 left-0 right-0 h-14 bg-[#075e54] flex items-center px-4 justify-between z-10">
          <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-300 overflow-hidden">
                  {account?.profile_picture && <SafeImage src={account.profile_picture} alt={account.username || "perfil"} className="w-full h-full object-cover" />}
              </div>
              <div className="flex items-center gap-1">
                  <span className="text-white text-[0.95rem] font-medium">{account?.username || "Contato / Grupo"}</span>
                  {isVerified && <VerifiedBadge className="w-3.5 h-3.5 text-white" />}
              </div>
          </div>
          <div className="flex items-center gap-4 text-white">
              <div className="w-4 h-4 border-2 border-white rounded-sm opacity-70" />
              <MoreHorizontal className="w-5 h-5" />
          </div>
      </div>

      <div className="mt-14 max-w-[85%] bg-white rounded-lg p-2 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] self-start relative after:content-[''] after:absolute after:top-0 after:-left-2 after:w-0 after:h-0 after:border-t-[8px] after:border-t-white after:border-l-[8px] after:border-l-transparent w-full">
        {post.media_urls?.[0] && (
          <div className="rounded-md overflow-hidden mb-2 w-full aspect-video">
            {isVideoUrl(post.media_urls[0]) ? (
              <PlayableVideo url={post.media_urls[0]} posterUrl={post.thumbnail_url} className="w-full h-full" />
            ) : (
              <SafeImage src={post.media_urls[0]} className="w-full h-auto object-cover max-h-[300px]" />
            )}
          </div>
        )}
        <p className="text-[0.9rem] leading-relaxed whitespace-pre-wrap text-zinc-900 px-1">{post.content}</p>
        <div className="flex justify-end items-center gap-1 mt-1 px-1">
          <span className="text-[10px] text-zinc-400 leading-none">{post.published_at ? new Date(post.published_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          <span className="text-[#34b7f1] text-[12px] leading-none">✓✓</span>
        </div>
      </div>
    </div>
  );
});

const TikTokPreview = memo(({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => {
  const isPublished = post.status === 'published';
  const m = post.metrics;
  const [liked, setLiked] = useState(false);
  const likeCount = m ? (liked ? m.likes + 1 : m.likes) : (liked ? 1 : 0);
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);

  return (
    <div className="flex flex-col bg-black h-full min-h-[500px] relative font-sans overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-70 z-0">
        {post.media_urls?.[0] ? (
          isVideoUrl(post.media_urls[0]) ? (
            <video
              src={post.media_urls[0]}
              className="w-full h-full object-cover"
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : (
            <SafeImage src={post.media_urls[0]} className="w-full h-full object-cover" loading="eager" alt="bg" />
          )
        ) : <div className="text-white/10 italic">Video Preview</div>}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 flex flex-col justify-end p-4 z-10">
        <div className="flex items-end justify-between">
          <div className="flex-1 text-white pr-12">
            <div className="flex items-center gap-1 mb-2">
              <p className="font-bold text-sm">@{account?.username || 'seu_perfil'}</p>
              {isVerified && <VerifiedBadge className="w-3.5 h-3.5 text-[#20d5ec]" />}
            </div>
            <p className="text-xs leading-relaxed line-clamp-3 mb-2">{post.content}</p>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border border-white/50 rotate-45" />
              <span className="text-[10px] whitespace-nowrap">Som original - SocialHub Pro</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden mb-2 relative">
              {account?.profile_picture && <img src={account.profile_picture} className="w-full h-full object-cover" width={40} height={40} alt="profile" />}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#ff0050] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">+</div>
            </div>
            <button type="button" onClick={() => setLiked(l => !l)}
              className="flex flex-col items-center active:scale-125 transition-transform">
              <Heart className={cn('w-7 h-7', liked ? 'fill-[#ff0050] text-[#ff0050]' : 'fill-white text-white')} />
              <span className="text-[10px] font-bold">{isPublished && m ? formatMetric(likeCount) : liked ? '1' : '0'}</span>
            </button>
            <div className="flex flex-col items-center">
              <MessageCircle className="w-7 h-7 fill-white" />
              <span className="text-[10px] font-bold">{isPublished && m ? formatMetric(m.comments) : '0'}</span>
            </div>
            <div className="flex flex-col items-center">
              <Send className="w-7 h-7 fill-white -rotate-12" />
              <span className="text-[10px] font-bold">{isPublished && m ? formatMetric(m.shares) : '0'}</span>
            </div>
            {isPublished && m && m.views > 0 && (
              <div className="flex flex-col items-center">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                <span className="text-[10px] font-bold">{formatMetric(m.views)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const YouTubePreview = memo(({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => {
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);
  return (
    <div className="flex flex-col bg-white text-zinc-900 border-zinc-200 font-sans">
        <div className="aspect-video bg-zinc-100 overflow-hidden relative">
            {post.media_urls?.[0] ? (
              isVideoUrl(post.media_urls[0]) ? (
                <PlayableVideo url={post.media_urls[0]} posterUrl={post.thumbnail_url} className="w-full h-full rounded-none" />
              ) : (
                <SafeImage src={post.media_urls?.[0] ?? null} className="w-full h-full object-cover" />
              )
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white font-bold">Video Thumbnail</div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-medium">10:45</div>
        </div>
        <div className="p-3 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-100 shrink-0 border border-zinc-200 overflow-hidden">
                {account?.profile_picture && <SafeImage src={account.profile_picture} alt={account.username || "perfil"} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[0.95rem] leading-tight line-clamp-2 mb-1">{post.content.split('\n')[0] || "Sem título"}</h4>
                <div className="flex items-center gap-1 text-[0.75rem] text-zinc-500">
                    <span>{account?.username || "Seu Canal"}</span>
                    {isVerified && <VerifiedBadge className="w-3 h-3 text-zinc-400" />}
                    <span>• 0 visualizações • agora</span>
                </div>
                <div className="mt-2 text-xs text-zinc-600 line-clamp-2 leading-relaxed italic">{post.content}</div>
            </div>
            <MoreHorizontal className="w-5 h-5 text-zinc-400" />
        </div>
    </div>
  );
});

const PinterestPreview = memo(({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => {
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);
  return (
    <div className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm border border-zinc-100">
        <div className="relative aspect-[2/3] bg-zinc-50 overflow-hidden rounded-t-3xl">
            {post.media_urls?.[0] ? (
              isVideoUrl(post.media_urls[0]) ? (
                <PlayableVideo url={post.media_urls[0]} posterUrl={post.thumbnail_url} className="w-full h-full aspect-[2/3] rounded-none" />
              ) : (
                <SafeImage src={post.media_urls?.[0] ?? null} className="w-full h-full object-cover" />
              )
            ) : (
                <div className="aspect-[2/3] bg-zinc-50 flex items-center justify-center italic text-zinc-300">Pin Image</div>
            )}
            <div className="absolute top-4 right-4 bg-[#E60023] text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">Salvar</div>
        </div>
        <div className="p-4">
            <h4 className="font-bold text-lg mb-2 text-zinc-900">{post.content.split('\n')[0] || "Seu Pin"}</h4>
            <p className="text-sm text-zinc-600 mb-4 line-clamp-3">{post.content}</p>
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-200 overflow-hidden">
                    {account?.profile_picture && <SafeImage src={account.profile_picture} alt={account.username || "perfil"} className="w-full h-full object-cover" />}
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-zinc-900">{account?.username || "Seu Perfil"}</span>
                    {isVerified && <VerifiedBadge className="w-3.5 h-3.5 text-[#E60023]" />}
                </div>
            </div>
        </div>
    </div>
  );
});

const SnapchatPreview = memo(({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => {
  const isVerified = !!(account?.metadata?.is_verified || account?.metadata?.verified || account?.metadata?.verified_account || false);
  return (
    <div className="flex flex-col bg-[#FFFC00] h-full min-h-[500px] relative font-sans overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
            {post.media_urls?.[0] ? (
              isVideoUrl(post.media_urls[0]) ? (
                <PlayableVideo url={post.media_urls[0]} posterUrl={post.thumbnail_url} className="w-full h-full rounded-none" />
              ) : (
                <SafeImage src={post.media_urls?.[0] ?? null} className="w-full h-full object-cover" />
              )
            ) : (
                <div className="text-black/50 font-bold uppercase tracking-widest text-2xl rotate-45 opacity-10">Snap Preview</div>
            )}
        </div>

        <div className="absolute top-4 left-4 flex items-center gap-2 drop-shadow-md">
            <div className="w-10 h-10 rounded-full border-2 border-white bg-zinc-300 overflow-hidden">
                {account?.profile_picture && <SafeImage src={account.profile_picture} alt={account.username || "perfil"} className="w-full h-full object-cover" />}
            </div>
            <div className="text-white">
                <div className="flex items-center gap-1">
                    <p className="text-sm font-bold leading-none">{account?.username || "Perfil"}</p>
                    {isVerified && <VerifiedBadge className="w-3.5 h-3.5 text-yellow-400" />}
                </div>
                <p className="text-[10px] font-medium leading-none mt-1 uppercase">Agora</p>
            </div>
        </div>

        <div className="absolute bottom-10 left-0 right-0 p-6 flex flex-col items-center">
            <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 w-full max-w-[80%]">
                <p className="text-white text-center text-sm font-medium leading-normal">{post.content}</p>
            </div>
            <div className="mt-8 text-white flex flex-col items-center gap-1 drop-shadow-lg">
                <span className="text-[0.7rem] font-bold uppercase">Conversar</span>
                <span className="inline-block w-4 h-2 border-b-2 border-white rotate-180" />
            </div>
        </div>
    </div>
  );
});

const WebsitePreview = memo(({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
    <div className="flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-lg max-w-sm">
        <div className="bg-zinc-100 p-2 flex items-center gap-2 border-b border-zinc-200">
            <div className="flex gap-1.5 ml-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded h-6 border border-zinc-300 flex items-center px-2">
                <span className="text-[10px] text-zinc-400 overflow-hidden text-ellipsis whitespace-nowrap">socialhub.pro/artigo/nova-publicacao</span>
            </div>
        </div>
        <div className="p-0 border-b border-zinc-100">
            {post.media_urls?.[0] ? (
              isVideoUrl(post.media_urls[0]) ? (
                <PlayableVideo url={post.media_urls[0]} posterUrl={post.thumbnail_url} className="w-full h-48 rounded-none" />
              ) : (
                <SafeImage src={post.media_urls?.[0] ?? null} className="w-full h-48 object-cover" />
              )
            ) : (
                <div className="w-full h-48 bg-zinc-50 flex items-center justify-center text-zinc-300 italic">Post Image</div>
            )}
        </div>
        <div className="p-5">
            <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Destaque</div>
            <h4 className="font-display font-bold text-xl leading-tight text-zinc-900 mb-3">{post.content.split('\n')[0] || "Título Sugerido"}</h4>
            <p className="text-sm text-zinc-600 leading-relaxed line-clamp-4">{post.content}</p>
            <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Escrito por {account?.username || "Você"}</span>
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold px-4 rounded-full">Ler mais</Button>
            </div>
        </div>
    </div>
));
