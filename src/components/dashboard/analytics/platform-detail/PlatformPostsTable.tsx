import { memo, useState } from "react";
import { Eye, Heart, MessageSquare, Share2, Clock, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPlatformDetails } from "./platformConfigs";
import { PostDetailModal } from "./PostDetailModal";
import type { PostMetric } from "./usePlatformDetail";

interface PlatformPostsTableProps {
  platformId: string;
  posts: PostMetric[];
  loading: boolean;
}

export const PlatformPostsTable = memo(({ platformId, posts, loading }: PlatformPostsTableProps) => {
  const [selectedPost, setSelectedPost] = useState<PostMetric | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm italic">
        Nenhum post encontrado no período
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {posts.slice(0, 20).map((post) => (
          <button
            key={post.id}
            onClick={() => setSelectedPost(post)}
            className="w-full flex items-center gap-4 p-3 rounded-xl bg-muted/20 border border-border/50 hover:border-primary/30 transition-colors text-left group"
          >
            {post.media_url && (
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                <img src={post.media_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {post.content || post.external_id || "Post sem conteúdo"}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {(post.views || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" /> {(post.likes || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> {(post.comments || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="w-3 h-3" /> {(post.shares || 0).toLocaleString()}
                </span>
                {post.published_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(post.published_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        ))}
      </div>

      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </>
  );
});

PlatformPostsTable.displayName = "PlatformPostsTable";
