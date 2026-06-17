import { memo, useState, useMemo } from "react";
import { Eye, Heart, MessageSquare, Share2, Clock, ExternalLink, FileDown, ArrowUpDown, ArrowUp, ArrowDown, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPlatformDetails } from "./platformConfigs";
import { PostDetailModal } from "./PostDetailModal";
import type { PostMetric } from "./usePlatformDetail";

interface PlatformPostsTableProps {
  platformId: string;
  posts: PostMetric[];
  loading: boolean;
}

type SortKey = 'published_at' | 'likes' | 'comments' | 'engagement' | 'views';

export const PlatformPostsTable = memo(({ platformId, posts, loading }: PlatformPostsTableProps) => {
  const [selectedPost, setSelectedPost] = useState<PostMetric | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('published_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const perPage = 10;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'published_at':
          cmp = (a.published_at || '').localeCompare(b.published_at || '');
          break;
        case 'likes':
          cmp = (a.likes || 0) - (b.likes || 0);
          break;
        case 'comments':
          cmp = (a.comments || 0) - (b.comments || 0);
          break;
        case 'views':
          cmp = (a.views || 0) - (b.views || 0);
          break;
        case 'engagement': {
          const engA = (a.likes || 0) + (a.comments || 0) + (a.shares || 0);
          const engB = (b.likes || 0) + (b.comments || 0) + (b.shares || 0);
          cmp = engA - engB;
          break;
        }
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [posts, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedPosts.length / perPage);
  const pagePosts = sortedPosts.slice(page * perPage, (page + 1) * perPage);
  const bestPostIdx = sortedPosts.length > 0 ? 0 : -1;

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />;
  };

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
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center">
          <FileDown className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium">Nenhum post encontrado</p>
        <p className="text-xs text-muted-foreground">
          Publique conteúdo ou ajuste o período de busca
        </p>
      </div>
    );
  }

  const platformColor = getPlatformDetails(platformId)?.color || 'bg-primary';

  return (
    <>
      <div className="flex items-center gap-4 mb-3 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
        <button onClick={() => handleSort('published_at')} className="flex items-center gap-1 hover:text-white transition-colors">
          Data <SortIcon k="published_at" />
        </button>
        <button onClick={() => handleSort('views')} className="flex items-center gap-1 hover:text-white transition-colors">
          Views <SortIcon k="views" />
        </button>
        <button onClick={() => handleSort('likes')} className="flex items-center gap-1 hover:text-white transition-colors">
          Likes <SortIcon k="likes" />
        </button>
        <button onClick={() => handleSort('comments')} className="flex items-center gap-1 hover:text-white transition-colors">
          Coment. <SortIcon k="comments" />
        </button>
        <button onClick={() => handleSort('engagement')} className="flex items-center gap-1 hover:text-white transition-colors">
          Eng. <SortIcon k="engagement" />
        </button>
      </div>

      <div className="space-y-2">
        {pagePosts.map((post, idx) => {
          const eng = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
          const isBest = idx === 0 && sortKey === 'engagement' && sortDir === 'desc';
          return (
            <button
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="w-full flex items-center gap-4 p-3 rounded-xl bg-muted/20 border border-border/50 hover:border-primary/30 transition-colors text-left group relative"
            >
              {isBest && (
                <div className="absolute -top-1 -right-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
              )}
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
                  {post.media_type && (
                    <span className={cn("px-1 py-0.5 rounded text-[8px] font-bold uppercase", platformColor.replace('bg-', 'bg-').replace('500', '500/20') + ' text-white')}>
                      {post.media_type}
                    </span>
                  )}
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
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <Button
              key={i}
              variant={page === i ? "default" : "outline"}
              size="sm"
              className="h-7 w-7 p-0 text-xs"
              onClick={() => setPage(i)}
            >
              {i + 1}
            </Button>
          ))}
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Próximo
          </Button>
        </div>
      )}

      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </>
  );
});

PlatformPostsTable.displayName = "PlatformPostsTable";
