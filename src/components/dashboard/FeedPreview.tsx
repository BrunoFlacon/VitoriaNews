import { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import {
  X,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Play,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Send,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Calendar,
  BarChart3,
  DollarSign,
  TrendingUp,
  Tv,
  Coins,
  Music,
  Trash2,
  Eye,
  Globe,
  Zap,
  Image,
  AlertTriangle,
  Smile,
  PenLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  socialPlatforms,
  SocialPlatformId,
} from "@/components/icons/platform-metadata";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScheduledPost } from "@/hooks/useScheduledPosts";
import { useSocialStats, SocialAccountStat } from "@/hooks/useSocialStats";
import { SafeImage } from "@/components/ui/SafeImage";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { VideoViewer } from "./VideoViewer";
import { useToast } from "@/hooks/use-toast";
import { getMediaUrl } from "@/utils/mediaUtils";
import {
  YouTubeCard,
  FacebookCard,
  InstagramCard,
  TikTokCard,
  LinkedInCard,
  XLikeCard,
  ThreadsCard,
  RedditCard,
  TelegramCard,
  WhatsAppCard,
  PinterestCard,
  WebsiteCard,
  RumbleCard,
} from "./PostPreview";

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".m4v",
  ".3gp",
  ".ogv",
]);

function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const path = new URL(url).pathname;
    const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
    return VIDEO_EXTENSIONS.has(ext);
  } catch {
    return url.match(/\.(mp4|webm|mov|avi|mkv|m4v|3gp|ogv)(\?|$)/i) !== null;
  }
}

function classifyPostMedia(
  urls: (string | null)[],
):
  | "text"
  | "audio"
  | "photo"
  | "video"
  | "image_carousel"
  | "video_carousel"
  | "mixed_carousel" {
  const valid = urls.filter((u): u is string => !!u);
  if (valid.length === 0) return "text";
  if (valid.length === 1) {
    const url = valid[0];
    if (isVideoUrl(url)) return "video";
    if (url.match(/\.(mp3|wav|ogg|aac|m4a|flac)(\?|$)/i) !== null)
      return "audio";
    return "photo";
  }
  const hasVideo = valid.some((u) => isVideoUrl(u));
  const hasImage = valid.some((u) => !isVideoUrl(u));
  if (hasVideo && hasImage) return "mixed_carousel";
  if (hasVideo) return "video_carousel";
  return "image_carousel";
}

/** Formata data/hora do post com indicadores visuais */
function formatPostDate(
  post: import("@/hooks/useScheduledPosts").ScheduledPost,
) {
  if (post.status === "published" && post.published_at) {
    return {
      label: new Date(post.published_at).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      icon: "published" as const,
    };
  }
  if (post.status === "scheduled" && post.scheduled_at) {
    return {
      label: new Date(post.scheduled_at).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      icon: "scheduled" as const,
    };
  }
  return { label: "Agora", icon: "draft" as const };
}

/** Formata número de métricas de forma compacta */
function formatMetric(n: number | undefined): string {
  if (!n || n === 0) return "0";
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

/** Selo de Verificação Universal */
const VerifiedBadge = memo(
  ({ className = "w-4 h-4 text-[#1d9bf0]" }: { className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "fill-current shrink-0 inline-block align-middle ml-1",
        className,
      )}
      aria-label="Conta verificada"
    >
      <path d="M22.5 12.5c0-1.58-.8-2.47-1.24-3.23.96-1.88.77-2.54.58-3.04-.31-.82-1.37-1.31-2.22-1.21-1.01.12-1.61-.31-2.4-1.01C15.65 2.62 14.61 2 13.51 2c-1.1 0-2.14.62-3.71 1.99-.79.7-1.39 1.13-2.4 1.01-.85-.1-1.91.39-2.22 1.21-.19-.5-.38 1.16.58 3.04-.44.76-1.24 1.65-1.24 3.23 0 1.58.8 2.47 1.24 3.23-.96 1.88-.77 2.54-.58 3.04.31.82 1.37 1.31 2.22 1.21 1.01-.12 1.61.31 2.4 1.01C11.35 21.38 12.39 22 13.51 22c1.1 0 2.14-.62 3.71-1.99.79-.7 1.39-1.13 2.4-1.01.85.1 1.91-.39 2.22-1.21.19-.5.38-1.16-.58-3.04.44-.76 1.24-1.65 1.24-3.23zM9.93 17.58l-3.78-3.78 1.41-1.41 2.37 2.37 6.47-6.47 1.41 1.41-7.88 7.88z" />
    </svg>
  ),
);

const SlideVideo = memo(
  ({
    url,
    isActive,
    posterUrl,
  }: {
    url: string;
    isActive: boolean;
    posterUrl?: string | null;
  }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;
      if (isActive) {
        el.muted = true;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    }, [isActive]);

    // URLs from post.media_urls are already resolved — avoid double-proxying
    const resolvedSrc = useMemo(() => {
      if (!url) return '';
      // If already an absolute URL (http/https/blob/data), use as-is
      if (/^(https?:\/\/|blob:|data:)/i.test(url)) return url;
      return getMediaUrl(url) || url;
    }, [url]);

    return (
      <div className="relative w-full h-full bg-zinc-950">
        <video
          ref={videoRef}
          src={resolvedSrc}
          className="w-full h-full object-contain"
          muted
          loop
          playsInline
          controls
          preload="metadata"
          poster={posterUrl || undefined}
          onPlay={(e) => {
            e.currentTarget.muted = false;
          }}
        />
      </div>
    );
  },
);

const PlayableVideo = memo(
  ({
    url,
    posterUrl,
    className,
  }: {
    url: string;
    posterUrl?: string | null;
    className?: string;
  }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      const el = videoRef.current;
      if (el) el.muted = true;
    }, []);

    // URLs from post.media_urls are already resolved — avoid double-proxying
    const resolvedSrc = useMemo(() => {
      if (!url) return '';
      if (/^(https?:\/\/|blob:|data:)/i.test(url)) return url;
      return getMediaUrl(url) || url;
    }, [url]);

    return (
      <div
        className={cn(
          "relative w-full h-full overflow-hidden bg-zinc-950",
          className,
        )}
      >
        <video
          ref={videoRef}
          src={resolvedSrc}
          className="w-full h-full object-contain"
          muted
          loop
          playsInline
          controls
          preload="metadata"
          poster={posterUrl || undefined}
          onPlay={(e) => {
            e.currentTarget.muted = false;
          }}
        />
      </div>
    );
  },
);

/** Carrossel com slide CSS — sem tela preta, sem reflow */
const SlideCarousel = memo(
  ({
    urls,
    aspectClass = "aspect-square",
    dotsClass = "",
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
    const validUrls = useMemo(
      () => urls.filter((u): u is string => !!u),
      [urls],
    );
    const count = validUrls.length;

    const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
    const next = useCallback(
      () => setIdx((i) => Math.min(count - 1, i + 1)),
      [count],
    );

    if (count === 0) return null;

    return (
      <div
        className="relative overflow-hidden group"
        style={{ contain: "paint layout" }}
      >
        <div className={aspectClass}>
          {/* Strip horizontal — todas as imagens ficam na DOM, slide via translateX */}
          <div
            className="flex h-full transition-transform duration-300 ease-out will-change-transform"
            style={{
              transform: `translateX(-${(idx * 100) / count}%)`,
              width: `${count * 100}%`,
            }}
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
                    className="w-full h-full object-contain"
                    loading="eager"
                    fetchPriority={i === 0 ? "high" : "low"}
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
                    dotIdx === idx
                      ? "bg-white scale-110 shadow-sm"
                      : "bg-white/40",
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
  },
);

interface FeedPreviewProps {
  post: ScheduledPost;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (post: ScheduledPost) => void;
  onDelete?: (id: string) => void;
}

function parsePlatform(pId: string): {
  platformId: string;
  accountId?: string;
} {
  const [platformId, accountId] = pId.split("|");
  return { platformId, accountId };
}

export const FeedPreview = memo(
  ({ post, isOpen, onClose, onEdit, onDelete }: FeedPreviewProps) => {
    const platformEntries = useMemo(
      () =>
        post.platforms
          .map((pId) => {
            const { platformId, accountId } = parsePlatform(pId);
            const platform = socialPlatforms.find((p) => p.id === platformId);
            return { raw: pId, platformId, accountId, platform };
          })
          .filter((p) => p.platform),
      [post.platforms],
    );

    const [selectedIdx, setSelectedIdx] = useState(0);
    const selectedEntry = platformEntries[selectedIdx] || platformEntries[0];

    // Local editable states
    const [visibility, setVisibility] = useState<
      "public" | "private" | "subscribers"
    >((post as any).visibility || "public");
    const [status, setStatus] = useState<ScheduledPost["status"]>(
      post.status || "draft",
    );
    const [scheduledDate, setScheduledDate] = useState<string>(
      post.scheduled_at ? post.scheduled_at.slice(0, 16) : "",
    );
    const [liked, setLiked] = useState(false);
    const [inputText, setInputText] = useState("");
    const [showMenu, setShowMenu] = useState(false);
    const [showTools, setShowTools] = useState(false);
    const [showInsights, setShowInsights] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isSlideshowActive, setIsSlideshowActive] = useState(false);
    const [localPosterUrl, setLocalPosterUrl] = useState<string | null>(
      post.thumbnail_url || null,
    );
    const coverInputRef = useRef<HTMLInputElement>(null);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    const videoItems = useMemo(() => {
      if (!post.media_urls) return [];
      return post.media_urls
        .filter((u): u is string => !!u && isVideoUrl(u))
        .map((url, idx) => ({
          id: `${post.id}-v${idx}`,
          title: post.content?.slice(0, 100) || "Vídeo",
          media_url: url,
          thumbnail_url: null,
          duration: null,
          views: post.metrics?.views ?? null,
          platform:
            post.media_type === "reel"
              ? "Instagram Reels"
              : post.media_type === "story"
                ? "Stories"
                : "Vídeo",
          created_at: post.created_at,
        }));
    }, [post]);

    const handleOpenViewer = useCallback(
      (url: string) => {
        const idx = videoItems.findIndex((v) => v.media_url === url);
        if (idx >= 0) {
          setViewerIndex(idx);
          setViewerOpen(true);
        }
      },
      [videoItems],
    );

    // Sync state with post props when modal opens
    useEffect(() => {
      if (isOpen) {
        // Pause all background videos
        document.querySelectorAll("video").forEach((v) => v.pause());

        setVisibility((post as any).visibility || "public");
        setStatus(post.status || "draft");
        setScheduledDate(
          post.scheduled_at ? post.scheduled_at.slice(0, 16) : "",
        );
        setLiked(false);
        setInputText("");
        setShowMenu(false);
        setShowTools(false);
        setShowInsights(false);
        setShowShareModal(false);
        setIsSlideshowActive(false);
        setLocalPosterUrl(post.thumbnail_url || null);
      }
    }, [isOpen, post]);

    // Pause background videos when viewer is opened
    useEffect(() => {
      if (viewerOpen) {
        // Pause videos in the background FeedPreview
        const backgroundVideos = document.querySelectorAll(
          ".media-wrapper video, .preview-card video",
        );
        backgroundVideos.forEach((v) => (v as HTMLVideoElement).pause());
      }
    }, [viewerOpen]);

    // Keyboard navigation for networks (ArrowLeft / ArrowRight)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (showMenu) return; // Skip if menu is open
        if (e.key === "ArrowLeft") {
          setSelectedIdx((prev) =>
            prev > 0 ? prev - 1 : platformEntries.length - 1,
          );
        } else if (e.key === "ArrowRight") {
          setSelectedIdx((prev) =>
            prev < platformEntries.length - 1 ? prev + 1 : 0,
          );
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [platformEntries.length, showMenu]);

    // Slideshow automatic cycle (every 5 seconds)
    useEffect(() => {
      if (!isSlideshowActive || platformEntries.length <= 1) return;
      const interval = setInterval(() => {
        setSelectedIdx((prev) =>
          prev < platformEntries.length - 1 ? prev + 1 : 0,
        );
      }, 5000);
      return () => clearInterval(interval);
    }, [isSlideshowActive, platformEntries.length]);

    // Initial comments by platform
    const [commentsByPlatform, setCommentsByPlatform] = useState<
      Record<
        string,
        {
          id: string;
          author: string;
          content: string;
          time: string;
          initials: string;
          liked?: boolean;
          hidden?: boolean;
        }[]
      >
    >({
      instagram: [
        {
          id: "ig-1",
          author: "andrefernandes",
          content: "Incrível ver essa vitória! 👏🏆",
          time: "12m",
          initials: "AF",
        },
        {
          id: "ig-2",
          author: "carmeloneto",
          content: "Trabalho fantástico da equipe.",
          time: "1h",
          initials: "CN",
        },
      ],
      facebook: [
        {
          id: "fb-1",
          author: "Ricardo De Freitas Marques",
          content:
            "Nessa altura do campeonato já limparam tudo para não encontrar nada",
          time: "16 sem",
          initials: "RI",
        },
        {
          id: "fb-2",
          author: "Lazaro Alves",
          content:
            "MENTIROSO O PRESIDENTE DA CPMI SO TRAS OS REQUERIMENTO QUE VCS DA DIREITA LEVAM ELES NAO VOTAM...",
          time: "16 sem",
          initials: "LA",
        },
      ],
      tiktok: [
        {
          id: "tk-1",
          author: "Roberto Santos",
          content: "Caramba, sensacional esse conteúdo! 🚀",
          time: "2h atrás",
          initials: "RS",
        },
        {
          id: "tk-2",
          author: "Mariana Lima",
          content: "Já salvei para aplicar hoje mesmo.",
          time: "4h atrás",
          initials: "ML",
        },
      ],
      linkedin: [
        {
          id: "li-1",
          author: "Carlos Menezes",
          content: "Muito relevante para o cenário de marketing digital.",
          time: "1d",
          initials: "CM",
        },
      ],
      whatsapp: [
        {
          id: "wa-1",
          author: "Grupo Vitória News",
          content: "Vídeo enviado no grupo da rádio.",
          time: "10:45",
          initials: "VN",
        },
      ],
      telegram: [
        {
          id: "tg-1",
          author: "Canal Oficial",
          content: "Confira a nossa nova transmissão.",
          time: "10:46",
          initials: "CO",
        },
      ],
      twitter: [
        {
          id: "tw-1",
          author: "br_social",
          content: "Parabéns, muito informativo! #VitóriaNews",
          time: "10m",
          initials: "BS",
        },
      ],
      threads: [
        {
          id: "th-1",
          author: "lucas_lima",
          content: "Excelente formato de publicação.",
          time: "5m",
          initials: "LL",
        },
      ],
      youtube: [
        {
          id: "yt-1",
          author: "Pedro Alvares",
          content: "Sempre acompanho as novidades por aqui, nota 10!",
          time: "3d atrás",
          initials: "PA",
        },
      ],
    });

    const { byPlatform } = useSocialStats();
    const { connections } = useSocialConnections();
    const { toast } = useToast();

    const getAccount = (entry: (typeof platformEntries)[number]) => {
      if (!entry) return null;

      // 📌 1º) Perfil REAL que publicou (published_posts.metadata.targetProfileId)
      if (post.status === "published" && post.published_details?.length) {
        const pd = post.published_details.find(
          (d) => d.platform === entry.platformId,
        );
        const realProfileId =
          pd?.metadata?.targetProfileId || pd?.metadata?.connectionId || null;
        if (realProfileId) {
          const realConn =
            connections.find((c) => c.id === realProfileId) ||
            connections.find((c) => c.platform_user_id === realProfileId) ||
            connections.find((c) => c.page_id === realProfileId);
          if (realConn) {
            return {
              id: realConn.id,
              username:
                realConn.page_name || realConn.username || realConn.platform,
              profile_picture:
                realConn.profile_picture || realConn.profile_image_url || null,
              followers_count: realConn.followers_count ?? 0,
              posts_count: realConn.posts_count ?? 0,
              platform: realConn.platform,
            } as any;
          }
        }
      }

      if (entry.accountId) {
        const conn = connections.find((c) => c.id === entry.accountId);
        if (conn) {
          return {
            id: conn.id,
            username: conn.page_name || conn.username || conn.platform,
            profile_picture:
              conn.profile_picture || conn.profile_image_url || null,
            followers_count: conn.followers_count ?? 0,
            posts_count: conn.posts_count ?? 0,
            platform: conn.platform,
          } as any;
        }
        const statAcc = byPlatform[entry.platformId]?.find(
          (a) => a.id === entry.accountId,
        );
        if (statAcc) return statAcc;
      }
      const primaryConn = connections.find(
        (c) =>
          c.platform === entry.platformId && c.is_connected && c.is_primary,
      );
      if (primaryConn) {
        return {
          id: primaryConn.id,
          username:
            primaryConn.page_name ||
            primaryConn.username ||
            primaryConn.platform,
          profile_picture:
            primaryConn.profile_picture ||
            primaryConn.profile_image_url ||
            null,
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
      const platformId = selectedEntry?.platformId || "facebook";
      const newComment = {
        id: `${platformId}-${Date.now()}`,
        author: "Bruno Flacon",
        content: inputText.trim(),
        time: "Agora",
        initials: "BF",
      };
      setCommentsByPlatform((prev) => ({
        ...prev,
        [platformId]: [...(prev[platformId] || []), newComment],
      }));
      setInputText("");
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
      setShowInsights((prev) => !prev);
    };

    // Comment Moderation Actions (Fase 4)
    const handleCommentLike = (commentId: string) => {
      const platformId = selectedEntry?.platformId || "facebook";
      setCommentsByPlatform((prev) => ({
        ...prev,
        [platformId]: prev[platformId].map((c) =>
          c.id === commentId ? { ...c, liked: !c.liked } : c,
        ),
      }));
      toast({
        title: "Curtida Processada",
        description: "Interação registrada com sucesso.",
      });
    };

    const handleCommentHide = (commentId: string) => {
      const platformId = selectedEntry?.platformId || "facebook";
      setCommentsByPlatform((prev) => ({
        ...prev,
        [platformId]: prev[platformId].map((c) =>
          c.id === commentId ? { ...c, hidden: !c.hidden } : c,
        ),
      }));
      toast({
        title: "Comentário Ocultado",
        description:
          "O status de visibilidade do comentário foi alterado nas APIs oficiais.",
      });
    };

    const handleCommentDelete = (commentId: string) => {
      const platformId = selectedEntry?.platformId || "facebook";
      // Optimistic delete
      setCommentsByPlatform((prev) => ({
        ...prev,
        [platformId]: prev[platformId].filter((c) => c.id !== commentId),
      }));
      toast({
        title: "Comentário Excluído",
        description:
          "O comentário ofensivo foi deletado da rede via API DELETE.",
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
      handleEditPost();
    };

    const handleMenuGoToPost = () => {
      setShowMenu(false);
      toast({
        title: "Ir para o post",
        description: "Redirecionando para a publicação original...",
      });
    };

    const getPostShareUrl = useCallback(() => {
      const baseDomain = "https://webradiovitoria.com.br";
      const pId = selectedEntry?.platformId || "facebook";
      const st = status || post.status || "draft";
      return `${baseDomain}/posts/${post.id}?platform=${encodeURIComponent(pId)}&status=${encodeURIComponent(st)}`;
    }, [post.id, post.status, selectedEntry, status]);

    const handleShare = useCallback(() => {
      setShowMenu(false);
      const shareUrl = getPostShareUrl();
      const shareTitle = post.content
        ? post.content.slice(0, 60) + "..."
        : "Publicação Web Rádio Vitória";
      const shareText = `${post.content || "Confira esta publicação no Web Rádio Vitória!"}`;

      if (typeof navigator !== "undefined" && (navigator as any).share) {
        (navigator as any)
          .share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          })
          .catch(() => {
            setShowShareModal(true);
          });
      } else {
        setShowShareModal(true);
      }
    }, [getPostShareUrl, post.content]);

    const handleMenuShare = useCallback(() => {
      handleShare();
    }, [handleShare]);

    const handleMenuCopyLink = useCallback(() => {
      setShowMenu(false);
      const shareUrl = getPostShareUrl();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(shareUrl)
          .then(() => {
            toast({
              title: "Link Copiado com Sucesso!",
              description: shareUrl,
            });
          })
          .catch(() => {
            toast({
              title: "Link da Publicação",
              description: shareUrl,
            });
          });
      } else {
        toast({
          title: "Link da Publicação",
          description: shareUrl,
        });
      }
    }, [getPostShareUrl, toast]);

    const handleMenuMetrics = () => {
      setShowMenu(false);
      handleShowMetrics();
    };

    const account = selectedEntry ? getAccount(selectedEntry) : null;
    const platformId = selectedEntry?.platformId || "facebook";
    const hasMedia = post.media_urls && post.media_urls.length > 0;
    const isVerified = !!(
      account?.metadata?.is_verified ||
      account?.metadata?.verified ||
      account?.metadata?.verified_account ||
      false
    );

    // Link real da publicação (published_posts.url)
    const publishedLink =
      post.published_details?.find((pd) => pd.url)?.url ||
      post.published_details?.[0]?.url ||
      null;

    const getAspectClass = () => {
      return "w-full h-full";
    };

    const activeComments = commentsByPlatform[platformId] || [];

    // Helper to format large numbers
    const formatMetric = (num: number) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
      if (num >= 1000) return (num / 1000).toFixed(1) + "K";
      return num.toString();
    };

    const likeCount = post.metrics?.likes
      ? liked
        ? post.metrics.likes + 1
        : post.metrics.likes
      : liked
        ? 1
        : 0;

    const renderCinemaMedia = () => {
      const props = {
        content: post.content || "",
        media:
          post.media_urls?.map((url) => ({
            file_url: url,
            file_type: isVideoUrl(url) ? "video" : "image",
          })) || [],
        authorName: account?.username || "Web Rádio Vitória",
        authorAvatar: account?.profile_picture,
        videoTitle: post.content?.split("\n")[0].substring(0, 50) || "",
        realMetrics: post.metrics,
        visibility: (post as any).visibility || "public",
        mediaType: post.media_type,
      };
      const isVertical =
        platformId === "tiktok" ||
        platformId === "instagram" ||
        post.media_type === "reel" ||
        post.media_type === "story" ||
        post.media_type === "short";
      const isHorizontal = platformId === "youtube" && !isVertical;
      const hasMedia = post.media_urls && post.media_urls.length > 0;

      const cardContainer = (CardComponent: React.ElementType) => {
        const isReelStyle = isVertical && hasMedia && (platformId === "tiktok" || platformId === "instagram" || platformId === "youtube");
        return (
          <div className={cn("w-full h-full overflow-y-auto flex justify-center bg-zinc-950 custom-scrollbar", isReelStyle ? "p-0" : "p-0 md:p-4")}>
            <div
              className={cn(
                "w-full my-auto designer-black-frame border border-white border-opacity-5 overflow-hidden shadow-2xl bg-black relative shrink-0",
                isReelStyle ? "rounded-none md:rounded-2xl aspect-[9/16] h-full max-h-full md:max-h-[85vh] max-w-[450px]" : "rounded-2xl",
                !isReelStyle && (isHorizontal ? "max-w-[900px]" : !hasMedia ? "max-w-[600px]" : "max-w-[450px]")
              )}
            >
              <CardComponent {...props} />
            </div>
          </div>
        );
      };

      switch (platformId) {
        case "facebook":
          return cardContainer(FacebookCard);
        case "instagram":
          return cardContainer(InstagramCard);
        case "youtube":
          return cardContainer(YouTubeCard);
        case "tiktok":
          return cardContainer(TikTokCard);
        case "linkedin":
          return cardContainer(LinkedInCard);
        case "twitter":
          return cardContainer(XLikeCard);
        case "threads":
          return cardContainer(ThreadsCard);
        case "reddit":
          return cardContainer(RedditCard);
        case "telegram":
          return cardContainer(TelegramCard);
        case "whatsapp":
          return cardContainer(WhatsAppCard);
        case "pinterest":
          return cardContainer(PinterestCard);
        case "website":
          return cardContainer(WebsiteCard);
        case "rumble":
          return cardContainer(RumbleCard);
        default:
          return cardContainer(FacebookCard);
      }
    };

    const renderInteractionSidebar = () => {
      // Determine platform-specific dark theme styles
      let containerBg = "bg-[#18191a]";
      let textColor = "text-[#e4e6eb]";
      let borderColor = "border-[#2f3032]";
      let accentBtnBg = "bg-[#1877F2] hover:bg-[#166fe5]";
      let secBtnBg = "bg-[#3a3b3c] hover:bg-zinc-750";

      if (platformId === "tiktok" || platformId === "threads") {
        containerBg = "bg-[#121212]";
        textColor = "text-zinc-100";
        borderColor = "border-zinc-850";
        accentBtnBg = "bg-[#fe2c55] hover:bg-[#e0224a]";
        secBtnBg = "bg-zinc-900 hover:bg-zinc-800";
      } else if (platformId === "instagram") {
        containerBg = "bg-[#000000]";
        textColor = "text-[#f5f5f5]";
        borderColor = "border-[#262626]";
        accentBtnBg = "bg-[#0095f6] hover:bg-[#1877f2]";
        secBtnBg = "bg-[#262626] hover:bg-[#363636]";
      } else if (platformId === "whatsapp") {
        containerBg = "bg-[#0b141a]";
        textColor = "text-[#e9edef]";
        borderColor = "border-[#222e35]";
        accentBtnBg = "bg-[#00a884] hover:bg-[#008f72]";
        secBtnBg = "bg-[#202c33] hover:bg-[#2a3942]";
      } else if (platformId === "telegram") {
        containerBg = "bg-[#0e1621]";
        textColor = "text-[#ffffff]";
        borderColor = "border-[#242f3d]";
        accentBtnBg = "bg-[#2f8819] hover:bg-[#256c13]";
        secBtnBg = "bg-[#182533] hover:bg-[#203143]";
      } else if (platformId === "youtube") {
        containerBg = "bg-[#0f0f0f]";
        textColor = "text-[#f1f1f1]";
        borderColor = "border-zinc-800";
        accentBtnBg = "bg-[#cc0000] hover:bg-[#990000]";
        secBtnBg = "bg-[#272727] hover:bg-[#3f3f3f]";
      } else if (platformId === "twitter") {
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
        <div
          className={cn(
            "flex flex-col h-full overflow-hidden text-left select-none relative",
            containerBg,
            textColor,
          )}
        >
          {/* Profile Header */}
          <div
            className={cn(
              "p-4 border-b shrink-0 flex flex-col gap-2",
              borderColor,
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-850 border border-zinc-700 shrink-0">
                  {account?.profile_picture ? (
                    <SafeImage
                      src={account.profile_picture}
                      alt="profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-700 flex items-center justify-center font-bold text-white uppercase text-xs">
                      {(account?.username || "U").substring(0, 2)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold truncate max-w-[140px]">
                      {platformId === "tiktok" || platformId === "instagram"
                        ? `@${account?.username || "seu_perfil"}`
                        : account?.username || "Web Rádio Vitória"}
                    </span>
                    {isVerified && (
                      <VerifiedBadge className="w-3 h-3 text-[#1877F2] dark:text-sky-400" />
                    )}
                  </div>
                  <span className="text-[9px] text-zinc-400 uppercase font-semibold truncate">
                    Publicado por {account?.username || "Web Rádio Vitória"}
                  </span>
                </div>
              </div>

              {/* Actions: Apenas botão de Seguir e 3 Pontos Verticais sem background */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold text-white border-0 cursor-pointer transition-colors shrink-0",
                    platformId === "facebook"
                      ? "bg-[#1877f2] hover:bg-[#166fe5]"
                      : platformId === "instagram"
                        ? "bg-[#0095f6] hover:bg-[#1877f2]"
                        : platformId === "tiktok"
                          ? "bg-[#fe2c55] hover:bg-[#e0224a]"
                          : "bg-zinc-800 hover:bg-zinc-750 text-zinc-200",
                  )}
                >
                  {platformId === "facebook" ? "+ Assinar" : "Seguir"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowMenu(true)}
                  className="p-1.5 rounded-full bg-transparent hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors border-0 cursor-pointer shrink-0"
                  title="Mais opções"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Date, Status and Metrics Bar */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1 px-0.5 border-t border-zinc-800/40 pt-2 shrink-0">
              <span className="truncate">
                {scheduledDate
                  ? new Date(scheduledDate).toLocaleString("pt-BR", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })
                  : "01 de julho de 2026 às 09:22"}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                    status === "published"
                      ? "bg-green-500/10 text-green-500 border border-green-500/20"
                      : status === "failed"
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : "bg-blue-500/10 text-blue-500 border border-blue-500/20",
                  )}
                >
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
                {status === "published" && publishedLink && (
                  <a
                    href={publishedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/15 text-green-400 hover:bg-green-500/25 text-[9px] font-black uppercase tracking-wider border-0 cursor-pointer transition-colors"
                    title="Abrir publicação na rede social"
                  >
                    <Eye className="w-3 h-3" />
                    Ver publicação
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Comments & Content Viewport (Barra de Rolagem para todo o texto e comentários) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-dark">
            {/* Post Description / Caption */}
            <div className="pb-3 border-b border-zinc-800/40">
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {post.content
                  ? post.content.split(" ").map((word, idx) => {
                      if (word.startsWith("#")) {
                        return (
                          <span
                            key={idx}
                            className="text-[#1877F2] hover:underline font-semibold cursor-pointer"
                          >
                            {word}{" "}
                          </span>
                        );
                      }
                      return word + " ";
                    })
                  : "Sem conteúdo de texto."}
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
                          toast({
                            title: "Visibilidade alterada",
                            description: `Definida como: ${e.target.value}.`,
                          });
                        }}
                        className="bg-transparent border-0 text-[11px] text-white outline-none cursor-pointer font-bold font-sans w-full pr-4"
                      >
                        <option
                          value="public"
                          className="bg-[#242526] text-white"
                        >
                          Público
                        </option>
                        <option
                          value="private"
                          className="bg-[#242526] text-white"
                        >
                          Privado
                        </option>
                        <option
                          value="subscribers"
                          className="bg-[#242526] text-white"
                        >
                          Assinantes
                        </option>
                      </select>
                    </div>

                    {/* Status Select */}
                    <div className="flex items-center gap-1.5 bg-[#1877f2]/15 border border-[#1877f2]/30 text-[#1877f2] px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider cursor-pointer relative">
                      <Zap className="w-3.5 h-3.5 text-[#1877f2] fill-[#1877f2]/20 shrink-0" />
                      <select
                        value={status}
                        onChange={(e) => {
                          setStatus(e.target.value as any);
                          toast({
                            title: "Status alterado",
                            description: `Definido como: ${e.target.value}.`,
                          });
                        }}
                        className="bg-transparent border-0 text-[11px] text-inherit outline-none cursor-pointer font-black uppercase tracking-wider font-sans w-full pr-4"
                      >
                        <option
                          value="draft"
                          className="bg-[#242526] text-white"
                        >
                          Rascunho
                        </option>
                        <option
                          value="scheduled"
                          className="bg-[#242526] text-white"
                        >
                          Agendado
                        </option>
                        <option
                          value="published"
                          className="bg-[#242526] text-white"
                        >
                          Publicado
                        </option>
                        <option
                          value="failed"
                          className="bg-[#242526] text-white"
                        >
                          Falhou
                        </option>
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
                        toast({
                          title: "Horário alterado",
                          description: `Agendado para: ${new Date(e.target.value).toLocaleString("pt-BR")}`,
                        });
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
          </div>

          {/* Scrollable Comments Viewport */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-dark">
            {/* Platform specific music/audio sub-detail */}
            {platformId === "tiktok" && (
              <div className="flex items-center gap-2 p-2 bg-[#1c1d1f] rounded-lg text-xs text-zinc-400 shrink-0">
                <Music
                  className="w-4 h-4 text-zinc-400 animate-spin"
                  style={{ animationDuration: "4s" }}
                />
                <span className="truncate">
                  Som original - @{account?.username || "seu_perfil"}
                </span>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Comentários ({activeComments.length})
              </h4>
              {activeComments.length > 0 ? (
                <div className="space-y-3">
                  {activeComments.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "flex gap-2 text-xs items-start transition-opacity duration-200",
                        c.hidden && "opacity-40",
                      )}
                      style={{ contain: "layout style" }}
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[10px] shrink-0 uppercase text-zinc-300">
                        {c.initials}
                      </div>
                      <div className="flex-1 p-2.5 rounded-xl border bg-zinc-900/60 border-zinc-800">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-zinc-200">
                            {c.author}
                          </span>
                          <span className="text-[9px] text-zinc-550">
                            {c.time}
                          </span>
                        </div>
                        <p className="leading-relaxed text-[11px] font-medium text-zinc-300">
                          {c.hidden ? (
                            <span className="text-zinc-500 italic">
                              [Comentário ocultado]{" "}
                            </span>
                          ) : null}
                          {c.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] text-zinc-500 font-bold border-t border-zinc-800/40 pt-1.5">
                          <button
                            type="button"
                            onClick={() => handleCommentLike(c.id)}
                            className={cn(
                              "hover:underline bg-transparent border-0 cursor-pointer p-0 font-bold transition-colors flex items-center gap-1",
                              c.liked ? "text-[#fe2c55]" : "text-zinc-400",
                            )}
                          >
                            <Heart
                              className={cn(
                                "w-3 h-3",
                                c.liked && "fill-current",
                              )}
                            />
                            <span>{c.liked ? "Curtido" : "Curtir"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toast({
                                title: "Responder Comentário",
                                description: `Respondendo para @${c.author}...`,
                              })
                            }
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
                <p className="text-xs text-zinc-500 italic text-center py-4">
                  Nenhum comentário nesta prévia.
                </p>
              )}
            </div>
          </div>

          {/* Action Panel and Input Form (Bottom) */}
          <div
            className={cn(
              "border-t shrink-0 p-4 space-y-4 bg-zinc-950 border-zinc-850",
            )}
          >
            {/* Reaction Buttons */}
            <div className="flex items-center justify-between">
              {platformId === "instagram" ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setLiked(!liked)}
                      className={cn(
                        "border-0 bg-transparent cursor-pointer p-0",
                        liked
                          ? "text-red-500"
                          : "text-zinc-400 hover:text-white",
                      )}
                    >
                      <Heart
                        className={cn("w-5 h-5", liked && "fill-current")}
                      />
                    </button>
                    <button
                      type="button"
                      className="border-0 bg-transparent text-zinc-400 hover:text-white cursor-pointer p-0"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="border-0 bg-transparent text-zinc-400 hover:text-white cursor-pointer p-0"
                      title="Compartilhar"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="border-0 bg-transparent text-zinc-400 hover:text-white cursor-pointer p-0"
                  >
                    <Bookmark className="w-5 h-5" />
                  </button>
                </div>
              ) : platformId === "tiktok" ? (
                <div className="flex items-center justify-around w-full text-zinc-400">
                  <button
                    type="button"
                    onClick={() => setLiked(!liked)}
                    className={cn(
                      "flex items-center gap-1.5 bg-transparent border-0 cursor-pointer text-xs font-bold",
                      liked
                        ? "text-[#fe2c55]"
                        : "text-zinc-400 hover:text-white",
                    )}
                  >
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
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 bg-transparent border-0 cursor-pointer hover:text-white"
                    title="Compartilhar"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>142</span>
                  </button>
                </div>
              ) : (
                // Facebook, LinkedIn and default
                <div className="flex items-center justify-between w-full">
                  <button
                    type="button"
                    onClick={() => setLiked(!liked)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-1.5 hover:bg-zinc-800 rounded-lg text-xs font-bold border-0 bg-transparent cursor-pointer transition-colors",
                      liked ? "text-[#1877F2]" : "text-zinc-400",
                    )}
                  >
                    <span>👍</span>
                    <span>{liked ? "Curtiu" : "Curtir"}</span>
                  </button>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400 border-0 bg-transparent cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Comentar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400 border-0 bg-transparent cursor-pointer transition-colors"
                  >
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
                <button
                  type="submit"
                  className={cn(
                    "font-bold text-xs border-0 bg-transparent cursor-pointer px-2 shrink-0 text-[#1877F2]",
                    !inputText.trim() && "opacity-50 pointer-events-none",
                  )}
                >
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
                  onClick={() => {
                    setShowMenu(false);
                    setIsSlideshowActive((prev) => !prev);
                    toast({
                      title: "Modo Apresentação",
                      description: !isSlideshowActive
                        ? "Slideshow automático de redes ativado."
                        : "Slideshow automático pausado.",
                    });
                  }}
                  className="py-3.5 text-zinc-100 font-semibold text-[13px] hover:bg-zinc-800/50 transition-colors border-0 bg-transparent cursor-pointer font-sans flex items-center justify-center gap-1.5"
                >
                  {isSlideshowActive
                    ? "⏹ Parar Modo Apresentação"
                    : "▶ Modo Apresentação (Auto)"}
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
          {/* Painel Overlay de Estatísticas e Métricas (Frente do texto) */}
          {showInsights && (
            <div className="absolute inset-0 z-40 bg-[#121214]/95 backdrop-blur-xl p-4 flex flex-col justify-between overflow-y-auto animate-in fade-in zoom-in-95 duration-200 font-sans text-left">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#1877F2]" />
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Estatísticas & Métricas
                      </h3>
                      <span className="text-[10px] text-zinc-400 font-mono block truncate max-w-[180px]">
                        webradiovitoria.com.br
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInsights(false)}
                    className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1877F2]/20 text-[#1877F2] border border-[#1877F2]/30 uppercase">
                    {selectedEntry?.platformId || "Geral"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 uppercase">
                    {status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-0.5">
                  <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-semibold uppercase">
                      Alcance
                    </span>
                    <span className="text-xs font-black text-white">25.4K</span>
                  </div>
                  <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-semibold uppercase">
                      Impressões
                    </span>
                    <span className="text-xs font-black text-white">34.1K</span>
                  </div>
                  <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-semibold uppercase">
                      Engajamento
                    </span>
                    <span className="text-xs font-black text-[#1877F2]">
                      12.8%
                    </span>
                  </div>
                  <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-semibold uppercase">
                      Curtidas
                    </span>
                    <span className="text-xs font-black text-red-500">
                      {likeCount}
                    </span>
                  </div>
                  <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-semibold uppercase">
                      Comentários
                    </span>
                    <span className="text-xs font-black text-amber-400">
                      {activeComments.length}
                    </span>
                  </div>
                  <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-zinc-800">
                    <span className="text-[9px] text-zinc-400 block font-semibold uppercase">
                      Retenção Vídeo
                    </span>
                    <span className="text-xs font-black text-green-500">
                      64.5%
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Monetização Estimada
                  </h4>
                  <div className="bg-[#1c1c1e] p-2.5 rounded-xl border border-zinc-800 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-semibold">
                        RPM Estimado:
                      </span>
                      <span className="text-white font-bold">
                        R$ 6.50 / 1K views
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-semibold">
                        Ganhos Acumulados:
                      </span>
                      <span className="text-green-500 font-black">
                        R$ 157,40
                      </span>
                    </div>
                    <div className="mt-1.5 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full"
                        style={{ width: "68%" }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                    Link da Publicação Vinculado
                  </h4>
                  <div className="flex items-center gap-2 bg-[#1c1c1e] p-2 rounded-xl border border-zinc-800">
                    <input
                      type="text"
                      readOnly
                      value={getPostShareUrl()}
                      className="bg-transparent text-[10px] text-zinc-300 font-mono outline-none flex-1 truncate px-1"
                    />
                    <button
                      type="button"
                      onClick={handleMenuCopyLink}
                      className="px-2.5 py-1 bg-[#1877F2] hover:bg-[#166fe5] text-white text-[10px] font-bold rounded-lg border-0 cursor-pointer shrink-0 transition-colors"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-auto">
                <button
                  type="button"
                  onClick={() => setShowInsights(false)}
                  className="w-full py-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs rounded-xl border-0 cursor-pointer transition-colors shadow-lg"
                >
                  Fechar Estatísticas
                </button>
              </div>
            </div>
          )}

          {/* Desktop / Fallback Share Modal */}
          {showShareModal && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all animate-in fade-in zoom-in-95 duration-150">
              <div className="w-full max-w-[320px] bg-[#1c1c1e] text-white rounded-2xl p-4 shadow-2xl border border-zinc-800/90 text-left flex flex-col gap-3 font-sans relative">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors bg-transparent border-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-[#1877F2]" />
                    Compartilhar Publicação
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Selecione um aplicativo para compartilhar o link.
                  </p>
                </div>

                {/* URL Display */}
                <div className="flex items-center gap-1.5 bg-[#242526] p-1.5 rounded-xl border border-zinc-800">
                  <input
                    type="text"
                    readOnly
                    value={getPostShareUrl()}
                    className="bg-transparent text-[10px] text-zinc-300 font-mono outline-none flex-1 truncate px-1"
                  />
                  <button
                    type="button"
                    onClick={handleMenuCopyLink}
                    className="px-2.5 py-1 bg-[#1877F2] hover:bg-[#166fe5] text-white text-[10px] font-bold rounded-lg border-0 cursor-pointer shrink-0 transition-colors"
                  >
                    Copiar
                  </button>
                </div>

                {/* Apps Grid */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent((post.content ? post.content + "\n\n" : "") + getPostShareUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareModal(false)}
                    className="flex flex-col items-center justify-center p-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-xl text-white transition-all text-[10px] font-bold gap-1 no-underline"
                  >
                    <MessageCircle className="w-4.5 h-4.5 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(getPostShareUrl())}&text=${encodeURIComponent(post.content || "Web Rádio Vitória")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareModal(false)}
                    className="flex flex-col items-center justify-center p-2.5 bg-[#0088CC]/10 hover:bg-[#0088CC]/20 border border-[#0088CC]/30 rounded-xl text-white transition-all text-[10px] font-bold gap-1 no-underline"
                  >
                    <Send className="w-4.5 h-4.5 text-[#0088CC]" />
                    <span>Telegram</span>
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getPostShareUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareModal(false)}
                    className="flex flex-col items-center justify-center p-2.5 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 rounded-xl text-white transition-all text-[10px] font-bold gap-1 no-underline"
                  >
                    <Facebook className="w-4.5 h-4.5 text-[#1877F2]" />
                    <span>Facebook</span>
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.content ? post.content.slice(0, 100) : "")}&url=${encodeURIComponent(getPostShareUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareModal(false)}
                    className="flex flex-col items-center justify-center p-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-white transition-all text-[10px] font-bold gap-1 no-underline"
                  >
                    <Twitter className="w-4.5 h-4.5 text-white" />
                    <span>Twitter / X</span>
                  </a>

                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getPostShareUrl())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareModal(false)}
                    className="flex flex-col items-center justify-center p-2.5 bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border border-[#0A66C2]/30 rounded-xl text-white transition-all text-[10px] font-bold gap-1 no-underline"
                  >
                    <Linkedin className="w-4.5 h-4.5 text-[#0A66C2]" />
                    <span>LinkedIn</span>
                  </a>

                  <a
                    href={`mailto:?subject=${encodeURIComponent("Publicação Web Rádio Vitória")}&body=${encodeURIComponent((post.content || "") + "\n\n" + getPostShareUrl())}`}
                    onClick={() => setShowShareModal(false)}
                    className="flex flex-col items-center justify-center p-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-white transition-all text-[10px] font-bold gap-1 no-underline"
                  >
                    <Send className="w-4.5 h-4.5 text-purple-400" />
                    <span>E-mail</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl border-0 cursor-pointer transition-colors mt-1"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <>
        <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
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
              <DialogDescription>
                Visualize como o post agendado aparecerá nas redes sociais antes
                de ser publicado.
              </DialogDescription>
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
                        setInputText("");
                      }}
                      className={cn(
                        "w-10 h-10 md:w-14 md:h-14 flex items-center justify-center transition-all relative group shrink-0",
                        platform.id === "facebook" ||
                          platform.id === "threads" ||
                          platform.id === "pinterest" ||
                          platform.id === "tiktok" ||
                          platform.id === "whatsapp" ||
                          platform.id === "telegram"
                          ? "rounded-full"
                          : "rounded-xl md:rounded-2xl",
                        btnBg,
                      )}
                    >
                      <Icon
                        className="w-6 h-6 md:w-9 md:h-9"
                        data-active={isSelected}
                        style={{
                          filter: isSelected
                            ? "drop-shadow(2.5px 3px 1.5px rgba(0,0,0,0.45))"
                            : "drop-shadow(1.5px 2px 1px rgba(0,0,0,0.22))",
                        }}
                      />
                      {isSelected && (
                        <div className="absolute bottom-0 md:bottom-auto md:-right-2 w-6 h-1 md:w-1 md:h-6 bg-primary rounded-full" />
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
                <div
                  className={cn(
                    "w-full h-[40vh] md:h-full bg-black relative flex items-center justify-center overflow-hidden shrink-0 md:shrink",
                    post.media_urls && post.media_urls.length > 0
                      ? "md:flex-1"
                      : "flex-1",
                  )}
                >
                  {renderCinemaMedia()}
                </div>

                {/* Column 3: Dynamic Interaction & Details Panel (Right) */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="w-full md:w-96 flex flex-col flex-1 md:flex-initial h-full bg-white dark:bg-zinc-900 border-t md:border-t-0 md:border-l border-border/40 overflow-hidden shrink-0">
                    {renderInteractionSidebar()}
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
  },
);
