// Componente de listagem de posts recentes - Estabilizado
import { motion } from "framer-motion";
import { 
  MoreHorizontal, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit
} from "lucide-react";
import { cn, normalizePlatform } from "@/lib/utils";

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.ogv']);
function isVideoUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const path = new URL(url).pathname;
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
    return VIDEO_EXTENSIONS.has(ext);
  } catch {
    return url.match(/\.(mp4|webm|mov|avi|mkv|m4v|3gp|ogv)(\?|$)/i) !== null;
  }
}

import { socialPlatforms } from "@/components/icons/platform-metadata";
import { PlatformIconBadge } from "@/components/icons/PlatformIconBadge";
import { useScheduledPosts, ScheduledPost } from "@/hooks/useScheduledPosts";
import { FeedPreview } from "./FeedPreview";
import { useState, useEffect, useMemo, startTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PostsFeedView } from "@/components/dashboard/PostsFeedView";
import { Trash, Send, Edit2 } from "lucide-react";

const statusConfig = {
  published: {
    icon: CheckCircle2,
    label: "Publicado",
    color: "text-green-500",
    bg: "bg-green-500/10"
  },
  scheduled: {
    icon: Clock,
    label: "Agendado",
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  draft: {
    icon: Edit,
    label: "Rascunho",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10"
  },
  failed: {
    icon: AlertCircle,
    label: "Falhou",
    color: "text-red-500",
    bg: "bg-red-500/10"
  }
};

export const RecentPosts = ({ onEditPost }: { onEditPost?: (post: ScheduledPost) => void }) => {
  const { posts, loading, deletePost, updatePost } = useScheduledPosts();
  const [previewPost, setPreviewPost] = useState<ScheduledPost | null>(null);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      const query = e.detail?.query || "";
      setSearchQuery(query.toLowerCase());
    };
    window.addEventListener('system-search', handleGlobalSearch);
    return () => window.removeEventListener('system-search', handleGlobalSearch);
  }, []);

  // Show only the most recent 5 posts, filtered by search
  const filteredRecentPosts = useMemo(() => {
    return posts
      .filter(p => !searchQuery || (p.content || "").toLowerCase().includes(searchQuery))
      .slice(0, 5);
  }, [posts, searchQuery]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl border border-border min-h-[400px]">
        <div className="p-6 border-b border-border">
          <h2 className="font-display font-bold text-xl">Publicações Recentes</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-2xl border border-border min-h-[400px] flex flex-col overflow-hidden"
    >
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl">Publicações Recentes</h2>
          <button 
            onClick={() => setShowAllPosts(true)}
            className="text-sm text-primary hover:underline"
          >
            Ver todas
          </button>
        </div>
      </div>

      {filteredRecentPosts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[334px]">
          <p className="text-muted-foreground">Nenhuma publicação ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie seu primeiro post na aba "Criar Post"
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredRecentPosts.map((post, index) => {
            const StatusIcon = statusConfig[post.status]?.icon || Clock;
            
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-6 hover:bg-muted/30 transition-colors group relative cursor-pointer"
                style={{ contain: "paint layout" }}
                onClick={() => startTransition(() => setPreviewPost(post))}
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2">
                    {post.platforms.slice(0, 3).map((platformId) => {
                      const normalizedId = normalizePlatform(platformId);
                      const platform = socialPlatforms.find(p => p.id === normalizedId);
                      if (!platform) return null;
                      return (
                        <PlatformIconBadge
                          key={normalizedId}
                          platform={platform}
                          size="sm"
                          className="border-2 border-background shadow-sm"
                        />
                      );
                    })}
                    {post.platforms.length > 3 && (
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border-2 border-card text-xs font-medium">
                        +{post.platforms.length - 3}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail / Micro-Prévia (Fase 3) */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="relative w-12 h-12 rounded-lg bg-zinc-950 border border-border/40 overflow-hidden shrink-0">
                      {isVideoUrl(post.media_urls[0]) ? (
                        <div className="w-full h-full relative">
                          <video
                            src={post.media_urls[0]}
                            className="w-full h-full object-cover"
                            preload="none"
                            muted
                          />
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                            <span className="text-[10px] text-white">▶</span>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={post.media_urls[0]}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      
                      {/* Format/Aspect Ratio Badge */}
                      <div className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 py-0.2 rounded text-[7px] font-bold text-white leading-none scale-90 origin-bottom-right">
                        {isVideoUrl(post.media_urls[0]) ? (
                          post.platforms.some(p => p.includes('tiktok') || p.includes('instagram')) ? '9:16' : '16:9'
                        ) : (
                          post.media_urls.length > 1 ? `x${post.media_urls.length}` : '1:1'
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium line-clamp-2 mb-1.5 md:mb-2">{post.content || "Sem conteúdo"}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                        statusConfig[post.status]?.bg,
                        statusConfig[post.status]?.color
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[post.status]?.label}
                      </span>
                      
                      <div className="flex items-center gap-2 text-muted-foreground/60 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-medium uppercase tracking-tight">
                          {post.status === 'draft' ? "Criado em: " : 
                           post.status === 'scheduled' ? "Agendado: " : ""}
                          {formatDate(post.published_at || post.scheduled_at || post.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Error message */}
                    {post.status === 'failed' && post.error_message && (
                      <div className="mt-2 p-2 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-red-500">{post.error_message}</p>
                      </div>
                    )}
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setPreviewPost(post)} className="gap-2 focus:cursor-pointer">
                          <Eye className="w-4 h-4" /> Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditPost?.(post)} className="gap-2 focus:bg-white/10 focus:text-white cursor-pointer">
                          <Edit2 className="w-4 h-4" /> Editar
                        </DropdownMenuItem>
                        {post.status === 'draft' && (
                          <DropdownMenuItem 
                            onClick={() => updatePost(post.id, { status: 'published' } as any)} 
                            className="gap-2 text-primary focus:bg-primary/10 focus:text-primary cursor-pointer"
                          >
                            <Send className="w-4 h-4" /> Publicar agora
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => {
                            if(confirm("Deseja realmente excluir esta publicação?")) {
                              deletePost(post.id);
                            }
                          }}
                          className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                        >
                          <Trash className="w-4 h-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {previewPost && (
        <FeedPreview 
          post={previewPost} 
          isOpen={!!previewPost} 
          onClose={() => setPreviewPost(null)} 
          onEdit={onEditPost}
          onDelete={deletePost}
        />
      )}

      {/* All Posts Dialog */}
      <Dialog open={showAllPosts} onOpenChange={setShowAllPosts}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">Todas as Publicações</DialogTitle>
          <DialogDescription className="sr-only">
            Visualize e gerencie todas as suas publicações recentes e agendadas.
          </DialogDescription>
          <div className="p-6">
            <PostsFeedView 
              onEditPost={(post) => {
                setShowAllPosts(false);
                onEditPost?.(post);
              }} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default RecentPosts;
