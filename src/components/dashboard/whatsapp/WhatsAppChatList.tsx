import { useState, useEffect, useCallback } from "react";
import { Smartphone, MessageCircle, User, Plus, ChevronDown, Archive, Pin, Trash2, ArchiveX, Users, Building2, UserPlus, List, MessageSquarePlus, Contact, MoreVertical, Heart, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DialPad } from "./DialPad";

interface WhatsAppChatListProps {
  chats: any[];
  activeChatId: string | null;
  onSelectChat: (chat: any) => void;
  sidebarTab: string;
  setSidebarTab: (tab: string) => void;
  loading?: boolean;
  onStartNewChat?: (phone: string) => void;
  onDeleteChat?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
  onNavigateInbox?: (nav: string) => void;
  onShowContactModal?: () => void;
  onToggleArchived?: () => void;
  showArchived?: boolean;
  onArchiveChat?: (conversationId: string) => void;
  onViewStatus?: (contactName?: string) => void;
}

const FILTERS = [
  { key: "all", label: "Tudo" },
  { key: "unread", label: "Não lidas" },
  { key: "favorites", label: "Favoritas" },
  { key: "groups", label: "Grupos" },
];

export const WhatsAppChatList = ({
  chats,
  activeChatId,
  onSelectChat,
  sidebarTab,
  setSidebarTab,
  loading,
  onStartNewChat,
  onDeleteChat,
  onNavigateTab,
  onNavigateInbox,
  onShowContactModal,
  onToggleArchived,
  showArchived,
  onArchiveChat,
  onViewStatus
}: WhatsAppChatListProps) => {
  const [showDialPad, setShowDialPad] = useState(false);

  const filteredChats = chats.filter(c => {
    if (sidebarTab === "unread") return (c.unreadCount || 0) > 0;
    return true;
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const fetchAvatar = async () => {
      try {
        // Priority 1: WhatsApp connection photo (admin's WhatsApp Business profile)
        const { data: conn } = await supabase
          .from('social_connections')
          .select('profile_image_url, metadata, profile_picture')
          .eq('user_id', user.id)
          .eq('platform', 'whatsapp')
          .limit(1)
          .maybeSingle();
        const connAvatar = conn?.profile_image_url || conn?.metadata?.avatar_url || conn?.profile_picture;
        if (!cancelled && connAvatar) { setProfileAvatar(connAvatar); return; }

        // Priority 2: Admin's platform profile photo (fallback)
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();
        const profileAvatar = profile?.avatar_url;
        if (!cancelled && profileAvatar) setProfileAvatar(profileAvatar);
      } catch {
      }
    };

    fetchAvatar();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleDisconnectWhatsApp = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('social_connections')
        .update({ is_connected: false, access_token: null, refresh_token: null })
        .eq('user_id', user.id)
        .eq('platform', 'whatsapp');
      if (error) throw error;
      toast({ title: "WhatsApp desconectado", description: "Você foi desconectado com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao desconectar", description: e.message, variant: "destructive" });
    }
  }, [user?.id, toast]);

  const activeFilter = sidebarTab === "all" ? 0 : sidebarTab === "unread" ? 1 : sidebarTab === "favorites" ? 2 : 3;

  return (
    <div className="flex flex-col h-full bg-[#111B21] border-r border-white/5 overflow-hidden relative">
      {/* Dial Pad — floating overlay dentro da sidebar */}
      <DialPad
        open={showDialPad}
        onClose={() => setShowDialPad(false)}
        onStartConversation={(phone) => { onStartNewChat?.(phone); setShowDialPad(false); }}
        onStartGroup={() => { onStartNewChat?.(""); setShowDialPad(false); }}
      />

      {/* Arquivadas + Filtros + Chevron + "..." — linha subiu para o topo */}
      <div className="flex gap-1.5 px-5 pt-2.5 pb-1 overflow-x-auto scrollbar-none items-center shrink-0">
        <button
          onClick={onToggleArchived}
          title={showArchived ? "Conversas ativas" : "Arquivadas"}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full transition-colors shrink-0",
            showArchived
              ? "bg-[#00A884]/20 text-[#00A884]"
              : "bg-[#202C33] text-[#8696a0] hover:bg-[#2a3942]"
          )}
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
        {FILTERS.map((f, i) => (
          <button
            key={f.key}
            onClick={() => setSidebarTab(f.key)}
            className={cn(
              "rounded-full cursor-pointer whitespace-nowrap transition-colors border shrink-0",
              activeFilter === i
                ? "bg-[#00A884]/20 text-[#00A884] border-transparent"
                : "border-[#8696a0]/30 text-[#8696a0] hover:bg-[#202C33]",
              i === 0 && "text-[11px] px-3 py-1",
              i === 1 && "text-[9px] px-2 py-0.5",
              i === 2 && "text-[10px] px-2.5 py-0.5",
              i === 3 && "text-[8px] px-2 py-0.5"
            )}
          >
            {f.label}
          </button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center w-6 h-6 rounded-full border border-[#8696a0]/30 text-[#8696a0] hover:bg-[#202C33] transition-colors shrink-0">
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer" onClick={() => setSidebarTab("unread")}>
              <MessageCircle className="w-4 h-4 mr-2" /> Não lidas
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setSidebarTab("favorites")}>
              <Pin className="w-4 h-4 mr-2" /> Favoritas
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setSidebarTab("groups")}>
              <Users className="w-4 h-4 mr-2" /> Grupos
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => { /* Futuro: redefinir filtros */ }}>
              Limpar filtros
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* "..." três pontos — ferramentas originais */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center w-6 h-6 rounded-full border border-[#8696a0]/30 text-[#8696a0] hover:bg-[#202C33] transition-colors shrink-0">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigateInbox?.("communities")}>
              <Building2 className="w-4 h-4 mr-2" /> Criar comunidade
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => { onToggleArchived?.(); }}>
              <Archive className="w-4 h-4 mr-2" /> {showArchived ? "Conversas ativas" : "Conversas arquivadas"}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => { setSidebarTab("favorites"); }}>
              <Heart className="w-4 h-4 mr-2" /> Mensagens favoritas
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigateTab?.("settings")}>
              <Settings className="w-4 h-4 mr-2" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={handleDisconnectWhatsApp}>
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* STATUS section compacta — igual WhatsApp Web */}
      <div className="px-5 pt-0.5 pb-1.5 border-b border-white/5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#6D6D6D]">STATUS</span>
        <div className="flex gap-2 mt-1.5 overflow-x-auto scrollbar-none">
          {[
            { name: "Add", initial: "A", active: false, isMe: true },
            { name: "Aliza", initial: "A", active: true, viewed: false },
            { name: "Tahir", initial: "T", active: true, viewed: false },
            { name: "Smantha", initial: "S", active: true, viewed: true },
          ].map((s, i) => (
            <div
              key={i}
              onClick={() => onViewStatus?.(s.isMe ? "Meu status" : s.name)}
              className="flex flex-col items-center gap-0.5 shrink-0 cursor-pointer"
            >
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                s.isMe
                  ? "bg-[#242424] text-white"
                  : s.viewed
                    ? "bg-[#242424] text-white ring-2 ring-[#364147]"
                    : "bg-[#242424] text-white ring-2 ring-[#36CE00]"
              )}>
                {s.name === "Add" ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  s.initial
                )}
              </div>
              <span className="text-[9px] text-[#B7B7B7] truncate max-w-[44px]">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Header: TODAS AS CONVERSAS sempre visível + rótulo do filtro atual */}
      <div className="flex items-center gap-2 px-5 pt-2 pb-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#A0A0A0]">TODAS AS CONVERSAS</span>
        <span className={cn(
          "text-[11px] font-bold uppercase tracking-widest",
          sidebarTab === "all" ? "text-[#BEBEBE]" : "text-[#00A884]"
        )}>
          {sidebarTab === "unread" ? "NÃO LIDAS" :
           sidebarTab === "groups" ? "GRUPOS" :
           sidebarTab === "favorites" ? "FAVORITAS" :
           "PRIVADAS"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-50">
            <div className="w-8 h-8 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-bold uppercase tracking-widest">Carregando...</span>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center p-6 opacity-30">
            <MessageCircle className="w-12 h-12 mb-3" />
            <p className="text-sm font-bold uppercase tracking-widest">Nenhuma conversa</p>
            <p className="text-[10px] uppercase font-medium mt-1">Conecte seu WhatsApp Business para começar</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isActive = activeChatId === chat.key;
            const previewText = chat.lastMsg?.content || "";
            const isOwn = chat.lastMsg?.is_self;
            const isCallEnded = previewText.toLowerCase().includes("call ended") || previewText.toLowerCase().includes("chamada");
            return (
              <div
                key={chat.key}
                onClick={() => onSelectChat(chat)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 transition-all relative group cursor-pointer",
                  isActive
                    ? "bg-[#2a3942]"
                    : "hover:bg-[#202C33]"
                )}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2a3942]">
                    <SafeImage
                      src={chat.photoUrl || ""}
                      alt={chat.name}
                      className="w-full h-full object-cover"
                      isWhatsAppImage
                    />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[#00A884] border-2 border-[#111B21] flex items-center justify-center">
                    <Smartphone className="w-2 h-2 text-white" />
                  </div>
                  {chat.pinned && (
                    <div className="absolute -top-0.5 -left-0.5 w-4.5 h-4.5 rounded-full bg-[#202C33] border-2 border-[#111B21] flex items-center justify-center">
                      <Pin className="w-2.5 h-2.5 text-[#8696a0]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-left min-w-0 border-b border-white/5 pb-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {chat.is_online && (
                        <div className="w-2 h-2 rounded-full bg-[#36CE00] shrink-0" />
                      )}
                      <h4 className={cn("text-base font-bold truncate", isActive ? "text-white" : "text-[#B8B8B8]")}>
                        {chat.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {chat.pinned && <Pin className="w-3 h-3 text-[#8696a0]" />}
                      {chat.lastMsg && (
                        <span className="text-[11px] text-[#727272] whitespace-nowrap font-medium">
                          {new Date(chat.lastMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] text-[#8A8A8A] truncate mt-0.5 flex items-center gap-1">
                    {isCallEnded ? (
                      <>
                        <ChevronDown className="w-3 h-3 rotate-[45deg] text-[#A1A1A1]" />
                        <span>Call ended</span>
                      </>
                    ) : previewText ? (
                      <>
                        {isOwn && <span className="text-[#969696] font-medium">You: </span>}
                        <span>{previewText}</span>
                      </>
                    ) : (
                      <span className="italic opacity-50">Nenhuma mensagem</span>
                    )}
                  </p>
                </div>

                {chat.unreadCount > 0 && (
                  <span className="bg-gradient-to-b from-[#36CE00] to-[#00D8A4] text-white text-[11px] font-bold min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full mr-1">
                    {chat.unreadCount}
                  </span>
                )}

                <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-[#8696a0]">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => { onArchiveChat?.(chat.id); toast({ title: chat.status === 'archived' ? "Conversa restaurada" : "Conversa arquivada" }); }}>
                        <ArchiveX className="w-4 h-4 mr-2" /> {chat.status === 'archived' ? "Desarquivar" : "Arquivar"} conversa
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => toast({ title: "Marcada como lida" })}>
                        <MessageCircle className="w-4 h-4 mr-2" /> Marcar como lida
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => toast({ title: chat.pinned ? "Desfixada" : "Fixada" })}>
                        <Pin className="w-4 h-4 mr-2" /> {chat.pinned ? "Desfixar" : "Fixar"} conversa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                        onClick={() => onDeleteChat?.(chat.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir conversa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB — Novo Chat / Adicionar (escondido quando um chat está aberto) */}
      {!activeChatId && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-[#00A884] hover:bg-[#06CF9C] shadow-lg shadow-black/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-10"
              title="Adicionar"
            >
              <Plus className="w-7 h-7 text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-64">
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => { setShowDialPad(true); }}>
              <MessageSquarePlus className="w-4 h-4 mr-3 text-[#00A884]" /> Nova conversa
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => { setShowDialPad(true); }}>
              <Users className="w-4 h-4 mr-3 text-[#00A884]" /> Nova conversa em grupo
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => onNavigateInbox?.("communities")}>
              <Building2 className="w-4 h-4 mr-3 text-[#00A884]" /> Criar comunidade
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => onNavigateTab?.("broadcasts")}>
              <List className="w-4 h-4 mr-3 text-[#00A884]" /> Lista de transmissão
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => setShowDialPad(true)}>
              <Contact className="w-4 h-4 mr-3 text-[#00A884]" /> Contatos da agenda
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-2.5" onClick={() => onShowContactModal?.()}>
              <UserPlus className="w-4 h-4 mr-3 text-[#00A884]" /> Adicionar novo contato
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
