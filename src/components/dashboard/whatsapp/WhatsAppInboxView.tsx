import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Smartphone, ArrowLeft, X, User, Phone, Tag, FileText, MessageCircle, Clock, Image, ShoppingBag, MessageSquare, Timer, Send, ChevronRight, Camera } from "lucide-react";
import { cn, getProxyUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useWhatsAppRealtime } from "@/hooks/useWhatsAppRealtime";
import { useFetchWhatsAppPhotos } from "@/hooks/useFetchWhatsAppPhotos";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppChatList } from "./WhatsAppChatList";
import { WhatsAppChatWindow } from "./WhatsAppChatWindow";
import { WhatsAppNavIcons } from "./WhatsAppNavIcons";
import { WhatsAppSettingsView } from "./WhatsAppSettingsView";
import { ContactSidebar } from "./ContactSidebar";

const resolvePhoto = (url: string | null | undefined) => {
  if (!url) return null;
  if (url.startsWith('http')) return getProxyUrl(url);
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  try {
    const { data } = supabase.storage.from("media").getPublicUrl(url);
    return data.publicUrl;
  } catch { return null; }
};

interface WhatsAppInboxViewProps {
  onBack?: () => void;
  initialPhone?: string | null;
  onChatConsumed?: () => void;
}

export function WhatsAppInboxView({ onBack, initialPhone, onChatConsumed }: WhatsAppInboxViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { conversations, conversationMessages, loading, refresh } = useWhatsAppRealtime(user?.id);

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState("all");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("chats");
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const { fetchPhotos, loading: photosLoading } = useFetchWhatsAppPhotos();
  const photosFetchedRef = useRef(false);

  // Navigate to a specific chat when initialPhone is provided (from PipelineBoard or ContactsTab)
  useEffect(() => {
    if (!user || !initialPhone || !onChatConsumed) return;
    const run = async () => {
      // Check if we already have a conversation with this phone
      const normalized = initialPhone.replace(/\D/g, '');
      const existing = conversations?.find(c =>
        c.contact_wa_id?.replace(/\D/g, '') === normalized
      );
      if (existing) {
        setActiveChatId(`wa-${existing.id}`);
      } else {
        // Create conversation directly (no user interaction needed)
        const { data: connections } = await supabase
          .from('social_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('platform', 'whatsapp')
          .not('phone_number_id', 'is', null)
          .limit(1);
        if (connections && connections.length > 0) {
          const { data: conv } = await supabase
            .from('whatsapp_conversations')
            .insert({
              user_id: user.id,
              connection_id: connections[0].id,
              contact_wa_id: initialPhone,
              contact_name: initialPhone,
            } as any)
            .select()
            .single();
          if (conv) setActiveChatId(`wa-${conv.id}`);
        }
      }
      onChatConsumed();
    };
    run();
  }, [user, initialPhone, onChatConsumed, conversations]);

  // Auto-fetch WhatsApp profile photos once on mount (not on conversation changes)
  useEffect(() => {
    if (user?.id && conversations && conversations.length > 0 && !photosFetchedRef.current) {
      const missingPhotos = conversations.some(c => !c.avatar_url);
      if (missingPhotos) {
        photosFetchedRef.current = true;
        fetchPhotos().then(result => {
          if (result?.results && result.results.length > 0) {
            refresh();
          }
        }).catch(() => {});
      }
    }
  }, [user?.id]);

  const waChats = useMemo(() => {
    return (conversations || []).map(c => {
      const photoUrl = resolvePhoto(c.avatar_url);
      return {
        key: `wa-${c.id}`,
        id: c.id,
        channelId: c.contact_wa_id,
        type: "individual",
        channel_type: "individual",
        lastMsg: c.last_message_preview ? { content: c.last_message_preview, created_at: c.last_message_at || c.created_at } : null,
        name: c.contact_name || c.contact_wa_id,
        photo: c.avatar_url,
        photoUrl,
        platform: "whatsapp",
        is_online: false,
        unreadCount: c.unread_count || 0,
      };
    });
  }, [conversations]);

  const filteredChats = useMemo(() => {
    let list = waChats;
    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [waChats, chatSearchQuery]);

  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    return filteredChats.find(c => c.key === activeChatId) || null;
  }, [activeChatId, filteredChats]);

  const activeMessages = useMemo(() => {
    if (!activeChatId) return [];
    const waConvId = activeChatId.startsWith('wa-') ? activeChatId.slice(3) : null;
    if (!waConvId) return [];
    const msgs = conversationMessages.get(waConvId) ?? [];
    return msgs
      .slice()
      .sort((a, b) => new Date(a.created_at || a.sent_at || "").getTime() - new Date(b.created_at || b.sent_at || "").getTime());
  }, [activeChatId, conversationMessages]);

  const handleSelectChat = useCallback((chat: any) => {
    setActiveChatId(chat.key);
    setSidebarOpen(false);
  }, []);

  const handleSendMessage = useCallback(async (content: string, attachments: any[]) => {
    if (!user || !activeChat) return;
    if (!content.trim() && (!attachments || attachments.length === 0)) return;
    try {
      // Upload attachments to Supabase Storage and get permanent URLs
      const mediaUrls: string[] = [];
      for (const att of (attachments || [])) {
        if (att.file) {
          // Upload file to storage
          const file = att.file instanceof Blob && !(att.file instanceof File)
            ? new File([att.file], att.name || 'audio.webm', { type: att.file.type || 'audio/webm' })
            : att.file;
          const ext = file.name.split('.').pop() || 'bin';
          const storagePath = `${user.id}/whatsapp/${Date.now()}_${crypto.randomUUID()}.${ext}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media')
            .upload(storagePath, file, { cacheControl: '3600', upsert: false });
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath);
          mediaUrls.push(publicUrl);
        } else if (att.url && !att.url.startsWith('blob:')) {
          // Already a permanent URL
          mediaUrls.push(att.url);
        }
        // Skip blob URLs that don't have a file (can't be uploaded)
      }

      // If no valid media URLs and no text, nothing to send
      if (!content.trim() && mediaUrls.length === 0) {
        toast({ title: "Nada para enviar", description: "Adicione texto ou um arquivo válido.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.from("messages").insert({
        user_id: user.id,
        conversation_id: activeChat.id,
        content: content.trim(),
        media_url: mediaUrls.join(","),
        status: "sending",
        platform: "whatsapp",
        recipient_phone: activeChat.channelId,
        recipient_name: activeChat.name,
      } as any).select().single();

      if (error) throw error;

      let sendSuccess = false;
      try {
        const { data: invokeResult, error: invokeError } = await supabase.functions.invoke('publish-post', {
          body: {
            content: content.trim(),
            mediaUrls,
            postType: "message",
            platforms: ["whatsapp"],
            recipientPhone: activeChat.channelId,
            postId: data.id,
          },
        });

        if (invokeError || !invokeResult?.success) {
          await supabase.from("messages").update({ status: "failed" } as any).eq("id", data.id);
          throw new Error(invokeError?.message || invokeResult?.message || "Erro ao enviar");
        }
        await supabase.from("messages").update({ status: "sent", sent_at: new Date().toISOString() } as any).eq("id", data.id);
        sendSuccess = true;
      } catch (e: any) {
        console.error("Send error:", e);
        toast({ title: "Mensagem salva, mas falhou ao enviar", description: e.message, variant: "destructive" });
      }

      if (sendSuccess) {
        toast({ title: "Mensagem enviada!" });
      }
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    }
  }, [user, activeChat, toast]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await supabase.from("whatsapp_conversations").delete().eq("id", id).eq("user_id", user.id);
      if (activeChatId === `wa-${id}`) setActiveChatId(null);
      await refresh();
      toast({ title: "Conversa removida" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  }, [user, activeChatId, toast, refresh]);

  const handleStartNewChat = useCallback(async (phone: string) => {
    if (!user) return;
    try {
      const { data: connections, error: connErr } = await supabase
        .from('social_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('platform', 'whatsapp')
        .not('phone_number_id', 'is', null)
        .limit(1);

      if (connErr) throw connErr;
      if (!connections || connections.length === 0) {
        toast({ title: "Nenhuma conexão WhatsApp encontrada", description: "Conecte seu WhatsApp Business primeiro.", variant: "destructive" });
        return;
      }

      const connectionId = connections[0].id;
      const { data: conv, error: convErr } = await supabase
        .from('whatsapp_conversations')
        .insert({
          user_id: user.id,
          connection_id: connectionId,
          contact_wa_id: phone,
          contact_name: phone,
        } as any)
        .select()
        .single();

      if (convErr) throw convErr;

      setActiveChatId(`wa-${conv.id}`);
      toast({ title: "Conversa criada!", description: `WhatsApp: ${phone}` });
    } catch (e: any) {
      toast({ title: "Erro ao criar conversa", description: e.message, variant: "destructive" });
    }
  }, [user, toast]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("messages").delete().eq("id", messageId);
      if (error) throw error;
      await refresh();
      return true;
    } catch (e: any) {
      return false;
    }
  }, [user, refresh]);

  const handleSync = useCallback(async (_platform: string) => {
    toast({ title: "Sincronizando WhatsApp..." });
    try {
      const { error } = await supabase.functions.invoke('sync-messaging-channels', {
        body: { platform: "whatsapp" },
      });
      if (error) throw error;
      toast({ title: "Sincronizado!" });
    } catch {
      toast({ title: "Erro na sincronização", variant: "destructive" });
    }
  }, [toast]);

  const renderPlaceholder = (title: string, subtitle: string) => (
              <div className="flex-1 flex items-center justify-center bg-[#222E35]">
      <div className="text-center">
        <h2 className="text-[26px] font-light text-[#E9EDEF] mb-3">{title}</h2>
        <p className="text-sm text-[#8696a0]">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="hidden md:flex">
        <WhatsAppNavIcons activeNav={activeNav} onNavChange={setActiveNav} />
      </div>

      {activeNav === "chats" ? (
        <>
          <div className={cn(
            "flex flex-col shrink-0",
            activeChat ? "hidden md:flex md:w-[300px]" : "w-full md:w-[300px]"
          )}>
            {onBack && (
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-sm">WhatsApp</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-7 w-7"
                  onClick={async () => {
                    const result = await fetchPhotos();
                    if (result) {
                      const updated = result.results.reduce((acc, r) => acc + r.conversations_updated, 0);
                      toast({ title: `Fotos atualizadas: ${updated} conversas` });
                      refresh();
                    }
                  }}
                  disabled={photosLoading}
                  title="Buscar fotos de perfil do WhatsApp"
                >
                  <Camera className={cn("w-4 h-4", photosLoading && "animate-pulse")} />
                </Button>
              </div>
            )}
            <WhatsAppChatList
              chats={filteredChats}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              sidebarTab={sidebarTab}
              setSidebarTab={setSidebarTab}
              chatSearchQuery={chatSearchQuery}
              setChatSearchQuery={setChatSearchQuery}
              loading={loading}
              onStartNewChat={handleStartNewChat}
              onDeleteChat={handleDeleteConversation}
            />
          </div>

          <div className={cn(
            "flex-1 flex flex-col overflow-hidden",
            !activeChat ? "hidden md:flex" : "flex"
          )}>
            {activeChat ? (
              <WhatsAppChatWindow
                activeChat={activeChat}
                messages={activeMessages}
                onSendMessage={handleSendMessage}
                onDeleteConversation={handleDeleteConversation}
                onDeleteMessage={handleDeleteMessage}
                onSync={handleSync}
                user={user}
                loading={loading}
                onBack={() => setActiveChatId(null)}
                onOpenInfo={() => setSidebarOpen(o => !o)}
              />
            ) : (
    <div className="flex-1 flex items-center justify-center bg-[#0B141A]">
                <div className="text-center">
                  <div className="w-[80px] h-[80px] mx-auto mb-8 rounded-full bg-[#222E35] border-[6px] border-[#364147] flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-[#8696a0]" />
                  </div>
                  <h2 className="text-[26px] font-light text-[#E9EDEF] mb-4">WhatsApp</h2>
                  <p className="text-sm text-[#8696a0] max-w-[400px] leading-relaxed">
                    Escolha uma conversa para começar a conversar, ou clique em <strong className="text-white/80">Nova Conversa</strong> na barra lateral.
                  </p>
                </div>
              </div>
            )}
          </div>

          {activeChat && sidebarOpen && (
            <ContactSidebar
              chat={activeChat}
              onClose={() => setSidebarOpen(false)}
            />
          )}
        </>
      ) : activeNav === "status" ? (
        renderPlaceholder("Status", "Visualize e compartilhe atualizações de status com seus contatos.")
      ) : activeNav === "newsletter" ? (
        renderPlaceholder("Novidades", "Gerencie suas newsletters e transmissões.")
      ) : activeNav === "communities" ? (
        renderPlaceholder("Comunidades", "Crie e gerencie grupos e comunidades.")
      ) : (
        <WhatsAppSettingsView userId={user?.id} />
      )}
    </div>
  );
}

export default WhatsAppInboxView;
