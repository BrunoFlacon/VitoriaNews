import { useState, useEffect, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image as ImageIcon, Video, FileText, Eye, Trash2, Edit2, 
  Clock, CheckCircle2, AlertCircle, XCircle, Send, Filter,
  RefreshCw, Play, ChevronDown, ChevronUp, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useScheduledPosts, ScheduledPost } from "@/hooks/useScheduledPosts";
import { supabase } from "@/integrations/supabase/client";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { FeedPreview } from "@/components/dashboard/FeedPreview";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { Heart, MessageCircle, Share2, Globe, Lock, Users as UsersIcon } from "lucide-react";
import { SafeImage } from "@/components/ui/SafeImage";

const statusConfig = {
  draft: { label: "Rascunho", icon: FileText, color: "bg-muted text-muted-foreground border-border" },
  scheduled: { label: "Agendado", icon: Clock, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  published: { label: "Publicado", icon: CheckCircle2, color: "bg-green-500/10 text-green-500 border-green-500/20" },
  failed: { label: "Falhou", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  pending_approval: { label: "Em Revisão", icon: AlertCircle, color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  rejected: { label: "Rejeitado", icon: XCircle, color: "bg-red-500/10 text-red-500 border-red-500/20" },
};

const mediaTypeIcon = {
  image: ImageIcon,
  video: Video,
  document: FileText,
  story: ImageIcon,
  live: Video,
  text: FileText,
};

interface MediaPreviewProps {
  mediaIds: string[];
  mediaType: string;
}

function MediaPreview({ mediaIds, mediaType }: MediaPreviewProps) {
  const [mediaUrls, setMediaUrls] = useState<{ id: string; url: string; type: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadMedia();
  }, [mediaIds]);

  const loadMedia = async () => {
    if (loaded || mediaIds.length === 0) return;
    setLoaded(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("media")
        .select("id, file_url, file_type")
        .in("id", mediaIds);
      if (data) {
        setMediaUrls(data.map((m: any) => ({ id: m.id, url: m.file_url, type: m.file_type })));
      }
    } catch {
      // ignore
    }
  };

  if (mediaIds.length === 0) return null;

  return (
    <div className="mt-3">
      {!loaded ? (
        <button
          onClick={loadMedia}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {mediaType === "video" ? <Play className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
          {mediaIds.length} mídia{mediaIds.length > 1 ? "s" : ""} anexada{mediaIds.length > 1 ? "s" : ""}
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {mediaUrls.slice(0, expanded ? undefined : 3).map((m) =>
            m.type.startsWith("image/") ? (
              <img
                key={m.id}
                src={m.url}
                alt="mídia"
                className="w-full aspect-square object-cover rounded-lg"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : m.type.startsWith("video/") || m.type.startsWith("audio/") ? (
              <video
                key={m.id}
                src={m.url}
                className="w-full aspect-square object-cover rounded-lg bg-black"
                controls
              />
            ) : null
          )}
          {mediaUrls.length > 3 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : `+${mediaUrls.length - 3}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface PostCardProps {
  post: ScheduledPost;
  onEdit: (post: ScheduledPost) => void;
  onDelete: (id: string) => void;
  onClick: (post: ScheduledPost) => void;
}

function PostCard({ post, onEdit, onDelete, onClick }: PostCardProps) {
  const { connections } = useSocialConnections();
  const status = statusConfig[post.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const MediaIcon = mediaTypeIcon[post.media_type as keyof typeof mediaTypeIcon] || FileText;

  const platforms = post.platforms
    .map(pId => {
      const [platformId, accountId] = pId.split("|");
      const platform = socialPlatforms.find(sp => sp.id === platformId);
      let account = accountId ? connections.find(c => c.id === accountId) : undefined;
      
      if (!account) {
        account = connections.find(c => c.platform === platformId && c.is_connected);
      }
      
      return { platform, account };
    })
    .filter(p => p.platform);

  const primaryPlatform = platforms[0];
  const metrics = (post as any).metrics || { likes: 0, comments: 0, shares: 0, views: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all group cursor-pointer shadow-sm hover:shadow-md"
      onClick={() => startTransition(() => onClick(post))}
      style={{ contain: "paint layout", willChange: "transform, opacity" }}
    >
      <div className="p-4">
        {/* Profile Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {primaryPlatform?.account?.profile_image_url ? (
                <div className="w-10 h-10 rounded-full overflow-hidden border border-border shadow-sm">
                  <SafeImage src={primaryPlatform.account.profile_image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm", primaryPlatform?.platform?.color || "bg-primary")}>
                  {primaryPlatform?.account?.page_name?.[0] || primaryPlatform?.platform?.name?.[0] || "P"}
                </div>
              )}
              {primaryPlatform?.platform && (
                <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-card", primaryPlatform.platform.color)}>
                  <primaryPlatform.platform.icon className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">
                {primaryPlatform?.account?.page_name || primaryPlatform?.platform?.name || "Vitória News"}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                <span>
                  {post.published_at 
                    ? new Date(post.published_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                    : post.scheduled_at
                    ? `Agendado: ${new Date(post.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
                    : `Criado: ${new Date(post.created_at).toLocaleDateString("pt-BR")}`}
                </span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  <span>Público</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", status.color)}>
                {status.label}
             </span>
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(post); }}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
             </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap line-clamp-4">
            {post.content || <span className="text-muted-foreground italic">Sem conteúdo</span>}
          </p>

          {/* Media Preview */}
          {post.media_ids?.length > 0 && (
            <MediaPreview mediaIds={post.media_ids} mediaType={post.media_type} />
          )}
        </div>

        {/* Real Metrics Footer */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Heart className="w-4 h-4" />
              <span className="text-xs font-bold">{metrics.likes.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-bold">{metrics.comments.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Share2 className="w-4 h-4" />
              <span className="text-xs font-bold">{metrics.shares.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-bold">{metrics.views.toLocaleString()}</span>
            </div>
          </div>

          {/* Other platforms icons */}
          {platforms.length > 1 && (
            <div className="flex -space-x-1.5">
              {platforms.slice(1, 4).map((p, idx) => (
                <div key={`${p.platform?.id}-${idx}`} className={cn("w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-card shadow-sm", p.platform?.color)}>
                  <p.platform.icon className="w-2.5 h-2.5 text-white" />
                </div>
              ))}
              {platforms.length > 4 && (
                <div className="w-5 h-5 rounded-full bg-muted ring-2 ring-card flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                  +{platforms.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface PostsFeedViewProps {
  onEditPost?: (post: ScheduledPost) => void;
}

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "draft", label: "Rascunho" },
  { id: "scheduled", label: "Agendados" },
  { id: "published", label: "Publicados" },
  { id: "pending_approval", label: "Revisão" },
] as const;

export function PostsFeedView({ onEditPost }: PostsFeedViewProps) {
  const { posts, loading, deletePost, refetch } = useScheduledPosts();
  const [filter, setFilter] = useState<string>("all");
  const [previewPost, setPreviewPost] = useState<ScheduledPost | null>(null);

  const filtered = filter === "all" ? posts : posts.filter(p => p.status === filter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Meus Posts</h3>
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {posts.length}
          </Badge>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Send className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-bold text-sm">Nenhum post encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === "all" ? "Crie seu primeiro post acima." : "Mude o filtro para ver outros posts."}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 gap-3">
            {filtered.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onEdit={(p) => onEditPost?.(p)}
                onDelete={deletePost}
                onClick={() => setPreviewPost(post)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Detail Modal */}
      {previewPost && (
        <FeedPreview 
          post={previewPost} 
          isOpen={!!previewPost} 
          onClose={() => setPreviewPost(null)} 
        />
      )}
    </div>
  );
}
