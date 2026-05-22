import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, Filter, Users, Hash, User, Radio, Plus, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/SafeImage";

interface ChatListProps {
  chats: any[];
  activeChatId: string | null;
  onSelectChat: (chat: any) => void;
  sidebarTab: string;
  setSidebarTab: (tab: any) => void;
  chatSearchQuery: string;
  setChatSearchQuery: (query: string) => void;
  getPlatformStyles: (platform: string | null) => any;
  loading?: boolean;
}

const sidebarTabs = [
  { id: "all", label: "Tudo", icon: MessageCircle },
  { id: "individual", label: "Privado", icon: User },
  { id: "groups", label: "Grupos", icon: Users },
  { id: "channels", label: "Canais", icon: Hash },
  { id: "broadcast", label: "Listas", icon: Radio },
];

export const ChatList = ({
  chats,
  activeChatId,
  onSelectChat,
  sidebarTab,
  setSidebarTab,
  chatSearchQuery,
  setChatSearchQuery,
  getPlatformStyles,
  loading
}: ChatListProps) => {
  return (
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-xl border-r border-white/5 overflow-hidden">
      {/* Header Sidebar */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            Mensagens
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black">
              {chats.length}
            </Badge>
          </h2>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar conversas..."
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {sidebarTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                sidebarTab === tab.id
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List of Chats */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-50">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-bold uppercase tracking-widest">Carregando...</span>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center p-6 opacity-30">
            <MessageCircle className="w-12 h-12 mb-3" />
            <p className="text-sm font-bold uppercase tracking-widest">Nenhuma conversa</p>
            <p className="text-[10px] uppercase font-medium mt-1">Tente mudar o filtro ou buscar outro nome</p>
          </div>
        ) : (
          chats.map((chat) => {
            const styles = getPlatformStyles(chat.platform);
            const isActive = activeChatId === chat.key;

            return (
              <button
                key={chat.key}
                onClick={() => onSelectChat(chat)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl transition-all relative group",
                  isActive
                    ? "bg-white/10 shadow-xl border border-white/10"
                    : "hover:bg-white/5 border border-transparent"
                )}
              >
                {isActive && (
                  <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full", styles.bg)} />
                )}

                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-lg">
                    <SafeImage
                      src={chat.photoUrl || ""}
                      alt={chat.name}
                      className="w-full h-full object-cover"
                      isWhatsAppImage={chat.photoUrl?.includes('whatsapp.net') || chat.platform === 'whatsapp'}
                    />
                  </div>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-5 h-5 rounded-lg border-2 border-[#0A0A0A] flex items-center justify-center shadow-lg",
                    styles.bg
                  )}>
                    <div className="w-2.5 h-2.5 text-white">
                      {/* Platform Icon placeholder - simplified */}
                      <span className="text-[8px] font-black uppercase">{chat.platform?.substring(0, 1)}</span>
                    </div>
                  </div>
                  {chat.is_online && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0A0A0A] animate-pulse" />
                  )}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className={cn(
                      "font-black text-sm truncate",
                      isActive ? "text-white" : "text-white/80 group-hover:text-white"
                    )}>
                      {chat.name}
                    </h4>
                    {chat.lastMsg && (
                      <span className="text-[9px] font-bold text-muted-foreground uppercase whitespace-nowrap">
                        {new Date(chat.lastMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate font-medium">
                    {chat.lastMsg ? chat.lastMsg.content : (
                      <span className="opacity-50 italic">Nenhuma mensagem</span>
                    )}
                  </p>
                </div>

                {chat.unreadCount > 0 && (
                  <Badge className="bg-primary text-white font-black text-[10px] min-w-[20px] h-5 flex items-center justify-center p-0 rounded-lg">
                    {chat.unreadCount}
                  </Badge>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
