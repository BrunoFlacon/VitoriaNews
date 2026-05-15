import { useState, useRef, useMemo } from "react";
import { cn, getWhatsAppMediaUrl } from "@/lib/utils";
import { 
  Send, MoreHorizontal, Search, RefreshCw, X, Edit, Trash2, MessageCircle, 
  User, Paperclip, Image, Video, Mic, MapPin, CheckCircle2, ChevronLeft 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { SafeImage } from "@/components/ui/SafeImage";

interface ChatWindowProps {
  activeChat: any;
  messages: any[];
  onSendMessage: (content: string, attachments: any[]) => void;
  onDeleteConversation: (id: string) => void;
  onOpenInfo: (chat: any) => void;
  onSync: (platform: string) => void;
  getPlatformStyles: (platform: string | null) => any;
  getTypeLabel: (type: string) => string;
  user: any;
  loading?: boolean;
  onBack?: () => void;
}

export const ChatWindow = ({
  activeChat,
  messages,
  onSendMessage,
  onDeleteConversation,
  onOpenInfo,
  onSync,
  getPlatformStyles,
  getTypeLabel,
  user,
  loading,
  onBack
}: ChatWindowProps) => {
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const styles = getPlatformStyles(activeChat.platform);

  const filteredMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages;
    return messages.filter(m => m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()));
  }, [messages, chatSearchQuery]);

  const handleSend = () => {
    if (!replyMessage.trim() && attachments.length === 0) return;
    onSendMessage(replyMessage, attachments);
    setReplyMessage("");
    setAttachments([]);
  };

  return (
    <div className="h-full flex flex-col bg-muted/5">
      {/* Header */}
      <div className={cn("px-2 md:px-4 py-3 border-b border-white/5 flex items-center justify-between z-10 shrink-0", styles.chatBg)}>
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {/* Mobile Back Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden rounded-xl shrink-0" 
            onClick={onBack}
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </Button>

          <div 
            className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center overflow-hidden border border-white/5 shadow-xl cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all shrink-0", styles.softBg)}
            onClick={() => onOpenInfo(activeChat)}
          >
            {activeChat.photoUrl ? (
              <SafeImage 
                src={activeChat.photoUrl} 
                alt={activeChat.name}
                className="w-full h-full object-cover" 
                isWhatsAppImage={activeChat.photoUrl?.includes('whatsapp.net') || activeChat.platform === 'whatsapp'}
              />
            ) : <User className={cn("w-6 h-6", styles.accent)} />}
          </div>
          <div>
            <h3 className={cn("font-bold text-base md:text-lg leading-tight truncate max-w-[140px] md:max-w-none", styles.accent)}>{activeChat.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4 font-bold uppercase tracking-wider border-current/20 text-white/70 bg-white/5", styles.accent)}>
                {getTypeLabel(activeChat.channel_type || 'group')}
              </Badge>
              {activeChat.members_count > 0 && (
                <span className="text-[10px] font-bold text-white/40">{activeChat.members_count.toLocaleString('pt-BR')} membros</span>
              )}
              {activeChat.is_online ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-tighter">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Conectado</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {activeChat.type === 'channel' && (
             <Button 
               variant="ghost" 
               size="icon" 
               className="rounded-xl hover:bg-white/10" 
               disabled={loading}
               onClick={() => onSync(activeChat.platform)}
             >
               <RefreshCw className={cn("w-4 h-4 text-primary", loading && "animate-spin")} />
             </Button>
          )}
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setChatSearchOpen(!chatSearchOpen)}>
            <Search className="w-4 h-4 text-muted-foreground" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onOpenInfo(activeChat)} className="cursor-pointer">
                <MessageCircle className="w-4 h-4 mr-2" /> Ver Informações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDeleteConversation(activeChat.id)} 
                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir Histórico
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Bar */}
      {chatSearchOpen && (
        <div className={cn("px-4 py-2 border-b border-white/5 z-10", styles.chatBg)}>
          <div className="flex items-center gap-2">
            <Input 
              value={chatSearchQuery} 
              onChange={e => setChatSearchQuery(e.target.value)} 
              placeholder="Pesquisar nesta conversa..."
              className="h-8 text-sm bg-muted/30 border-white/10 rounded-xl"
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => { setChatSearchOpen(false); setChatSearchQuery(""); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={cn("flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar", styles.chatBg)}>
        {filteredMessages.length === 0 && chatSearchQuery ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <Search className="w-12 h-12 mb-2" />
            <p className="text-sm font-medium">Nenhuma mensagem encontrada</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <MessageCircle className="w-12 h-12 mb-2" />
            <p className="text-sm font-bold uppercase tracking-widest">Início da conversa</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            // No sistema atual, se status for 'received' não é self. Se for 'sent'/'scheduled' é self.
            const isSelf = msg.status !== "received";
            const msgStyles = getPlatformStyles(msg.platform);
            return (
              <div key={msg.id} className={cn("flex flex-col", isSelf ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] relative shadow-xl backdrop-blur-md group/msg transition-all",
                  isSelf ? cn(msgStyles.bubbleSelf, "rounded-tr-none") : cn(msgStyles.bubbleOther, "rounded-tl-none")
                )}>
                  <p className="leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
                  
                  {/* Media Content */}
                  {msg.metadata?.media_id && msg.platform === 'whatsapp' && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                      {msg.metadata.media_type === 'image' ? (
                        <SafeImage 
                          src={getWhatsAppMediaUrl(msg.metadata.media_id, msg.user_id)} 
                          alt="Mídia"
                          className="max-h-[300px] w-full object-contain"
                        />
                      ) : (
                        <div className="p-3 flex items-center gap-2 text-xs opacity-70">
                          <Paperclip className="w-4 h-4" />
                          <span>Mídia ({msg.metadata.media_type})</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1.5 mt-1 opacity-40 text-[9px] font-bold uppercase">
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isSelf && <CheckCircle2 className="w-2.5 h-2.5" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-background/80 backdrop-blur-sm">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex gap-1 mb-1.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary"><Paperclip className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary"><Image className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary"><Mic className="w-4 h-4" /></Button>
          </div>
          
          <div className="flex-1 relative">
            <Textarea
              placeholder="Digite uma mensagem..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="min-h-[44px] max-h-[200px] resize-none py-3 pr-12 bg-muted/30 border-white/10 rounded-2xl focus:ring-primary/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button 
              size="icon" 
              className={cn(
                "h-9 w-9 absolute right-1.5 bottom-1.5 rounded-xl shadow-lg transition-all",
                styles.bg
              )}
              onClick={handleSend}
              disabled={!replyMessage.trim() && attachments.length === 0}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
