import { useState } from "react";
import { 
  X, Instagram, Facebook, Twitter, Linkedin, MessageCircle, 
  Heart, MessageSquare, Share2, Bookmark, Send, MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, normalizePlatform } from "@/lib/utils";
import { socialPlatforms, SocialPlatformId } from "@/components/icons/SocialIcons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScheduledPost } from "@/hooks/useScheduledPosts";

interface FeedPreviewProps {
  post: ScheduledPost;
  isOpen: boolean;
  onClose: () => void;
}

export const FeedPreview = ({ post, isOpen, onClose }: FeedPreviewProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatformId>(
    (normalizePlatform(post.platforms[0]) as SocialPlatformId) || "instagram"
  );

  const renderPreview = () => {
    switch (selectedPlatform) {
      case "instagram":
        return <InstagramPreview post={post} />;
      case "facebook":
        return <FacebookPreview post={post} />;
      case "twitter":
      case "x" as any:
        return <XPreview post={post} />;
      case "linkedin":
        return <LinkedInPreview post={post} />;
      case "telegram":
        return <TelegramPreview post={post} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
            <p>Visualização não disponível para esta plataforma.</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl">
        <div className="flex h-[80vh]">
          {/* Sidebar - Platforms */}
          <div className="w-16 border-r border-border/40 bg-muted/10 flex flex-col items-center py-6 gap-4">
            {post.platforms.map((pId) => {
              const normalized = normalizePlatform(pId) as SocialPlatformId;
              const platform = socialPlatforms.find((p) => p.id === normalized);
              if (!platform) return null;
              const Icon = platform.icon;
              const isSelected = selectedPlatform === normalized;

              return (
                <button
                  key={normalized}
                  onClick={() => setSelectedPlatform(normalized)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all relative group",
                    isSelected ? "bg-primary text-white scale-110 shadow-lg" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {isSelected && (
                    <motion.div
                      layoutId="active-platform"
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
            <motion.div
              key={selectedPlatform}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
            >
              {renderPreview()}
            </motion.div>
          </div>

          {/* Info Side Panel */}
          <div className="w-80 border-l border-border/40 p-6 hidden lg:block bg-muted/10 overflow-y-auto">
            <h3 className="font-display font-bold text-lg mb-4">Detalhes do Post</h3>
            <div className="space-y-6">
              <div>
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
                  {post.scheduled_at 
                    ? new Date(post.scheduled_at).toLocaleString() 
                    : "Publicação Imediata"}
                </p>
              </div>

              {post.media_ids && post.media_ids.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mídias ({post.media_ids.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {post.media_ids.map((url, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted border border-border/50">
                        <img src={url} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* Platform Specific Mini-Previews */

const InstagramPreview = ({ post }: { post: ScheduledPost }) => (
  <div className="flex flex-col">
    {/* IG Header */}
    <div className="flex items-center justify-between p-3 border-b border-zinc-100 dark:border-zinc-900">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px]">
          <div className="w-full h-full rounded-full bg-white dark:bg-black p-[1.5px]">
            <div className="w-full h-full rounded-full bg-zinc-200" />
          </div>
        </div>
        <span className="text-sm font-bold">your_profile</span>
      </div>
      <MoreHorizontal className="w-5 h-5 text-zinc-500" />
    </div>
    
    {/* IG Media */}
    <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
      {post.media_ids && post.media_ids[0] ? (
        <img src={post.media_ids[0]} className="w-full h-full object-cover" />
      ) : (
        <Instagram className="w-12 h-12 text-zinc-400 opacity-20" />
      )}
    </div>

    {/* IG Actions */}
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <Heart className="w-6 h-6" />
          <MessageCircle className="w-6 h-6" />
          <Send className="w-6 h-6" />
        </div>
        <Bookmark className="w-6 h-6" />
      </div>
      <p className="text-sm mb-1"><span className="font-bold">your_profile</span> {post.content}</p>
      <p className="text-[10px] text-zinc-500 uppercase mt-2">Agendado para {new Date(post.scheduled_at || post.created_at).toLocaleDateString()}</p>
    </div>
  </div>
);

const FacebookPreview = ({ post }: { post: ScheduledPost }) => (
  <div className="flex flex-col">
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-full bg-zinc-200" />
        <div>
          <p className="text-sm font-bold">Your Official Page</p>
          <p className="text-[10px] text-zinc-500">Agendado · 🌍</p>
        </div>
      </div>
      <p className="text-sm mb-3 whitespace-pre-wrap">{post.content}</p>
    </div>
    <div className="aspect-video bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        {post.media_ids && post.media_ids[0] ? (
            <img src={post.media_ids[0]} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex items-center justify-center opacity-10">
                <Facebook className="w-16 h-16" />
            </div>
        )}
    </div>
    <div className="p-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-around">
      <Button variant="ghost" size="sm" className="text-zinc-500 flex-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 h-9 gap-2">
        <Heart className="w-4 h-4" /> Curtir
      </Button>
      <Button variant="ghost" size="sm" className="text-zinc-500 flex-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 h-9 gap-2">
        <MessageSquare className="w-4 h-4" /> Comentar
      </Button>
      <Button variant="ghost" size="sm" className="text-zinc-500 flex-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 h-9 gap-2">
        <Share2 className="w-4 h-4" /> Compartilhar
      </Button>
    </div>
  </div>
);

const XPreview = ({ post }: { post: ScheduledPost }) => (
  <div className="flex flex-col p-4 bg-white dark:bg-zinc-950">
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-full bg-zinc-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <span className="font-bold text-sm">Username</span>
          <span className="text-zinc-500 text-sm">@profile · agora</span>
        </div>
        <p className="text-sm mb-3 whitespace-pre-wrap leading-normal">{post.content}</p>
        {post.media_ids && post.media_ids[0] && (
          <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 mb-3 aspect-video">
            <img src={post.media_ids[0]} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex items-center justify-between text-zinc-500 max-w-sm px-1">
          <MessageCircle className="w-5 h-5" />
          <RefreshCw className="w-5 h-5" />
          <Heart className="w-5 h-5" />
          <Share2 className="w-5 h-5" />
        </div>
      </div>
    </div>
  </div>
);

const RefreshCw = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);

const LinkedInPreview = ({ post }: { post: ScheduledPost }) => (
  <div className="flex flex-col">
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-12 h-12 rounded bg-zinc-200" />
        <div>
          <p className="text-sm font-bold">Seu Nome Profissional</p>
          <p className="text-[10px] text-zinc-500">Especialista em algo • Agora • 🌐</p>
        </div>
      </div>
      <p className="text-sm mb-4 whitespace-pre-wrap">{post.content}</p>
    </div>
    {post.media_ids && post.media_ids[0] && (
      <div className="aspect-video bg-zinc-100 overflow-hidden">
        <img src={post.media_ids[0]} className="w-full h-full object-cover" />
      </div>
    )}
    <div className="p-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center gap-1">
      <Button variant="ghost" size="sm" className="text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs gap-1">
        <ThumbsUp className="w-4 h-4" /> Gostei
      </Button>
      <Button variant="ghost" size="sm" className="text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs gap-1">
        <MessageSquare className="w-4 h-4" /> Comentar
      </Button>
      <Button variant="ghost" size="sm" className="text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs gap-1">
        <Share2 className="w-4 h-4" /> Compartilhar
      </Button>
      <Button variant="ghost" size="sm" className="text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs gap-1">
        <Send className="w-4 h-4" /> Enviar
      </Button>
    </div>
  </div>
);

const ThumbsUp = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
);

const TelegramPreview = ({ post }: { post: ScheduledPost }) => (
  <div className="flex flex-col bg-[#6c8db0] h-full min-h-[400px] p-4 relative">
    <div className="absolute top-0 left-0 right-0 h-10 bg-black/10 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20" />
            <span className="text-white text-xs font-bold">Canal do Hub</span>
        </div>
        <MoreHorizontal className="w-4 h-4 text-white" />
    </div>
    
    <div className="mt-10 max-w-[85%] bg-white dark:bg-zinc-900 rounded-lg p-2 shadow-sm self-start relative">
      {post.media_ids && post.media_ids[0] && (
        <div className="rounded-md overflow-hidden mb-2">
          <img src={post.media_ids[0]} className="w-full h-auto object-cover max-h-[300px]" />
        </div>
      )}
      <p className="text-sm whitespace-pre-wrap">{post.content}</p>
      <div className="flex justify-end mt-1">
        <span className="text-[10px] text-zinc-400">12:34 ✓✓</span>
      </div>
    </div>
  </div>
);
