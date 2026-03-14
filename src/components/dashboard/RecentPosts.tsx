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
import { socialPlatforms } from "@/components/icons/SocialIcons";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";

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

export const RecentPosts = () => {
  const { posts, loading } = useScheduledPosts();

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
                className="p-6 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className="flex -space-x-2">
                    {post.platforms.slice(0, 3).map((platformId) => {
                      const normalizedId = normalizePlatform(platformId);
                      const platform = socialPlatforms.find(p => p.id === normalizedId);
                      if (!platform) return null;
                      const Icon = platform.icon;
                      return (
                        <div
                          key={normalizedId}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border-2 border-card",
                            platform.color
                          )}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
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

                  <button className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                    <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
