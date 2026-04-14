import { useState } from "react";
import { 
  X, Instagram, Facebook, Twitter, Linkedin, MessageCircle, 
  Heart, MessageSquare, Share2, Bookmark, Send, MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, normalizePlatform } from "@/lib/utils";
import { socialPlatforms, SocialPlatformId } from "@/components/icons/platform-metadata";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScheduledPost } from "@/hooks/useScheduledPosts";
import { useSocialStats, SocialAccountStat } from "@/hooks/useSocialStats";

interface FeedPreviewProps {
  post: ScheduledPost;
  isOpen: boolean;
  onClose: () => void;
}

export const FeedPreview = ({ post, isOpen, onClose }: FeedPreviewProps) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatformId>(
    (normalizePlatform(post.platforms[0]) as SocialPlatformId) || "instagram"
  );
  
  const { byPlatform } = useSocialStats();
  const getAccount = (platform: string) => byPlatform[normalizePlatform(platform)]?.[0];

  const renderPreview = () => {
    const account = getAccount(selectedPlatform);
    
    switch (selectedPlatform) {
      case "instagram":
        return <InstagramPreview post={post} account={account} />;
      case "facebook":
        return <FacebookPreview post={post} account={account} />;
      case "twitter":
      case "x" as any:
        return <XPreview post={post} account={account} />;
      case "linkedin":
        return <LinkedInPreview post={post} account={account} />;
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
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl">
        <DialogHeader className="sr-only">
            <DialogTitle>Prévia da Publicação</DialogTitle>
            <DialogDescription>Visualize como o post agendado aparecerá nas redes sociais antes de ser publicado.</DialogDescription>
        </DialogHeader>
        <div className="flex h-[80vh]">
          {/* Sidebar - Platforms */}
          <div className="w-20 border-r border-border/40 bg-muted/10 flex flex-col items-center py-5 gap-3">
            {post.platforms.map((pId) => {
              const normalized = normalizePlatform(pId) as SocialPlatformId;
              const platform = socialPlatforms.find((p) => p.id === normalized);
              if (!platform) return null;
              const Icon = platform.icon;
              const isSelected = selectedPlatform === normalized;

              const btnBg = isSelected
                ? normalized === "snapchat"
                  ? "bg-[#FFFC00] text-black scale-110 shadow-lg shadow-yellow-400/40"
                  : normalized === "tiktok"
                  ? "bg-black text-white scale-110 shadow-lg shadow-black/40"
                  : normalized === "whatsapp"
                  ? "bg-[#25D366] text-white scale-110 shadow-lg shadow-green-400/40"
                  : normalized === "instagram"
                  ? "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white scale-110 shadow-lg"
                  : normalized === "facebook"
                  ? "bg-[#1877F2] text-white scale-110 shadow-lg shadow-blue-500/40"
                  : normalized === "twitter"
                  ? "bg-black text-white scale-110 shadow-lg"
                  : normalized === "linkedin"
                  ? "bg-[#0A66C2] text-white scale-110 shadow-lg shadow-blue-600/40"
                  : normalized === "youtube"
                  ? "bg-[#FF0000] text-white scale-110 shadow-lg shadow-red-500/40"
                  : normalized === "telegram"
                  ? "bg-[#0088CC] text-white scale-110 shadow-lg shadow-sky-500/40"
                  : normalized === "pinterest"
                  ? "bg-[#E60023] text-white scale-110 shadow-lg shadow-red-600/40"
                  : normalized === "threads"
                  ? "bg-black text-white scale-110 shadow-lg"
                  : "bg-primary text-white scale-110 shadow-lg"
                : "bg-muted/40 text-muted-foreground hover:bg-muted";

              return (
                <button
                  key={normalized}
                  onClick={() => setSelectedPlatform(normalized)}
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
                  {post.published_at 
                    ? `Publicado em: ${new Date(post.published_at).toLocaleString()}`
                    : post.scheduled_at 
                    ? `Agendado para: ${new Date(post.scheduled_at).toLocaleString()}` 
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

const InstagramPreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
  <div className="flex flex-col bg-white text-zinc-900">
    {/* IG Header */}
    <div className="flex items-center justify-between p-3 border-b border-zinc-100">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px] overflow-hidden">
          <div className="w-full h-full rounded-full bg-white p-[1.5px] overflow-hidden">
            {account?.profile_picture ? (
              <img src={account.profile_picture} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full rounded-full bg-zinc-200" />
            )}
          </div>
        </div>
        <span className="text-sm font-bold text-zinc-900">{account?.username || "seu_perfil"}</span>
      </div>
      <MoreHorizontal className="w-5 h-5 text-zinc-500" />
    </div>
    
    {/* IG Media */}
    <div className="aspect-square bg-zinc-50 flex items-center justify-center overflow-hidden">
      {post.media_ids && post.media_ids[0] ? (
        <img src={post.media_ids[0]} className="w-full h-full object-cover" />
      ) : (
        <Instagram className="w-12 h-12 text-zinc-300" />
      )}
    </div>

    {/* IG Actions */}
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 text-zinc-900">
          <Heart className="w-6 h-6" />
          <MessageCircle className="w-6 h-6" />
          <Send className="w-6 h-6" />
        </div>
        <Bookmark className="w-6 h-6 text-zinc-900" />
      </div>
      <div className="space-y-1">
        <p className="text-sm">
          <span className="font-bold mr-2 text-zinc-900">{account?.username || "seu_perfil"}</span>
          <span className="text-zinc-800">{post.content}</span>
        </p>
        <p className="text-[10px] text-zinc-400 font-medium uppercase">
          {post.published_at ? new Date(post.published_at).toLocaleString() : post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : "Agora"}
        </p>
      </div>
    </div>
  </div>
);

const FacebookPreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
  <div className="flex flex-col bg-white text-zinc-900">
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden">
          {account?.profile_picture && <img src={account.profile_picture} className="w-full h-full object-cover" />}
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-900">{account?.username || "Sua Página"}</p>
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-zinc-500 font-medium">
               {post.published_at ? new Date(post.published_at).toLocaleString() : "Agora"} ·
            </p>
            <svg viewBox="0 0 16 16" className="w-3 h-3 text-zinc-500 fill-current"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM4.5 11.5v-7l7 3.5-7 3.5z" opacity="0.3"/><path d="M8 1a7 7 0 100 14A7 7 0 008 1zM2 8a6 6 0 1112 0A6 6 0 012 8z"/><path d="M8 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM5.5 8a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z"/></svg>
          </div>
        </div>
      </div>
      <p className="text-sm mb-3 whitespace-pre-wrap text-zinc-800 leading-relaxed">{post.content}</p>
    </div>
    <div className="aspect-[1.91/1] bg-zinc-50 overflow-hidden border-y border-zinc-100">
        {post.media_ids && post.media_ids[0] ? (
            <img src={post.media_ids[0]} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex items-center justify-center opacity-10">
                <Facebook className="w-16 h-16" />
            </div>
        )}
    </div>
    <div className="p-1.5 flex items-center justify-around">
      <Button variant="ghost" size="sm" className="text-zinc-600 flex-1 hover:bg-zinc-100 h-10 gap-2 font-semibold">
        <Heart className="w-5 h-5" /> Curtir
      </Button>
      <Button variant="ghost" size="sm" className="text-zinc-600 flex-1 hover:bg-zinc-100 h-10 gap-2 font-semibold">
        <MessageSquare className="w-5 h-5" /> Comentar
      </Button>
      <Button variant="ghost" size="sm" className="text-zinc-600 flex-1 hover:bg-zinc-100 h-10 gap-2 font-semibold">
        <Share2 className="w-5 h-5" /> Compartilhar
      </Button>
    </div>
  </div>
);

const XPreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
  <div className="flex flex-col p-4 bg-white text-zinc-900 border-zinc-200">
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 shrink-0 overflow-hidden">
        {account?.profile_picture && <img src={account.profile_picture} className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="font-bold text-sm text-zinc-900">{account?.username || "Perfil X"}</span>
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#1d9bf0] fill-current"><path d="M22.5 12.5c0-1.58-.8-2.47-1.24-3.23.96-1.88.77-2.54.58-3.04-.31-.82-1.37-1.31-2.22-1.21-1.01.12-1.61-.31-2.4-1.01C15.65 2.62 14.61 2 13.51 2c-1.1 0-2.14.62-3.71 1.99-.79.7-1.39 1.13-2.4 1.01-.85-.1-1.91.39-2.22 1.21-.19-.5-.38 1.16.58 3.04-.44.76-1.24 1.65-1.24 3.23 0 1.58.8 2.47 1.24 3.23-.96 1.88-.77 2.54-.58 3.04.31.82 1.37 1.31 2.22 1.21 1.01-.12 1.61.31 2.4 1.01C11.35 21.38 12.39 22 13.51 22c1.1 0 2.14-.62 3.71-1.99.79-.7 1.39-1.13 2.4-1.01.85.1 1.91-.39 2.22-1.21.19-.5.38-1.16-.58-3.04.44-.76 1.24-1.65 1.24-3.23zM9.93 16.12l-3.17-3.17 1.41-1.41 1.76 1.76 4.93-4.93 1.41 1.41-6.34 6.34z"/></svg>
          <span className="text-zinc-500 text-sm">@{account?.username?.toLowerCase().replace(/\s/g, '') || "perfil_x"} · {post.published_at ? new Date(post.published_at).toLocaleDateString() : "agora"}</span>
        </div>
        <p className="text-sm mb-3 whitespace-pre-wrap leading-normal text-zinc-900">{post.content}</p>
        <div className="flex gap-1 overflow-hidden rounded-2xl border border-zinc-200 mb-3 bg-zinc-50">
            {post.media_ids && post.media_ids.length > 0 ? (
                <div className={cn("grid w-full", post.media_ids.length > 1 ? "grid-cols-2 aspect-[16/9]" : "grid-cols-1")}>
                    {post.media_ids.slice(0, 4).map((url, i) => (
                        <div key={i} className="relative aspect-square border-[0.5px] border-zinc-200 overflow-hidden">
                            <img src={url} className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="w-full h-24 flex items-center justify-center opacity-10">
                    <Twitter className="w-10 h-10" />
                </div>
            )}
        </div>
        <div className="flex items-center justify-between text-zinc-500 max-w-sm px-1">
          <div className="flex items-center gap-1 group hover:text-blue-500 transition-colors cursor-default">
            <MessageCircle className="w-4.5 h-4.5" /> <span className="text-xs">0</span>
          </div>
          <div className="flex items-center gap-1 group hover:text-green-500 transition-colors cursor-default">
            <RefreshCw className="w-4.5 h-4.5" /> <span className="text-xs">0</span>
          </div>
          <div className="flex items-center gap-1 group hover:text-pink-500 transition-colors cursor-default">
            <Heart className="w-4.5 h-4.5" /> <span className="text-xs">0</span>
          </div>
          <div className="flex items-center gap-1 group hover:text-blue-500 transition-colors cursor-default">
            <Share2 className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const RefreshCw = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);

const LinkedInPreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
  <div className="flex flex-col bg-white text-zinc-900 shadow-sm border border-zinc-200">
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded bg-zinc-100 border border-zinc-200 shrink-0 overflow-hidden">
          {account?.profile_picture && <img src={account.profile_picture} className="w-full h-full object-cover" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-zinc-900">{account?.username || "Seu Perfil Profissional"}</p>
          <p className="text-[10px] text-zinc-500 leading-tight">Membro • {post.published_at ? new Date(post.published_at).toLocaleDateString() : "Agora"} • 🌐</p>
        </div>
      </div>
      <p className="text-sm text-zinc-800 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>
    </div>
    {post.media_ids && post.media_ids[0] && (
      <div className="aspect-[1.91/1] bg-zinc-50 overflow-hidden border-y border-zinc-100">
        <img src={post.media_ids[0]} className="w-full h-full object-cover" />
      </div>
    )}
    <div className="p-1 px-3 flex items-center gap-1 border-t border-zinc-100">
      <Button variant="ghost" size="sm" className="text-zinc-600 hover:bg-zinc-100 text-xs gap-2 font-semibold h-10 px-2 flex-1">
        <ThumbsUp className="w-5 h-5" /> Gostei
      </Button>
      <Button variant="ghost" size="sm" className="text-zinc-600 hover:bg-zinc-100 text-xs gap-2 font-semibold h-10 px-2 flex-1">
        <MessageSquare className="w-5 h-5" /> Comentar
      </Button>
      <Button variant="ghost" size="sm" className="text-zinc-600 hover:bg-zinc-100 text-xs gap-2 font-semibold h-10 px-2 flex-1">
        <Share2 className="w-5 h-5" /> Compartilhar
      </Button>
      <Button variant="ghost" size="sm" className="text-zinc-600 hover:bg-zinc-100 text-xs gap-2 font-semibold h-10 px-2 flex-1">
        <Send className="w-5 h-5" /> Enviar
      </Button>
    </div>
  </div>
);

const ThumbsUp = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
);

const TelegramPreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
  <div className="flex flex-col bg-[#54a9eb] h-full min-h-[400px] p-4 relative font-sans text-zinc-900">
    <div className="absolute top-0 left-0 right-0 h-12 bg-[#54a9eb] border-b border-white/10 flex items-center px-4 justify-between z-10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/10 overflow-hidden">
              {account?.profile_picture && <img src={account.profile_picture} className="w-full h-full object-cover" />}
            </div>
            <div>
                <p className="text-white text-sm font-bold leading-tight">{account?.username || "Seu Canal/Grupo"}</p>
                <p className="text-white/70 text-[10px]">{account?.followers_count || 0} inscritos</p>
            </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-white" />
    </div>
    
    <div className="mt-12 max-w-[85%] bg-white rounded-xl overflow-hidden shadow-md self-start relative border-l-4 border-[#54a9eb]">
      {post.media_ids && post.media_ids[0] && (
        <div className="overflow-hidden">
          <img src={post.media_ids[0]} className="w-full h-auto object-cover max-h-[300px]" />
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

const WhatsAppPreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
  <div className="flex flex-col bg-[#efeae2] h-full min-h-[400px] p-4 relative font-sans text-zinc-900">
    <div className="absolute top-0 left-0 right-0 h-14 bg-[#075e54] flex items-center px-4 justify-between z-10">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-300 overflow-hidden">
                {account?.profile_picture && <img src={account.profile_picture} className="w-full h-full object-cover" />}
            </div>
            <span className="text-white text-[0.95rem] font-medium">{account?.username || "Contato / Grupo"}</span>
        </div>
        <div className="flex items-center gap-4 text-white">
            <div className="w-4 h-4 border-2 border-white rounded-sm opacity-70" />
            <MoreHorizontal className="w-5 h-5" />
        </div>
    </div>
    
    <div className="mt-14 max-w-[85%] bg-white rounded-lg p-2 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] self-start relative after:content-[''] after:absolute after:top-0 after:-left-2 after:w-0 after:h-0 after:border-t-[8px] after:border-t-white after:border-l-[8px] after:border-l-transparent">
      {post.media_ids && post.media_ids[0] && (
        <div className="rounded-md overflow-hidden mb-2">
          <img src={post.media_ids[0]} className="w-full h-auto object-cover max-h-[300px]" />
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

const TikTokPreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
    <div className="flex flex-col bg-black h-full min-h-[500px] relative font-sans overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
            {post.media_ids && post.media_ids[0] ? (
                <img src={post.media_ids[0]} className="w-full h-full object-cover grayscale blur-sm" />
            ) : (
                <div className="text-white/10 italic">Video Preview</div>
            )}
        </div>
        
        {/* Overlay Content */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 flex flex-col justify-end p-4">
            <div className="flex items-end justify-between">
                <div className="flex-1 text-white pr-12">
                    <p className="font-bold text-sm mb-2">@{account?.username || "seu_perfil"}</p>
                    <p className="text-xs leading-relaxed line-clamp-3 mb-2">{post.content}</p>
                    <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 border border-white/50 animate-spin-slow rotate-45" />
                        <span className="text-[10px] animate-slide-left whitespace-nowrap">Som original - SocialHub Pro</span>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-4 text-white">
                    <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden mb-2 relative">
                        {account?.profile_picture && <img src={account.profile_picture} className="w-full h-full object-cover" />}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#ff0050] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">+</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 flex items-center justify-center"><Heart className="w-7 h-7 fill-white" /></div>
                        <span className="text-[10px] font-bold">12.5K</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 flex items-center justify-center"><MessageCircle className="w-7 h-7 fill-white translate-y-1" /></div>
                        <span className="text-[10px] font-bold">452</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 flex items-center justify-center"><Send className="w-7 h-7 fill-white -rotate-12" /></div>
                        <span className="text-[10px] font-bold">Share</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const YouTubePreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
    <div className="flex flex-col bg-white text-zinc-900 border-zinc-200 font-sans">
        <div className="aspect-video bg-zinc-100 overflow-hidden relative">
            {post.media_ids && post.media_ids[0] ? (
                <img src={post.media_ids[0]} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white font-bold">Video Thumbnail</div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-medium">10:45</div>
        </div>
        <div className="p-3 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-100 shrink-0 border border-zinc-200 overflow-hidden">
                {account?.profile_picture && <img src={account.profile_picture} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[0.95rem] leading-tight line-clamp-2 mb-1">{post.content.split('\n')[0] || "Sem título"}</h4>
                <p className="text-[0.75rem] text-zinc-500">{account?.username || "Seu Canal"} • 0 visualizações • agora</p>
                <div className="mt-2 text-xs text-zinc-600 line-clamp-2 leading-relaxed italic">{post.content}</div>
            </div>
            <MoreHorizontal className="w-5 h-5 text-zinc-400" />
        </div>
    </div>
);

const PinterestPreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
    <div className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm border border-zinc-100">
        <div className="relative">
            {post.media_ids && post.media_ids[0] ? (
                <img src={post.media_ids[0]} className="w-full h-full object-cover" />
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
                    {account?.profile_picture && <img src={account.profile_picture} className="w-full h-full object-cover" />}
                </div>
                <span className="text-sm font-medium text-zinc-900">{account?.username || "Seu Perfil"}</span>
            </div>
        </div>
    </div>
);

const SnapchatPreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
    <div className="flex flex-col bg-[#FFFC00] h-full min-h-[500px] relative font-sans overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
            {post.media_ids && post.media_ids[0] ? (
                <img src={post.media_ids[0]} className="w-full h-full object-cover" />
            ) : (
                <div className="text-black/50 font-bold uppercase tracking-widest text-2xl rotate-45 opacity-10">Snap Preview</div>
            )}
        </div>
        
        {/* Overlay Content */}
        <div className="absolute top-4 left-4 flex items-center gap-2 drop-shadow-md">
            <div className="w-10 h-10 rounded-full border-2 border-white bg-zinc-300 overflow-hidden">
                {account?.profile_picture && <img src={account.profile_picture} className="w-full h-full object-cover" />}
            </div>
            <div className="text-white">
                <p className="text-sm font-bold leading-none">{account?.username || "Perfil"}</p>
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

const WebsitePreview = ({ post, account }: { post: ScheduledPost, account?: SocialAccountStat }) => (
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
            {post.media_ids && post.media_ids[0] ? (
                <img src={post.media_ids[0]} className="w-full h-48 object-cover" />
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
);

