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
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { PlatformIconBadge } from "@/components/icons/PlatformIconBadge";
import { useScheduledPosts, ScheduledPost } from "@/hooks/useScheduledPosts";
import { useSocialStats } from "@/hooks/useSocialStats";
import { FeedPreview } from "./FeedPreview";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const { isConnected: isPlatformConnected } = useSocialStats();
  const [previewPost, setPreviewPost] = useState<ScheduledPost | null>(null);

  // Show only the most recent 5 posts
  const recentPosts = posts.slice(0, 5);

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl border border-border"
      >
        <div className="p-6 border-b border-border">
          <h2 className="font-display font-bold text-xl">Publicações Recentes</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-2xl border border-border"
    >
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl">Publicações Recentes</h2>
          <button className="text-sm text-primary hover:underline">Ver todas</button>
        </div>
      </div>

      {recentPosts.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-muted-foreground">Nenhuma publicação ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie seu primeiro post na aba "Criar Post"
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {recentPosts.map((post, index) => {
            const StatusIcon = statusConfig[post.status]?.icon || Clock;
            
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-6 hover:bg-muted/30 transition-colors group relative cursor-pointer"
                onClick={() => setPreviewPost(post)}
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
                          muted={!isPlatformConnected(normalizedId)}
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

                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2 mb-2">{post.content}</p>
                    
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                        statusConfig[post.status]?.bg,
                        statusConfig[post.status]?.color
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[post.status]?.label}
                      </span>
                      
                      {post.published_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(post.published_at)}
                        </span>
                      )}
                      
                      {post.scheduled_at && post.status === 'scheduled' && (
                        <span className="text-xs text-muted-foreground">
                          Agendado: {formatDate(post.scheduled_at)}
                        </span>
                      )}
                      
                      {post.status === 'draft' && (
                        <span className="text-xs text-muted-foreground">
                          Criado: {formatDate(post.created_at)}
                        </span>
                      )}
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
        />
      )}
    </motion.div>
  );
};

export default RecentPosts;
