import { memo } from "react";
import { X, ExternalLink, Eye, Heart, MessageSquare, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPlatformDetails } from "./platformConfigs";
import type { PostMetric } from "./usePlatformDetail";

interface PostDetailModalProps {
  post: PostMetric | null;
  open: boolean;
  onClose: () => void;
}

export const PostDetailModal = memo(({ post, open, onClose }: PostDetailModalProps) => {
  if (!open || !post) return null;

  const platform = getPlatformDetails(post.platform);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {platform && <platform.icon className={cn("w-4 h-4", platform.textColor)} />}
            <h3 className="font-bold text-sm">Detalhes do Post</h3>
          </div>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {post.content && (
            <div className="p-3 rounded-lg bg-muted/20 text-sm leading-relaxed">
              {post.content}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider flex items-center gap-1">
                <Eye className="w-3 h-3" /> Visualizações
              </p>
              <p className="text-lg font-bold">{(post.views || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider flex items-center gap-1">
                <Heart className="w-3 h-3" /> Curtidas
              </p>
              <p className="text-lg font-bold">{(post.likes || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Comentários
              </p>
              <p className="text-lg font-bold">{(post.comments || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider flex items-center gap-1">
                <Share2 className="w-3 h-3" /> Compartilhamentos
              </p>
              <p className="text-lg font-bold">{(post.shares || 0).toLocaleString()}</p>
            </div>
          </div>

          {post.impressions !== null && post.impressions !== undefined && (
            <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Impressões</p>
              <p className="text-lg font-bold">{post.impressions.toLocaleString()}</p>
            </div>
          )}

          {post.media_url && (
            <div className="rounded-xl overflow-hidden border border-border">
              <img src={post.media_url} alt="Post media" className="w-full h-auto max-h-64 object-cover" />
            </div>
          )}

          <div className="pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              Post ID: {post.external_id || post.id || "—"}
              {post.published_at && ` · Publicado em ${new Date(post.published_at).toLocaleString("pt-BR")}`}
            </p>
            {post.engagement_rate !== null && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Taxa de engajamento: {(post.engagement_rate || 0).toFixed(2)}%
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground">
            Breakdown detalhado (idade, gênero, dispositivo) disponível na Fase 2.
          </div>
        </div>
      </div>
    </div>
  );
});

PostDetailModal.displayName = "PostDetailModal";
