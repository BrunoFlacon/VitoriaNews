import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle, Plus, Trash2, Send, Users, Radio as BroadcastIcon, Hash, User, Loader2, Clock, CheckCircle2, AlertCircle, Phone, Search, Filter, Calendar, Paperclip, Image, Video, Mic, FileText, X, Edit, MoreHorizontal, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface MessagingChannel {
  id: string;
  user_id: string;
  platform: string;
  channel_name: string;
  channel_id: string | null;
  channel_type: string;
  members_count: number;
  online_count: number;
  profile_picture?: string;
  created_at: string;
}

interface Message {
  id: string;
  user_id: string;
  channel_id: string | null;
  content: string;
  media_url: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  platform: string | null;
  created_at: string;
}

const messagingPlatformConfigs = [
  { id: "whatsapp", name: "WhatsApp", types: ["group", "broadcast", "community", "individual"] },
  { id: "telegram", name: "Telegram", types: ["group", "channel", "community", "individual"] },
  { id: "facebook", name: "Facebook", types: ["group", "broadcast"] },
  { id: "instagram", name: "Instagram", types: ["broadcast"] },
  { id: "linkedin", name: "LinkedIn", types: ["group"] },
  { id: "twitter", name: "X (Twitter)", types: ["group"] },
  { id: "threads", name: "Threads", types: ["broadcast"] },
  { id: "custom", name: "Outra rede", types: ["group", "broadcast", "channel", "community", "individual"] },
];

const channelTypes = [
  { id: "group", label: "Grupo", icon: Users },
  { id: "broadcast", label: "Lista/Canal de Transmissão", icon: BroadcastIcon },
  { id: "channel", label: "Canal", icon: Hash },
  { id: "community", label: "Comunidade", icon: Hash },
  { id: "individual", label: "Individual", icon: User },
];

const messageStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  draft: { label: "Rascunho", color: "text-yellow-500", icon: Clock },
  scheduled: { label: "Agendada", color: "text-blue-500", icon: Calendar },
  sent: { label: "Enviada", color: "text-green-500", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "text-red-500", icon: AlertCircle },
};

export const MessagingView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [channels, setChannels] = useState<MessagingChannel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("channels");

  // Add channel form
  const [formPlatform, setFormPlatform] = useState("");
  const [formCustomPlatform, setFormCustomPlatform] = useState("");
  const [formChannelName, setFormChannelName] = useState("");
  const [formChannelId, setFormChannelId] = useState("");
  const [formChannelType, setFormChannelType] = useState("group");
  const [formMembersCount, setFormMembersCount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Compose form
  const [composeTarget, setComposeTarget] = useState<string[]>([]);
  const [composeMessage, setComposeMessage] = useState("");
  const [composeScheduledAt, setComposeScheduledAt] = useState("");
  const [composeIndividualPhone, setComposeIndividualPhone] = useState("");
  const [composeIndividualName, setComposeIndividualName] = useState("");
  const [composeIndividualPlatform, setComposeIndividualPlatform] = useState("whatsapp");
  const [composeSending, setComposeSending] = useState(false);
  const [sendMode, setSendMode] = useState<"channels" | "individual">("channels");

  // Attachments
  const [attachments, setAttachments] = useState<{ url: string; type: string; name: string }[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileAccept, setFileAccept] = useState("*/*");

  // History filters
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");

  // Edit message dialog
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const fetchChannels = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("messaging_channels")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setChannels(data as unknown as MessagingChannel[]);
    setLoading(false);
  };

  const fetchMessages = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setMessages(data as unknown as Message[]);
    setMessagesLoading(false);
  };

  const syncChannels = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-messaging-channels");
      if (error) throw error;
      await fetchChannels();
      toast({ title: "Sincronização concluída", description: "Dados dos canais atualizados com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchMessages();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch1 = supabase
      .channel("messaging-channels-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "messaging_channels", filter: `user_id=eq.${user.id}` }, () => fetchChannels())
      .subscribe();
    const ch2 = supabase
      .channel("messages-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `user_id=eq.${user.id}` }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [user]);

  const availableTypes = formPlatform
    ? messagingPlatformConfigs.find(p => p.id === formPlatform)?.types || []
    : [];

  // Editing channel state
  const [editingChannel, setEditingChannel] = useState<MessagingChannel | null>(null);

  const handleEditChannel = (ch: MessagingChannel) => {
    setEditingChannel(ch);
    setFormPlatform(messagingPlatformConfigs.find(p => p.id === ch.platform) ? ch.platform : "custom");
    setFormCustomPlatform(messagingPlatformConfigs.find(p => p.id === ch.platform) ? "" : ch.platform);
    setFormChannelName(ch.channel_name);
    setFormChannelId(ch.channel_id || "");
    setFormChannelType(ch.channel_type);
    setFormMembersCount(ch.members_count ? String(ch.members_count) : "");
    setShowAddDialog(true);
  };

  // Add or update channel
  const handleSaveChannel = async () => {
    if (!user || !formPlatform || !formChannelName.trim()) return;
    setSubmitting(true);
    const platformName = formPlatform === "custom" ? formCustomPlatform.trim() || "custom" : formPlatform;
    const channelData = {
      platform: platformName,
      channel_name: formChannelName.trim(),
      channel_id: formChannelId.trim() || null,
      channel_type: formChannelType,
      members_count: parseInt(formMembersCount) || 0,
    };

    if (editingChannel) {
      const { error } = await supabase.from("messaging_channels").update(channelData as any).eq("id", editingChannel.id);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Canal atualizado!" });
        addNotification({ type: "success", title: "Canal atualizado", message: `${formChannelName} foi atualizado.`, platform: platformName });
        setShowAddDialog(false);
        resetAddForm();
      }
    } else {
      const { error } = await supabase.from("messaging_channels").insert({ user_id: user.id, ...channelData } as any);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Canal adicionado!" });
        addNotification({ type: "success", title: "Canal adicionado", message: `${formChannelName} foi adicionado como ${formChannelType}.`, platform: platformName });
        setShowAddDialog(false);
        resetAddForm();
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("messaging_channels").delete().eq("id", id);
    toast({ title: "Canal removido" });
  };

  const resetAddForm = () => {
    setFormPlatform(""); setFormCustomPlatform(""); setFormChannelName(""); setFormChannelId(""); setFormChannelType("group"); setFormMembersCount(""); setEditingChannel(null);
  };

  const toggleComposeTarget = (id: string) => {
    setComposeTarget(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  // File upload handler
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAttachment(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { cacheControl: '3600' });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      const fileType = file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "file";
      setAttachments(prev => [...prev, { url: urlData.publicUrl, type: fileType, name: file.name }]);
      toast({ title: "Arquivo anexado", description: file.name });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
      addNotification({ type: "error", title: "Erro no upload", message: `Não foi possível enviar ${file.name}: ${err.message}` });
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openFileDialog = (accept: string) => {
    setFileAccept(accept);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSendMessage = async () => {
    if (!user) return;
    setComposeSending(true);

    try {
      const mediaUrls = attachments.length > 0 ? attachments.map(a => a.url) : [];
      const isScheduled = !!composeScheduledAt;

      const payload: any = {
        content: composeMessage.trim(),
        mediaUrls,
        postType: "message",
        platforms: [],
      };

      if (sendMode === "individual") {
        if (!composeIndividualPhone.trim() || !composeMessage.trim()) return;
        payload.platforms = [composeIndividualPlatform];
        payload.recipientPhone = composeIndividualPhone.trim();
        
        const { data, error } = await supabase.from("messages").insert({
          user_id: user.id,
          content: composeMessage.trim(),
          media_url: mediaUrls.join(","),
          status: isScheduled ? "scheduled" : "sending",
          scheduled_at: composeScheduledAt || null,
          recipient_phone: composeIndividualPhone.trim(),
          recipient_name: composeIndividualName.trim() || null,
          platform: composeIndividualPlatform,
        } as any).select().single();
        
        if (error) throw error;

        if (!isScheduled) {
          const { data: resultData, error: funcError } = await supabase.functions.invoke('publish-post', {
            body: { ...payload, postId: data.id }
          });

          if (funcError || !resultData?.success) {
            await supabase.from("messages").update({ status: "failed" } as any).eq("id", data.id);
            throw new Error(funcError?.message || "Erro ao disparar envio");
          }
          await supabase.from("messages").update({ status: "sent", sent_at: new Date().toISOString() } as any).eq("id", data.id);
        }

        const title = isScheduled ? "Mensagem agendada!" : "Mensagem enviada!";
        toast({ title, description: `Para: ${composeIndividualPhone}` });
      } else {
        if (composeTarget.length === 0 || !composeMessage.trim()) return;
        
        for (const channelId of composeTarget) {
          const ch = channels.find(c => c.id === channelId);
          if (!ch) continue;

          const { data, error } = await supabase.from("messages").insert({
            user_id: user.id,
            channel_id: channelId,
            content: composeMessage.trim(),
            media_url: mediaUrls.join(","),
            status: isScheduled ? "scheduled" : "sending",
            scheduled_at: composeScheduledAt || null,
            platform: ch.platform,
          } as any).select().single();

          if (error) throw error;

          if (!isScheduled) {
            const chanPayload = { 
              ...payload, 
              platforms: [ch.platform], 
              chatId: ch.channel_id,
              postId: data.id 
            };
            
            const { data: resultData, error: funcError } = await supabase.functions.invoke('publish-post', {
              body: chanPayload
            });

            if (funcError || !resultData?.success) {
              await supabase.from("messages").update({ status: "failed" } as any).eq("id", data.id);
            } else {
              await supabase.from("messages").update({ status: "sent", sent_at: new Date().toISOString() } as any).eq("id", data.id);
            }
          }
        }
        
        const targetNames = channels.filter(c => composeTarget.includes(c.id)).map(c => c.channel_name).join(", ");
        const title = isScheduled ? "Mensagens agendadas!" : "Mensagens enviadas!";
        toast({ title, description: `Para: ${targetNames}` });
      }
      resetCompose();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setComposeSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || !composeMessage.trim()) return;
    setComposeSending(true);
    try {
      const mediaUrl = attachments.length > 0 ? attachments.map(a => a.url).join(",") : null;
      if (sendMode === "individual") {
        const { error } = await supabase.from("messages").insert({
          user_id: user.id, content: composeMessage.trim(), media_url: mediaUrl,
          status: "draft", recipient_phone: composeIndividualPhone.trim() || null,
          recipient_name: composeIndividualName.trim() || null, platform: composeIndividualPlatform,
        } as any);
        if (error) throw error;
      } else {
        if (composeTarget.length === 0) {
          const { error } = await supabase.from("messages").insert({
            user_id: user.id, content: composeMessage.trim(), media_url: mediaUrl, status: "draft", platform: null,
          } as any);
          if (error) throw error;
        } else {
          const inserts = composeTarget.map(channelId => ({
            user_id: user.id, channel_id: channelId, content: composeMessage.trim(), media_url: mediaUrl, status: "draft", platform: channels.find(c => c.id === channelId)?.platform || null,
          }));
          const { error } = await supabase.from("messages").insert(inserts as any);
          if (error) throw error;
        }
      }
      toast({ title: "Rascunho salvo!" });
      addNotification({ type: "info", title: "Rascunho salvo", message: "Sua mensagem foi salva como rascunho." });
      resetCompose();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setComposeSending(false);
    }
  };

  const resetCompose = () => {
    setComposeTarget([]); setComposeMessage(""); setComposeScheduledAt(""); setComposeIndividualPhone(""); setComposeIndividualName(""); setSendMode("channels"); setAttachments([]);
  };

  // === CRUD operations for history ===
  const handleDeleteMessage = async (id: string) => {
    await supabase.from("messages").delete().eq("id", id);
    toast({ title: "Mensagem removida" });
    addNotification({ type: "info", title: "Mensagem excluída", message: "A mensagem foi removida do histórico." });
  };

  const handleMarkSent = async (id: string) => {
    const msg = messages.find(m => m.id === id);
    if (!msg) return;

    toast({ title: "Enviando...", description: "Processando envio imediato" });

    const payload: any = {
      content: msg.content,
      mediaUrls: msg.media_url ? msg.media_url.split(",") : [],
      postType: "message",
      platforms: [msg.platform],
      postId: msg.id,
      recipientPhone: msg.recipient_phone,
    };

    if (msg.channel_id) {
      const ch = channels.find(c => c.id === msg.channel_id);
      if (ch) payload.chatId = ch.channel_id;
    }

    const { data: resultData, error: funcError } = await supabase.functions.invoke('publish-post', {
      body: payload
    });

    if (funcError || !resultData?.success) {
      await supabase.from("messages").update({ status: "failed" } as any).eq("id", id);
      toast({ title: "Erro no envio", description: funcError?.message || "Falha na plataforma", variant: "destructive" });
    } else {
      await supabase.from("messages").update({ status: "sent", sent_at: new Date().toISOString() } as any).eq("id", id);
      toast({ title: "Enviada com sucesso!" });
    }
  };

  const handleScheduleMessage = async (id: string, scheduledAt: string) => {
    await supabase.from("messages").update({ status: "scheduled", scheduled_at: scheduledAt } as any).eq("id", id);
    toast({ title: "Mensagem agendada" });
    addNotification({ type: "info", title: "Mensagem agendada", message: `Agendada para ${new Date(scheduledAt).toLocaleString("pt-BR")}` });
  };

  const openEditMessage = (msg: Message) => {
    setEditingMessage(msg);
    setEditContent(msg.content);
    setEditScheduledAt(msg.scheduled_at ? new Date(msg.scheduled_at).toISOString().slice(0, 16) : "");
    setEditStatus(msg.status);
  };

  const handleSaveEditMessage = async () => {
    if (!editingMessage) return;
    const updates: any = { content: editContent.trim() };
    if (editStatus === "scheduled" && editScheduledAt) {
      updates.status = "scheduled";
      updates.scheduled_at = new Date(editScheduledAt).toISOString();
    } else if (editStatus === "sent") {
      updates.status = "sent";
      updates.sent_at = new Date().toISOString();
    } else if (editStatus === "draft") {
      updates.status = "draft";
      updates.scheduled_at = null;
    }
    await supabase.from("messages").update(updates).eq("id", editingMessage.id);
    toast({ title: "Mensagem atualizada" });
    addNotification({ type: "success", title: "Mensagem editada", message: "As alterações foram salvas." });
    setEditingMessage(null);
  };

  const getTypeIcon = (type: string) => channelTypes.find(ct => ct.id === type)?.icon || Users;
  const getTypeLabel = (type: string) => channelTypes.find(ct => ct.id === type)?.label || "Grupo";

  const filteredMessages = messages.filter(m => {
    if (historyFilter !== "all" && m.status !== historyFilter) return false;
    if (historySearch && !m.content.toLowerCase().includes(historySearch.toLowerCase())) return false;
    return true;
  });

  const groupedByPlatform = messagingPlatformConfigs
    .filter(mp => mp.id !== "custom")
    .map(mp => ({
      ...mp,
      channels: channels.filter(c => c.platform === mp.id),
    }));

  const knownIds = messagingPlatformConfigs.map(p => p.id);
  const customChannels = channels.filter(c => !knownIds.includes(c.platform));
  const customPlatforms = [...new Set(customChannels.map(c => c.platform))];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <input ref={fileInputRef} type="file" accept={fileAccept} onChange={handleAttachmentUpload} className="hidden" />

      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">Mensagens & Canais</h1>
        <p className="text-muted-foreground">Gerencie canais, compose e veja o histórico de mensagens</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="channels" className="rounded-lg data-[state=active]:bg-background gap-2">
            <Hash className="w-4 h-4" /> Canais
          </TabsTrigger>
          <TabsTrigger value="compose" className="rounded-lg data-[state=active]:bg-background gap-2">
            <Send className="w-4 h-4" /> Compor
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-background gap-2">
            <MessageCircle className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ===== CHANNELS TAB ===== */}
        <TabsContent value="channels">
          <div className="flex gap-3 mb-6">
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Canal
            </Button>
            <Button variant="outline" onClick={syncChannels} disabled={loading} className="gap-2">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Sincronizar Canais
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center glass-card rounded-2xl border border-border">
              <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="font-medium text-lg">Nenhum canal configurado</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Adicione seus grupos, listas de transmissão e comunidades</p>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2"><Plus className="w-4 h-4" /> Adicionar Canal</Button>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedByPlatform.filter(g => g.channels.length > 0).map(group => {
                const platform = socialPlatforms.find(p => p.id === group.id);
                const PlatformIcon = platform?.icon;
                return (
                  <div key={group.id}>
                    <div className="flex items-center gap-3 mb-4">
                      {PlatformIcon && (
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", platform?.color)}>
                          <PlatformIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <h2 className="font-display font-bold text-lg">{group.name}</h2>
                      <span className="text-sm text-muted-foreground">({group.channels.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.channels.map((ch, idx) => {
                        const TypeIcon = getTypeIcon(ch.channel_type);
                        return (
                          <motion.div key={ch.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                            className="glass-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-all group">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                {ch.profile_picture ? (
                                  <div className="relative">
                                    <img src={ch.profile_picture} alt={ch.channel_name} className="w-10 h-10 rounded-xl object-cover border border-border" />
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background flex items-center justify-center p-0.5 border border-border">
                                      {socialPlatforms.find(p => p.id === ch.platform)?.icon ? (
                                        (() => {
                                          const PIcon = socialPlatforms.find(p => p.id === ch.platform)?.icon;
                                          return PIcon && <PIcon className="w-2.5 h-2.5" />;
                                        })()
                                      ) : (
                                        <TypeIcon className="w-2.5 h-2.5 text-primary" />
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center relative", 
                                    socialPlatforms.find(p => p.id === ch.platform)?.color || "bg-muted")}>
                                    {socialPlatforms.find(p => p.id === ch.platform)?.icon ? (
                                      (() => {
                                        const PIcon = socialPlatforms.find(p => p.id === ch.platform)?.icon;
                                        return PIcon && <PIcon className="w-5 h-5 text-white" />;
                                      })()
                                    ) : (
                                      <TypeIcon className="w-5 h-5 text-muted-foreground" />
                                    )}
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background flex items-center justify-center p-0.5 border border-border shadow-sm">
                                      <TypeIcon className="w-2.5 h-2.5 text-primary" />
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-sm">{ch.channel_name}</p>
                                  <p className="text-xs text-muted-foreground">{getTypeLabel(ch.channel_type)}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => handleEditChannel(ch)}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(ch.id)}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                              {ch.members_count > 0 && <span className="flex items-center gap-1 font-bold text-primary/80"><Users className="w-3 h-3" /> {ch.members_count} Membros</span>}
                              {ch.online_count > 0 && <span className="flex items-center gap-1 text-green-500 font-bold"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {ch.online_count} Online</span>}
                              {ch.channel_id && <span className="truncate max-w-[120px] opacity-60">ID: {ch.channel_id}</span>}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {customPlatforms.map(cpName => {
                const cChannels = customChannels.filter(c => c.platform === cpName);
                return (
                  <div key={cpName}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><Hash className="w-4 h-4 text-muted-foreground" /></div>
                      <h2 className="font-display font-bold text-lg capitalize">{cpName}</h2>
                      <span className="text-sm text-muted-foreground">({cChannels.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cChannels.map((ch, idx) => {
                        const TypeIcon = getTypeIcon(ch.channel_type);
                        return (
                          <motion.div key={ch.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                            className="glass-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-all group">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><TypeIcon className="w-5 h-5 text-muted-foreground" /></div>
                                <div>
                                  <p className="font-medium text-sm">{ch.channel_name}</p>
                                  <p className="text-xs text-muted-foreground">{getTypeLabel(ch.channel_type)}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => handleEditChannel(ch)}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(ch.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== COMPOSE TAB ===== */}
        <TabsContent value="compose">
          <div className="glass-card rounded-2xl border border-border p-6 max-w-2xl">
            <h3 className="font-display font-bold text-lg mb-6">Compor Mensagem</h3>

            {/* Send mode toggle */}
            <div className="flex gap-2 mb-6">
              <Button variant={sendMode === "channels" ? "default" : "outline"} size="sm" onClick={() => setSendMode("channels")} className="gap-2">
                <Users className="w-4 h-4" /> Para Canais
              </Button>
              <Button variant={sendMode === "individual" ? "default" : "outline"} size="sm" onClick={() => setSendMode("individual")} className="gap-2">
                <Phone className="w-4 h-4" /> Individual
              </Button>
            </div>

            {sendMode === "channels" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Selecione os destinatários</label>
                  <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border p-2">
                    {channels.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum canal. Adicione na aba Canais.</p>
                    ) : channels.map(ch => {
                      const platform = socialPlatforms.find(p => p.id === ch.platform);
                      const PIcon = platform?.icon;
                      const selected = composeTarget.includes(ch.id);
                      return (
                        <button key={ch.id} type="button" onClick={() => toggleComposeTarget(ch.id)}
                          className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                            selected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/40")}>
                          {ch.profile_picture ? (
                            <img src={ch.profile_picture} alt={ch.channel_name} className="w-6 h-6 rounded-lg object-cover" />
                          ) : (
                            PIcon ? <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", platform?.color)}><PIcon className="w-3 h-3 text-white" /></div>
                            : <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center"><Hash className="w-3 h-3 text-muted-foreground" /></div>
                          )}
                          <span className="flex-1 text-left truncate">{ch.channel_name}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{ch.members_count > 0 ? `${ch.members_count} mb` : getTypeLabel(ch.channel_type)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Plataforma</label>
                  <Select value={composeIndividualPlatform} onValueChange={setComposeIndividualPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Número / Username</label>
                  <Input value={composeIndividualPhone} onChange={e => setComposeIndividualPhone(e.target.value)}
                    placeholder={composeIndividualPlatform === "whatsapp" ? "+55 11 99999-9999" : "@username"} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Nome (opcional)</label>
                  <Input value={composeIndividualName} onChange={e => setComposeIndividualName(e.target.value)} placeholder="Nome do contato" />
                </div>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Mensagem</label>
                <Textarea value={composeMessage} onChange={e => setComposeMessage(e.target.value)} placeholder="Digite sua mensagem..." rows={4} />
              </div>

              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group rounded-lg border border-border p-2 flex items-center gap-2 bg-muted/30">
                      {att.type === "image" ? (
                        <img src={att.url} alt={att.name} className="w-12 h-12 rounded object-cover" />
                      ) : att.type === "video" ? (
                        <Video className="w-6 h-6 text-blue-500" />
                      ) : att.type === "audio" ? (
                        <Mic className="w-6 h-6 text-purple-500" />
                      ) : (
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      )}
                      <span className="text-xs truncate max-w-[100px]">{att.name}</span>
                      <button onClick={() => removeAttachment(i)} className="p-0.5 rounded-full bg-destructive/80 text-white absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Attachment buttons bar */}
              <div className="flex items-center gap-1 border border-border rounded-xl p-1.5 bg-muted/20">
                <button type="button" onClick={() => openFileDialog("image/*")} disabled={uploadingAttachment}
                  className="p-2 rounded-lg hover:bg-muted transition-colors" title="Anexar imagem">
                  <Image className="w-4 h-4 text-green-500" />
                </button>
                <button type="button" onClick={() => openFileDialog("video/*")} disabled={uploadingAttachment}
                  className="p-2 rounded-lg hover:bg-muted transition-colors" title="Anexar vídeo">
                  <Video className="w-4 h-4 text-blue-500" />
                </button>
                <button type="button" onClick={() => openFileDialog("audio/*")} disabled={uploadingAttachment}
                  className="p-2 rounded-lg hover:bg-muted transition-colors" title="Anexar áudio">
                  <Mic className="w-4 h-4 text-purple-500" />
                </button>
                <button type="button" onClick={() => openFileDialog("*/*")} disabled={uploadingAttachment}
                  className="p-2 rounded-lg hover:bg-muted transition-colors" title="Anexar arquivo">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </button>
                {uploadingAttachment && <Loader2 className="w-4 h-4 animate-spin text-primary ml-2" />}

                <div className="flex-1" />

                <Input type="datetime-local" value={composeScheduledAt} onChange={e => setComposeScheduledAt(e.target.value)}
                  className="w-auto h-8 text-xs bg-transparent border-0 focus-visible:ring-0" />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSaveDraft} disabled={composeSending || !composeMessage.trim()} className="gap-2">
                  <FileText className="w-4 h-4" /> Salvar rascunho
                </Button>
                <Button onClick={handleSendMessage}
                  disabled={composeSending || !composeMessage.trim() || (sendMode === "channels" && composeTarget.length === 0) || (sendMode === "individual" && !composeIndividualPhone.trim())}
                  className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90 text-white flex-1">
                  {composeSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {composeScheduledAt ? "Agendar envio" : "Enviar agora"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ===== HISTORY TAB with full CRUD ===== */}
        <TabsContent value="history">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Buscar mensagens..." className="pl-10" />
              </div>
              <div className="flex gap-1">
                {[{ id: "all", label: "Todas" }, { id: "draft", label: "Rascunhos" }, { id: "scheduled", label: "Agendadas" }, { id: "sent", label: "Enviadas" }, { id: "failed", label: "Falhas" }].map(f => (
                  <Button key={f.id} variant={historyFilter === f.id ? "default" : "outline"} size="sm" onClick={() => setHistoryFilter(f.id)}>
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {messagesLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center glass-card rounded-2xl border border-border">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="font-medium">Nenhuma mensagem encontrada</p>
                <p className="text-sm text-muted-foreground mt-1">Compose uma mensagem na aba Compor</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMessages.map((msg, idx) => {
                  const ch = msg.channel_id ? channels.find(c => c.id === msg.channel_id) : null;
                  const platform = socialPlatforms.find(p => p.id === (msg.platform || ch?.platform));
                  const PIcon = platform?.icon;
                  const statusCfg = messageStatusConfig[msg.status] || messageStatusConfig.draft;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                      className="glass-card rounded-2xl border border-border p-4 hover:border-primary/20 transition-all group">
                      <div className="flex items-start gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", platform?.color || "bg-muted")}>
                          {PIcon ? <PIcon className="w-5 h-5 text-white" /> : <MessageCircle className="w-5 h-5 text-muted-foreground" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {ch?.channel_name || msg.recipient_name || msg.recipient_phone || "Individual"}
                            </span>
                            <Badge variant="outline" className={cn("text-[10px] gap-1", statusCfg.color)}>
                              <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                            </Badge>
                          </div>
                          <div className="bg-primary/5 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {msg.media_url && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {msg.media_url.split(",").map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                                    <Paperclip className="w-3 h-3" /> Anexo {i + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{new Date(msg.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                            {msg.scheduled_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(msg.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>}
                          </div>
                        </div>

                        {/* CRUD actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-muted transition-all opacity-0 group-hover:opacity-100 shrink-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditMessage(msg)}>
                              <Edit className="w-4 h-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            {msg.status === "draft" && (
                              <DropdownMenuItem onClick={() => handleMarkSent(msg.id)}>
                                <Send className="w-4 h-4 mr-2" /> Publicar agora
                              </DropdownMenuItem>
                            )}
                            {(msg.status === "draft" || msg.status === "failed") && (
                              <DropdownMenuItem onClick={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                tomorrow.setHours(9, 0, 0, 0);
                                handleScheduleMessage(msg.id, tomorrow.toISOString());
                              }}>
                                <Calendar className="w-4 h-4 mr-2" /> Agendar (amanhã 9h)
                              </DropdownMenuItem>
                            )}
                            {msg.status === "scheduled" && (
                              <DropdownMenuItem onClick={() => handleMarkSent(msg.id)}>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Enviar agora
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Channel Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); resetAddForm(); } else { setShowAddDialog(true); } }}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingChannel ? "Editar Canal" : "Adicionar Canal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Plataforma</label>
              <Select value={formPlatform} onValueChange={(v) => { setFormPlatform(v); setFormChannelType(messagingPlatformConfigs.find(p => p.id === v)?.types[0] || "group"); }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {messagingPlatformConfigs.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formPlatform === "custom" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Nome da rede</label>
                <Input value={formCustomPlatform} onChange={e => setFormCustomPlatform(e.target.value)} placeholder="Ex: Discord, Slack..." />
              </div>
            )}
            {formPlatform && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Tipo</label>
                  <Select value={formChannelType} onValueChange={setFormChannelType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableTypes.map(t => {
                        const ct = channelTypes.find(c => c.id === t);
                        return <SelectItem key={t} value={t}>{ct?.label || t}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Nome do canal/grupo</label>
                  <Input value={formChannelName} onChange={e => setFormChannelName(e.target.value)} placeholder="Nome do grupo ou canal" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">ID ou link (opcional)</label>
                  <Input value={formChannelId} onChange={e => setFormChannelId(e.target.value)} placeholder="Ex: https://chat.whatsapp.com/... ou @canal" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Membros (opcional)</label>
                  <Input type="number" value={formMembersCount} onChange={e => setFormMembersCount(e.target.value)} placeholder="0" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetAddForm(); }}>Cancelar</Button>
            <Button onClick={handleSaveChannel} disabled={submitting || !formPlatform || !formChannelName.trim()}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingChannel ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Message Dialog */}
      <Dialog open={!!editingMessage} onOpenChange={(open) => { if (!open) setEditingMessage(null); }}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar Mensagem</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Conteúdo</label>
              <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editStatus === "scheduled" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Agendar para</label>
                <Input type="datetime-local" value={editScheduledAt} onChange={e => setEditScheduledAt(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>Cancelar</Button>
            <Button onClick={handleSaveEditMessage} disabled={!editContent.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
