import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle, Plus, Trash2, Send, SendHorizontal, Users, Radio as BroadcastIcon, Hash, User, Loader2, Clock, CheckCircle2, AlertCircle, Phone, Search, Filter, Calendar, Paperclip, Image, Video, Mic, FileText, X, Edit, MoreHorizontal, RefreshCw, Megaphone, Info, BarChart3, Copy, UserPlus, MapPin, Smile, Download
} from "lucide-react";
import { cn, getProxyUrl } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationContext";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeImage } from "@/components/ui/SafeImage";
import { ChatList } from "./messaging/ChatList";
import { ChatWindow } from "./messaging/ChatWindow";


interface MessagingChannel {
  id: string;
  user_id: string;
  platform: string;
  channel_name: string;
  channel_id: string | null;
  channel_type: string;
  members_count: number;
  online_count: number;
  posts_count?: number;
  profile_picture?: string;
  created_at: string;
  invite_link?: string | null;
  is_online?: boolean;
  cover_photo?: string | null;
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
  mime_type?: string | null;
  metadata?: Record<string, any> | null;
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
  received: { label: "Recebida", color: "text-purple-500", icon: MessageCircle },
  sending: { label: "Enviando", color: "text-blue-300", icon: Loader2 },
};

// Helper to resolve profile/channel photos
const getChatPhoto = (url: string | null | undefined) => {
  if (!url) return null;
  // Proxy through Supabase for CDNs that block CORS (Telegram, WhatsApp, etc.)
  if (url.startsWith('http')) {
    return getProxyUrl(url);
  }
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  // Try to resolve from Supabase storage if it's just a path
  try {
    const { data } = supabase.storage.from("media").getPublicUrl(url);
    return data.publicUrl;
  } catch (e) {
    return null;
  }
};

// Brand Colors & Clean Styles (Dark Mode Premium)
const getPlatformStyles = (platformId: string|null) => {
  const pId = platformId?.toLowerCase();
  switch (pId) {
    case 'whatsapp':
      return {
        accent: "text-[#25D366]",
        bg: "bg-[#25D366]",
        softBg: "bg-[#0b141a]/60 backdrop-blur-md",
        bubbleSelf: "bg-[#005C4B] text-[#E9EDEF] shadow-lg border border-white/5",
        bubbleOther: "bg-[#202C33] text-[#E9EDEF] shadow-lg border border-white/5",
        chatBg: "bg-[#0b141a]",
        headerGradient: "from-[#25D366]/20 to-transparent",
        sendIcon: MessageCircle,
      };
    case 'telegram':
      return {
        accent: "text-[#40A7E3]",
        bg: "bg-[#0088CC]",
        softBg: "bg-[#17212b]/60 backdrop-blur-md",
        bubbleSelf: "bg-[#2B5278] text-white shadow-lg border border-white/5",
        bubbleOther: "bg-[#182533] text-white shadow-lg border border-white/5",
        chatBg: "bg-[#0E1621]",
        headerGradient: "from-[#0088CC]/20 to-transparent",
        sendIcon: Send,
      };
    case 'facebook':
      return {
        accent: "text-[#1877F2]",
        bg: "bg-[#1877F2]",
        softBg: "bg-[#1c1c1e]/60 backdrop-blur-md",
        bubbleSelf: "bg-[#0078FF] text-white shadow-lg border border-white/5",
        bubbleOther: "bg-[#3A3B3C] text-white shadow-lg border border-white/5",
        chatBg: "bg-[#18191A]",
        headerGradient: "from-[#1877F2]/20 to-transparent",
        sendIcon: MessageCircle,
      };
    default:
      return {
        accent: "text-primary",
        bg: "bg-primary",
        softBg: "bg-[#121212]/80 backdrop-blur-md",
        bubbleSelf: "bg-primary/40 text-white shadow-lg border border-white/5",
        bubbleOther: "bg-white/10 text-white shadow-lg border border-white/5",
        chatBg: "bg-[#0A0A0A]",
        headerGradient: "from-primary/20 to-transparent",
        sendIcon: Send,
      };
  }
};

export const MessagingView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const { connections } = useSocialConnections();
  const queryClient = useQueryClient();
  const [channels, setChannels] = useState<MessagingChannel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("channels");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"all" | "individual" | "groups" | "channels" | "broadcast">("all");
  const [activeChatType, setActiveChatType] = useState<"channel" | "individual">("channel");
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      const query = e.detail?.query || "";
      setChatSearchQuery(query);
      setHistorySearch(query);
    };
    window.addEventListener('system-search', handleGlobalSearch);
    return () => window.removeEventListener('system-search', handleGlobalSearch);
  }, []);

  const activeMessages = useMemo(() => {
    if (!activeChatId) return [];
    
    return messages
      .filter(m => {
        let belongs = false;
        if (activeChatType === "channel") {
          // activeChatId agora é o UUID direto do canal (ch.id)
          belongs = m.channel_id === activeChatId;
        } else {
          // Para individuais, remover prefixo "ind-" do activeChatId
          const rawKey = activeChatId.startsWith('ind-') ? activeChatId.slice(4) : activeChatId;
          belongs = m.recipient_phone === rawKey || m.recipient_name === rawKey;
        }
        if (!belongs) return false;
        if (chatSearchQuery.trim()) return m.content.toLowerCase().includes(chatSearchQuery.toLowerCase());
        return true;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, activeChatId, activeChatType, channels, chatSearchQuery]);

  // --- Memoized Data Processing ---

  // 1. Process all chats (channels + individuals)
  const processedChats = useMemo(() => {
    // Deduplicar canais pelo channel_id para evitar keys duplicadas no React
    const seen = new Set<string>();
    const uniqueChannels = (channels || []).filter(ch => {
      const dedupKey = ch.channel_id ? `${ch.platform}:${ch.channel_id}` : ch.id;
      if (seen.has(dedupKey)) return false;
      seen.add(dedupKey);
      return true;
    });

    const channelChats = uniqueChannels.map(ch => {
      // Pre-calculate photo URL to avoid storage calls in render loop
      let photoUrl = null;
      if (ch.profile_picture) {
        if (ch.profile_picture.startsWith('http') || ch.profile_picture.startsWith('data:')) {
          photoUrl = ch.profile_picture;
        } else {
          photoUrl = supabase.storage.from("media").getPublicUrl(ch.profile_picture).data.publicUrl;
        }
      }

      // Usar nome legível: priorizar channel_name, depois username (@), depois channel_id
      const displayName = ch.channel_name || ch.channel_id || ch.id;

      return {
        key: ch.id, // UUID único do banco — nunca duplica
        id: ch.id,
        channelId: ch.channel_id, // guardar para operações de envio
        type: "channel",
        channel_type: ch.channel_type,
        lastMsg: messages.find(m => m.channel_id === ch.id),
        name: displayName,
        photo: ch.profile_picture,
        photoUrl,
        platform: ch.platform,
        is_online: ch.is_online,
        online_count: ch.online_count,
        members_count: ch.members_count
      };
    });

    const individualChats = (messages || [])
      .filter(m => !m.channel_id && (m.recipient_phone || m.recipient_name))
      .reduce((acc: any[], current) => {
        const key = current.recipient_phone || current.recipient_name || "";
        if (!acc.find(i => i.key === `ind-${key}`)) {
          // Find photo in channels or connections
          const conn = (connections || []).find(c => c.page_name === key || c.platform_user_id === key);
          const ch = (channels || []).find(c => c.channel_name === key || c.channel_id === key);
          const rawPhoto = conn?.profile_image_url || ch?.profile_picture;
          
          let photoUrl = null;
          if (rawPhoto) {
            if (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:')) {
              photoUrl = rawPhoto;
            } else {
              photoUrl = supabase.storage.from("media").getPublicUrl(rawPhoto).data.publicUrl;
            }
          }

          let displayName = current.recipient_name || current.recipient_phone || key;
          if (displayName.includes('@s.whatsapp.net') || displayName.includes('@c.us') || displayName.includes('@g.us')) {
            displayName = displayName.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '');
            // Se for apenas número e tiver código de país do BR, formatar simples
            if (/^55\d{10,11}$/.test(displayName)) {
               const ddd = displayName.substring(2, 4);
               const num = displayName.substring(4);
               displayName = `(${ddd}) ${num.length === 9 ? num.substring(0, 5) + '-' + num.substring(5) : num.substring(0, 4) + '-' + num.substring(4)}`;
            }
          }

          acc.push({
            key: `ind-${key}`, // Prefixo para nunca colidir com UUIDs dos canais
            id: current.id,
            type: "individual",
            channel_type: "individual",
            lastMsg: messages.filter(m => (m.recipient_phone === key || m.recipient_name === key)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0],
            name: displayName,
            photo: rawPhoto,
            photoUrl,
            platform: current.platform,
            is_online: false,
            online_count: 0,
            members_count: 0
          });
        }
        return acc;
      }, []);

    return [...channelChats, ...individualChats].sort((a, b) => {
      const dateA = a.lastMsg ? new Date(a.lastMsg.created_at).getTime() : 0;
      const dateB = b.lastMsg ? new Date(b.lastMsg.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [channels, messages]);

  // 2. Filter chats based on sidebar tab
  const filteredChats = useMemo(() => {
    return processedChats.filter(chat => {
      const matchesSearch = !chatSearchQuery.trim() || 
        (chat.name || "").toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
        (chat.platform || "").toLowerCase().includes(chatSearchQuery.toLowerCase());
        
      if (!matchesSearch) return false;
      
      if (sidebarTab === "all") return true;
      if (sidebarTab === "individual") return chat.type === "individual";
      if (sidebarTab === "groups") return chat.type === "channel" && chat.channel_type === "group";
      if (sidebarTab === "channels") return chat.type === "channel" && (chat.channel_type === "channel" || chat.channel_type === "community");
      if (sidebarTab === "broadcast") return chat.type === "channel" && chat.channel_type === "broadcast";
      return true;
    });
  }, [processedChats, sidebarTab, chatSearchQuery]);


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

  // Edit message dialog
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Discover Telegram/WhatsApp channels dialog
  const [showDiscoverDialog, setShowDiscoverDialog] = useState(false);
  const [discoverChatIds, setDiscoverChatIds] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoverResults, setDiscoverResults] = useState<any[]>([]);
  const [discoverPlatform, setDiscoverPlatform] = useState<"telegram" | "whatsapp">("telegram");
  const [linkingResult, setLinkingResult] = useState<string | null>(null);

  // Avatar detail modal
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedInfoChannel, setSelectedInfoChannel] = useState<MessagingChannel | null>(null);

  // Info Dialog
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [infoMembers, setInfoMembers] = useState<any[]>([]);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [audienceLogs, setAudienceLogs] = useState<any[]>([]);
  const [infoPosts, setInfoPosts] = useState(0);

  // Add People
  const [showAddPeopleDialog, setShowAddPeopleDialog] = useState(false);
  const [hubContacts, setHubContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [addingContactId, setAddingContactId] = useState<string | null>(null);

  // Inbox reply
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

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

  const cleanupSystemMessages = async () => {
    if (!user) return;
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    try {
      const { data: oldSystem } = await supabase
        .from("messages")
        .select("id")
        .eq("user_id", user.id)
        .lt("created_at", tenMinAgo)
        .filter("metadata->>is_service_message", "eq", "true");
      if (oldSystem && oldSystem.length > 0) {
        const ids = oldSystem.map(m => m.id);
        await supabase.from("messages").delete().in("id", ids);
        setMessages(prev => prev.filter(m => !ids.includes(m.id)));
      }
    } catch { /* tabela ou coluna pode nao existir */ }
  };

  const handleOpenInfo = async (channel: MessagingChannel) => {
    if (!user) return;
    setSelectedInfoChannel(channel);
    setShowInfoDialog(true);
    setFetchingInfo(true);
    setAudienceLogs([]);
    setInfoPosts(0);
    
    const channelKey = channel.channel_id || channel.id;
    
    try {
      const { data: membersData } = await supabase
        .from("messaging_members" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("channel_id", channelKey)
        .eq("platform", channel.platform);
      if (membersData) setInfoMembers(membersData);
    } catch { setInfoMembers([]); }
    
    try {
      const { data: logs } = await supabase
        .from("messaging_audience_logs" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("channel_id", channelKey)
        .gte("logged_at", new Date(Date.now() - 86400000).toISOString())
        .order("logged_at", { ascending: true });
      if (logs) setAudienceLogs(logs);
    } catch { setAudienceLogs([]); }
    
    try {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .or(`recipient_name.eq.${channelKey},recipient_phone.eq.${channelKey}`);
      setInfoPosts(count || 0);
    } catch { setInfoPosts(0); }

    try {
      await supabase.from("messaging_audience_logs" as any).insert({
        user_id: user.id,
        channel_id: channelKey,
        platform: channel.platform,
        members_total: channel.members_count || 0,
        members_online: channel.online_count || 0,
      });
    } catch (e) {
    }
    
    setFetchingInfo(false);
  };

  const handleOpenAddPeople = async () => {
    if (!user) return;
    setShowAddPeopleDialog(true);
    setLoadingContacts(true);
    try {
      const { data } = await supabase
        .from("messaging_members" as any)
        .select("id, full_name, phone_number")
        .eq("user_id", user.id)
        .order("full_name", { ascending: true });
      
      if (data) {
        const normalized = data.map((m: any) => ({
          id: m.id,
          name: m.full_name || "Desconhecido",
          phone: m.phone_number
        }));
        setHubContacts(normalized);
      }
    } catch { setHubContacts([]); }
    setLoadingContacts(false);
  };

  const handleAddPerson = async (contact: any) => {
    if (!user || !selectedInfoChannel) return;
    setAddingContactId(contact.id);
    
    const channelKey = selectedInfoChannel.channel_id || selectedInfoChannel.id;

    try {
      const { error } = await supabase.from("messaging_members" as any).insert({
        user_id: user.id,
        channel_id: channelKey,
        platform: selectedInfoChannel.platform,
        profile_picture: "",
        full_name: contact.name,
        phone_number: contact.phone,
        role: 'member',
        is_admin: false,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      
      toast({ title: "Participante adicionado!", description: `${contact.name} agora faz parte do grupo.` });
      handleOpenInfo(selectedInfoChannel);
    } catch (e: any) {
      toast({ title: "Erro ao adicionar", description: e.message, variant: "destructive" });
    } finally {
      setAddingContactId(null);
    }
  };

  const syncToGoogle = async () => {
    if (!user || infoMembers.length === 0) {
      toast({ title: "Sem contatos", description: "Não há participantes identificados para sincronizar." });
      return;
    }
    setSyncingGoogle(true);
    
    try {
      const memberData = infoMembers.map((m: any) => ({
        full_name: m.full_name,
        first_name: m.first_name,
        last_name: m.last_name,
        phone_number: m.phone_number,
        platform: m.platform || selectedInfoChannel?.platform || 'whatsapp',
        username: m.username,
        profile_picture: m.profile_picture,
        role: m.role,
        is_admin: m.is_admin,
        channel_id: selectedInfoChannel?.channel_id
      }));

      const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-google-contacts', {
        body: { members: memberData }
      });
      
      if (syncError || !syncResult?.success) {
        throw new Error(syncResult?.error || syncError?.message || "Erro na sincronização");
      }
      
      toast({ 
        title: "Sincronização Concluída", 
        description: `Enviados ${syncResult.count || memberData.length} contatos para o Google!` 
      });
      
      if (selectedInfoChannel) {
        handleOpenInfo(selectedInfoChannel);
      }
    } catch (err: any) {
      toast({ title: "Erro na Sincronização", description: err.message, variant: "destructive" });
    } finally {
      setSyncingGoogle(false);
    }
  };

  const syncChannels = async (platformArg?: any) => {
    if (!user) return;    setLoading(true);
    try {
      const platform = typeof platformArg === 'string' ? platformArg : undefined;
      const session = (await supabase.auth.getSession()).data.session;
      const anonKey = (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
      const baseUrl = (supabase as any).functionsUrl || import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

      const functionName = platform === 'telegram' ? 'sync-telegram-chats' : 'sync-messaging-channels';

      const doFetch = async (useAuth: boolean) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'apikey': anonKey
        };
        if (useAuth && session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        return await fetch(`${baseUrl}/${functionName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ platform })
        });
      };

      let response = await doFetch(true);
      if (response.status === 401) {
        response = await doFetch(false);
      }
      if (response.ok) {
        const result = await response.json();
        if (result?.success) {
          await fetchChannels();
          await fetchMessages();
          toast({ title: "Sincronizado!", description: "Dados de canais e fotos atualizados." });
        } else {
          toast({ title: "Aviso", description: result?.error || "Sincronização parcial realizada.", variant: "default" });
        }
      } else {
        const errorText = await response.text();
        console.error("Sync error:", errorText);
        toast({ title: "Erro na Sincronização", description: "Não foi possível conectar ao servidor de sincronização.", variant: "destructive" });
      }
    } catch (e: any) {
      console.error("Sync catch error:", e);
      toast({ title: "Erro fatal", description: e.message, variant: "destructive" });
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

    // Listen for telegram sync events
    const handleChannelsUpdate = () => { fetchChannels(); };
    window.addEventListener("messaging-channels-updated", handleChannelsUpdate);

    return () => { 
      supabase.removeChannel(ch1).catch(() => {}); 
      supabase.removeChannel(ch2).catch(() => {});
      window.removeEventListener("messaging-channels-updated", handleChannelsUpdate);
    };
  }, [user]);

  // Auto-cleanup system messages every 5min
  useEffect(() => {
    if (!user) return;
    cleanupSystemMessages();
    const interval = setInterval(cleanupSystemMessages, 300_000);
    return () => clearInterval(interval);
  }, [user]);

  const availableTypes = formPlatform
    ? messagingPlatformConfigs.find(p => p.id === formPlatform)?.types || []
    : [];

  // Editing channel state
  const [editingChannel, setEditingChannel] = useState<MessagingChannel | null>(null);

  const handleEditChannel = (ch: MessagingChannel, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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
        toast({ title: "Canal atualizado!", description: `${formChannelName} foi salvo com sucesso.` });
        addNotification({ type: "success", title: "Canal atualizado", message: `${formChannelName} foi atualizado.`, platform: platformName });
        queryClient.invalidateQueries({ queryKey: ['messaging_channels', user?.id] });
        setShowAddDialog(false);
        resetAddForm();
      }
    } else {
      const { error } = await supabase.from("messaging_channels").insert({ user_id: user.id, ...channelData } as any);
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Canal adicionado!", description: `${formChannelName} adicionado com sucesso.` });
        addNotification({ type: "success", title: "Canal adicionado", message: `${formChannelName} foi adicionado como ${formChannelType}.`, platform: platformName });
        queryClient.invalidateQueries({ queryKey: ['messaging_channels', user?.id] });
        setShowAddDialog(false);
        resetAddForm();
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!confirm("Tem certeza que deseja excluir este canal e todo o seu histórico?")) return;
    
    if (activeChatId === id) {
      setActiveChatId(null);
    }

    const previousChannels = queryClient.getQueryData<MessagingChannel[]>(['messaging_channels', user?.id]);
    queryClient.setQueryData(['messaging_channels', user?.id], (old: MessagingChannel[] | undefined) => 
      old?.filter(c => c.id !== id) || []
    );
    
    const { error } = await supabase.from("messaging_channels").delete().eq("id", id);
    if (error) {
       console.error("[DELETE CHANNEL] Error:", error);
       toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
       queryClient.setQueryData(['messaging_channels', user?.id], previousChannels);
       return;
    }
    
    const previousMessages = queryClient.getQueryData<Message[]>(['messaging_messages', user?.id]);
    queryClient.setQueryData(['messaging_messages', user?.id], (old: Message[] | undefined) => 
      old?.filter(m => m.channel_id !== id) || []
    );

    await supabase.from("messages").delete().eq("channel_id", id);
    
    toast({ title: "Canal e histórico removidos com sucesso" });
    fetchChannels();
    fetchMessages();

  };

  const resetAddForm = () => {
    setFormPlatform(""); setFormCustomPlatform(""); setFormChannelName(""); setFormChannelId(""); setFormChannelType("group"); setFormMembersCount(""); setEditingChannel(null);
  };

  const handleDiscoverTelegramChats = async () => {
    if (!user) return;
    setDiscovering(true);
    setDiscoverResults([]);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const anonKey = (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
      const baseUrl = (supabase as any).functionsUrl || import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

      // Parse entered IDs (one per line or comma-separated)
      const enteredIds = discoverChatIds
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const response = await fetch(`${baseUrl}/discover-telegram-chats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id, chatIds: enteredIds, platform: discoverPlatform })
      });

      const result = await response.json();
      if (result?.success) {
        setDiscoverResults(result.results || []);
        const registered = (result.results || []).filter((r: any) => r.success);
        if (registered.length > 0) {
          toast({
            title: `✅ ${registered.length} canal(is)/grupo(s) importado(s)!`,
            description: `Total de ${(result.total_members || 0).toLocaleString('pt-BR')} membros encontrados.`
          });
          await fetchChannels();
          window.dispatchEvent(new Event('social-connections-updated'));
        } else {
          toast({
            title: 'Nenhum canal encontrado',
            description: 'Verifique os IDs informados. Use @username ou o ID numérico do grupo/canal.',
            variant: 'destructive'
          });
        }
      } else {
        toast({ title: 'Erro', description: result?.error || 'Falha ao descobrir canais', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setDiscovering(false);
    }
  };

  const handleLinkDiscoveryResult = async (result: any) => {
    if (!user || !result.success) return;
    setLinkingResult(result.chatId);
    try {
      const payload: any = {
        user_id: user.id,
        platform: discoverPlatform,
        channel_id: result.chatId,
        channel_name: result.name || result.chatId,
        channel_type: result.type || 'group',
        members_count: result.members || 0,
        profile_picture: result.photo || null,
        updated_at: new Date().toISOString(),
      };

      const fullPayload = {
        ...payload,
        invite_link: result.invite_link || null,
        full_name: result.name || null,
        is_online: result.isOnline || false,
        last_seen: result.isOnline ? new Date().toISOString() : null
      };

      const safeUpsert = async (currentPayload: any) => {
        const { error } = await supabase
          .from("messaging_channels")
          .upsert(currentPayload, { onConflict: 'user_id,platform,channel_id' });
        if (error && error.message.includes("Could not find the") && error.message.includes("column")) {
          const match = error.message.match(/'([^']+)'/);
          if (match && match[1]) {
            const missingCol = match[1];
            const { [missingCol]: _, ...nextPayload } = currentPayload;
            return safeUpsert(nextPayload);
          }
        }
        return { error };
      };

      const { error } = await safeUpsert(fullPayload);
      if (error) throw error;

      const existingChannel = channels.find(c => (c.channel_id === result.chatId || c.id === result.chatId) && c.platform === discoverPlatform);

      if (existingChannel) {
        toast({ title: "🔄 Registro Mesclado", description: `Os dados de "${payload.channel_name}" foram atualizados e mesclados ao registro original.` });
      } else {
        toast({ title: "✅ Canal vinculado!", description: `${payload.channel_name} agora faz parte do seu Hub.` });
      }

      try {
        await supabase.from("messaging_audience_logs" as any).insert({
          user_id: user.id, channel_id: result.chatId, platform: discoverPlatform,
          members_total: result.members || 0,
          members_online: result.isOnline ? Math.max(1, Math.floor((result.members || 0) * 0.05)) : 0,
        });
      } catch (logErr) {}

      if (result.admins && result.admins.length > 0) {
        const adminsMapping = result.admins.map((a: any) => ({
          user_id: user.id, channel_id: result.chatId, platform: discoverPlatform,
          username: a.username, first_name: a.first_name, last_name: a.last_name,
          full_name: `${a.first_name || ""} ${a.last_name || ""}`.trim(),
          role: a.status === 'creator' ? 'owner' : 'admin', is_admin: true,
          telegram_user_id: a.id, updated_at: new Date().toISOString()
        }));
        try {
          await supabase.from("messaging_members" as any).upsert(adminsMapping, { onConflict: "user_id,platform,channel_id,telegram_user_id" });
        } catch (memErr) {}
      }

      setDiscoverResults(prev => prev.map(r => r.chatId === result.chatId ? { ...r, registered: true } : r));
      await fetchChannels();
      window.dispatchEvent(new Event('social-connections-updated'));
    } catch (e: any) {
      toast({ title: "Erro ao vincular", description: e.message, variant: "destructive" });
    } finally {
      setLinkingResult(null);
    }
  };

  const toggleComposeTarget = (id: string) => {
    setComposeTarget(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleReply = async (content?: string, customAttachments?: any[]) => {
    if (!user || !activeChatId) return;
    
    const messageContent = content || replyMessage;
    if (!messageContent.trim() && (!customAttachments || customAttachments.length === 0)) return;
    
    setSendingReply(true);

    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    
    const activeChat = processedChats.find(c => c.key === activeChatId);
    const isChannel = activeChat?.type === "channel";
    const channelDbId = isChannel ? activeChat.id : null;
    const chatPlatform = activeChat?.platform || "telegram";

    const mediaUrls = (customAttachments || attachments).map(a => a.url).join(",");

    const optimisticMsg: Message = {
      id: tempId,
      user_id: user.id,
      content: messageContent.trim(),
      media_url: mediaUrls || null,
      status: "sending",
      scheduled_at: null,
      sent_at: now,
      recipient_phone: null,
      recipient_name: isChannel ? null : (activeChatId.startsWith('ind-') ? activeChatId.slice(4) : activeChatId),
      platform: chatPlatform,
      created_at: now,
      channel_id: channelDbId
    } as Message;
    
    queryClient.setQueryData(['messaging_messages', user?.id], (old: Message[] | undefined) => [optimisticMsg, ...(old || [])]);
    if (!content) setReplyMessage("");
    if (!customAttachments) setAttachments([]);
    
    try {
      const insertPayload: any = {
        user_id: user.id,
        content: messageContent.trim(),
        media_url: mediaUrls || null,
        status: "sent",
        sent_at: now,
        platform: chatPlatform
      };
      
      if (isChannel) {
        insertPayload.channel_id = channelDbId;
      } else {
        insertPayload.recipient_name = activeChatId.startsWith('ind-') ? activeChatId.slice(4) : activeChatId;
      }

      const { data, error } = await supabase.from("messages").insert(insertPayload).select().single();
      if (error) throw error;
      
      queryClient.setQueryData(['messaging_messages', user?.id], (old: Message[] | undefined) => 
        old?.map(m => m.id === tempId ? { ...optimisticMsg, id: (data as any).id, status: "sent" } : m) || []
      );
      toast({ title: "Mensagem enviada!" });
    } catch (e: any) {
      queryClient.setQueryData(['messaging_messages', user?.id], (old: Message[] | undefined) => 
        old?.filter(m => m.id !== tempId) || []
      );
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });

    } finally {
      setSendingReply(false);
    }
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

  const inferMediaType = (mediaUrl: string | null, mimeType?: string | null): string => {
    if (!mediaUrl) return "text";
    const firstUrl = mediaUrl.split(",")[0];
    if (mimeType?.startsWith("image/")) return "image";
    if (mimeType?.startsWith("video/")) return "video";
    if (mimeType?.startsWith("audio/")) return "audio";
    const ext = firstUrl.split("?").shift()?.split("#").shift()?.split(".").pop()?.toLowerCase() || "";
    if (["jpg","jpeg","png","gif","webp","svg","bmp","ico"].includes(ext)) return "image";
    if (["mp4","webm","ogg","mov","avi","mkv","m3u8"].includes(ext)) return "video";
    if (["mp3","wav","aac","flac","m4a","opus","wma"].includes(ext)) return "audio";
    if (["pdf","doc","docx","xls","xlsx","ppt","pptx","zip","rar","7z","txt","csv"].includes(ext)) return "document";
    return "document";
  };

  const handleLocationAttach = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        setAttachments(prev => [...prev, { url, type: 'location', name: 'Minha Localização' }]);
        toast({ title: "Localização anexada", description: "As coordenadas foram salvas para o envio." });
      },
      () => {
        toast({ title: "Erro na localização", description: "Ative o GPS do seu dispositivo.", variant: "destructive" });
      }
    );
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
          try {
            const session = (await supabase.auth.getSession()).data.session;
            const anonKey = (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
            const baseUrl = (supabase as any).functionsUrl || import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

            const response = await fetch(`${baseUrl}/publish-post`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || anonKey}`,
                'apikey': anonKey
              },
              body: JSON.stringify({ ...payload, postId: data.id })
            });
            
            const resultData = await response.json();
            if (!response.ok || !resultData?.success) {
              await supabase.from("messages").update({ status: "failed" } as any).eq("id", data.id);
              throw new Error(resultData?.message || "Erro ao disparar envio");
            }
            await supabase.from("messages").update({ status: "sent", sent_at: new Date().toISOString() } as any).eq("id", data.id);
          } catch (e) { console.error("Silent publish error", e); }
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
      fetchMessages();
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
    const previousMessages = queryClient.getQueryData<Message[]>(['messaging_messages', user?.id]);
    queryClient.setQueryData(['messaging_messages', user?.id], (old: Message[] | undefined) =>
      old?.filter(m => m.id !== id) || []
    );
    setMessages(prev => prev.filter(m => m.id !== id));
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) {
      queryClient.setQueryData(['messaging_messages', user?.id], previousMessages);
      setMessages(prev => [...prev, ...(previousMessages?.filter(m => m.id === id) || [])]);
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mensagem removida" });
    addNotification({ type: "info", title: "Mensagem excluída", message: "A mensagem foi removida do histórico." });
    queryClient.invalidateQueries({ queryKey: ['messaging_messages', user?.id] });
  };

  const handleDeleteConversation = async (recipientId: string) => {
    if (!user || !recipientId) return;
    if (!confirm("Tem certeza que deseja apagar todo o histórico desta conversa?")) return;
    toast({ title: "Apagando conversa..." });

    const actualId = recipientId.startsWith('ind-') ? recipientId.substring(4) : recipientId;

    const previousMessages = queryClient.getQueryData<Message[]>(['messaging_messages', user.id]);
    queryClient.setQueryData(['messaging_messages', user.id], (old: Message[] | undefined) =>
      old?.filter(m => m.recipient_phone !== actualId && m.recipient_name !== actualId && m.channel_id !== actualId) || []
    );

    const deleteFilters = [`recipient_phone.eq.${actualId}`,`recipient_name.eq.${actualId}`];
    const isUUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(actualId);
    if (isUUID) deleteFilters.push(`channel_id.eq.${actualId}`);

    const { error } = await supabase
      .from("messages")
      .delete()
      .or(deleteFilters.join(','));

    if (error) {
      console.error("[DELETE CONVERSATION] Error:", error);
      toast({ title: "Erro ao apagar", description: error.message, variant: "destructive" });
      queryClient.setQueryData(['messaging_messages', user.id], previousMessages);
      return;
    }

    toast({ title: "Conversa removida com sucesso" });
    setActiveChatId(null);
    queryClient.invalidateQueries({ queryKey: ['messaging_messages', user.id] });
  };

  const handleMarkSent = async (id: string) => {
    const msg = messages.find(m => m.id === id);
    if (!msg) return;

    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "sending" } : m));
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
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "failed" } : m));
      await supabase.from("messages").update({ status: "failed" } as any).eq("id", id);
      toast({ title: "Erro no envio", description: funcError?.message || "Falha na plataforma", variant: "destructive" });
    } else {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "sent", sent_at: new Date().toISOString() } : m));
      await supabase.from("messages").update({ status: "sent", sent_at: new Date().toISOString() } as any).eq("id", id);
      toast({ title: "Enviada com sucesso!" });
    }
    queryClient.invalidateQueries({ queryKey: ['messaging_messages', user?.id] });
  };

  const handleScheduleMessage = async (id: string, scheduledAt: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "scheduled", scheduled_at: scheduledAt } : m));
    const { error } = await supabase.from("messages").update({ status: "scheduled", scheduled_at: scheduledAt } as any).eq("id", id);
    if (error) {
      fetchMessages();
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mensagem agendada" });
    addNotification({ type: "info", title: "Mensagem agendada", message: `Agendada para ${new Date(scheduledAt).toLocaleString("pt-BR")}` });
    queryClient.invalidateQueries({ queryKey: ['messaging_messages', user?.id] });
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
    const previousMsg = editingMessage;
    setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, ...updates } : m));
    setEditingMessage(null);
    const { error } = await supabase.from("messages").update(updates).eq("id", previousMsg.id);
    if (error) {
      setMessages(prev => prev.map(m => m.id === previousMsg.id ? previousMsg : m));
      toast({ title: "Erro ao editar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mensagem atualizada" });
    addNotification({ type: "success", title: "Mensagem editada", message: "As alterações foram salvas." });
    queryClient.invalidateQueries({ queryKey: ['messaging_messages', user?.id] });
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

      <div className="mb-4 md:mb-8">
        <h1 className="font-display font-bold text-xl md:text-3xl mb-1 md:mb-2">Mensagens & Canais</h1>
        <p className="text-muted-foreground text-xs md:text-base">Gerencie canais, compose e veja o histórico de mensagens</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="channels" className="rounded-lg data-[state=active]:bg-background gap-2">
            <Hash className="w-4 h-4" /> Canais
          </TabsTrigger>
          <TabsTrigger value="inbox" className="rounded-lg data-[state=active]:bg-background gap-2">
            <MessageCircle className="w-4 h-4" /> Inbox
          </TabsTrigger>
          <TabsTrigger value="compose" className="rounded-lg data-[state=active]:bg-background gap-2">
            <Send className="w-4 h-4" /> Compor
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-background gap-2">
            <Clock className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        {/* ===== INBOX TAB (Unified Messaging Hub) ===== */}
        <TabsContent value="inbox">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[calc(100vh-280px)] md:h-[650px]">
            {/* Sidebar: Unified Chat List */}
            <div className={cn("md:col-span-4 glass-card rounded-2xl border border-border flex flex-col overflow-hidden", activeChatId ? "hidden md:flex" : "flex")}>
              <div className="p-4 border-b border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">Conversas</h3>
                  <Button variant="ghost" size="icon" onClick={() => { fetchChannels(); fetchMessages(); }} className="h-8 w-8"><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></Button>
                </div>

                {/* Internal Sidebar Tabs */}
                <div className="flex gap-1 p-1 bg-muted/40 rounded-xl mb-4 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
                  {[
                    { id: "all", label: "Todas" },
                    { id: "individual", label: "Privadas" },
                    { id: "groups", label: "Grupos" },
                    { id: "channels", label: "Canais" },
                    { id: "broadcast", label: "Transmissão" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSidebarTab(tab.id as any)}
                      className={cn(
                        "whitespace-nowrap px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                        sidebarTab === tab.id ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-muted/5">
                {filteredChats.map((chat) => {
                  const isActive = activeChatId === chat.key;
                  const styles = getPlatformStyles(chat.platform);
                  const platform = socialPlatforms.find(p => p.id === chat.platform);
                  const PlatformIcon = platform?.icon || MessageCircle;

                  const photoUrl = chat.photoUrl;
                  const TypeIcon = chat.channel_type === 'broadcast' ? Megaphone : (chat.type === 'individual' ? User : (chat.channel_type === 'group' ? Users : Hash));

                      return (
                        <button
                          key={chat.key}
                          onClick={() => {
                            setActiveChatId(chat.key);
                            setActiveChatType(chat.type as any);
                          }}
                          className={cn(
                            "w-full rounded-2xl transition-all text-left relative group border border-white/5 overflow-hidden mb-2 md:mb-3 aspect-[4/1] md:aspect-auto",
                            isActive
                              ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background shadow-2xl scale-[1.02] z-10"
                              : "hover:bg-white/5 opacity-80 hover:opacity-100"
                          )}
                        >
                          {/* Capa / Background Photo */}
                          <div className={cn("absolute inset-0 z-0", styles.chatBg)}>
                            {photoUrl ? (
                              <SafeImage src={photoUrl} alt={chat.name} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                            ) : (
                              <div className={cn("w-full h-full opacity-20", styles.bg)} />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent z-1" />
                          </div>

                          <div className="relative z-10 p-4 flex items-center gap-4">
                            <div className="relative shrink-0">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-lg flex items-center justify-center backdrop-blur-md bg-white/5",
                              )}>
                                {photoUrl ? (
                                  <SafeImage src={photoUrl} alt={chat.name} className="w-full h-full object-cover" />
                                ) : (
                                  <TypeIcon className={cn("w-7 h-7", styles.accent)} />
                                )}
                              </div>
                              {(chat.is_online || (chat.online_count || 0) > 0) && (
                                <div className="absolute -top-1 -right-1 flex items-center justify-center">
                                  <div className="relative w-3.5 h-3.5 rounded-full border-2 border-background bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                </div>
                              )}
                              <div className={cn("absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border border-background shadow-lg flex items-center justify-center", styles.bg)}>
                                <PlatformIcon className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className={cn("font-bold text-base truncate font-display", isActive ? "text-white" : "text-white/90")}>
                                  {chat.name}
                                </p>
                                {chat.lastMsg && (
                                  <span className="text-[10px] font-bold opacity-30">
                                    {new Date(chat.lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-white/40 bg-white/5 px-2 py-0.5 rounded-md">
                                  <Users className="w-3 h-3 opacity-50" />
                                  <span>{((chat as any).members_count || 0).toLocaleString('pt-BR')}</span>
                                </div>
                                {(chat as any).online_count > 0 && (
                                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/10">
                                    <div className="w-1 h-1 rounded-full bg-green-400" />
                                    <span>{(chat as any).online_count.toLocaleString('pt-BR')} online</span>
                                  </div>
                                )}
                                {chat.type === 'channel' && (
                                  <Badge variant="outline" className={cn("px-1.5 py-0 h-4 text-[9px] font-bold border-current/20 whitespace-nowrap bg-white/5 uppercase")}>
                                    {getTypeLabel(chat.channel_type || 'group')}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-white/50 truncate mt-1">
                                {chat.lastMsg ? chat.lastMsg.content : "Nenhuma mensagem recente"}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
              </div>
            </div>

            {/* Main Chat Area */}
            <div className={cn("md:col-span-8 glass-card rounded-2xl border border-border flex flex-col overflow-hidden bg-muted/5", !activeChatId && "hidden md:flex")}>
              {activeChatId ? (
                (() => {
                  const isChannel = activeChatType === "channel";
                  const channelData = isChannel
                    ? channels.find(c => c.channel_id === activeChatId || c.id === activeChatId)
                    : null;
                  const msgData = !isChannel
                    ? messages.find(m => m.recipient_phone === activeChatId || m.recipient_name === activeChatId)
                    : null;
                  const styles = getPlatformStyles(isChannel ? channelData?.platform : msgData?.platform);

                  const conn = connections.find(c =>
                        (isChannel && (c.platform_user_id === (channelData?.channel_id || channelData?.id))) ||
                        (!isChannel && (c.page_name === activeChatId || c.platform_user_id === activeChatId))
                      );

                  const photoUrl = getChatPhoto(isChannel ? (channelData?.profile_picture || conn?.profile_image_url) : (conn?.profile_image_url));
                  const name = isChannel ? (channelData?.channel_name || activeChatId) : (msgData?.recipient_name || activeChatId);
                  const typeLabel = isChannel ? getTypeLabel(channelData?.channel_type || 'group') : "Contato Individual";

                  return (
                    <>
                      <div className={cn("p-4 border-b border-border flex items-center justify-between", styles.chatBg)}>
                        <div className="flex items-center gap-4">
                          <div
                            className={cn("w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden border border-white/5 shadow-2xl cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all", styles.softBg)}
                            onClick={() => { if (isChannel && channelData) handleOpenInfo(channelData); }}
                          >
                            {photoUrl ? (
                              <SafeImage src={photoUrl} className="w-full h-full object-cover" />
                            ) : <User className={cn("w-6 h-6", styles.accent)} />}
                          </div>
                          <div>
                            <h3 className={cn("font-bold text-lg leading-tight", styles.accent)}>{name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4 font-bold uppercase tracking-wider border-current/20 text-white/70 bg-white/5", styles.accent)}>{typeLabel}</Badge>
                              {isChannel && channelData?.members_count && channelData.members_count > 0 && (
                                <span className="text-[10px] font-bold text-white/40">{channelData.members_count.toLocaleString('pt-BR')} membros</span>
                              )}
                              {(channelData?.online_count || 0) > 0 ? (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-tighter">
                                    {channelData?.online_count.toLocaleString('pt-BR')} Online
                                  </span>
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
                          {isChannel && (
                             <Button
                               variant="ghost"
                               size="icon"
                               className="rounded-xl hover:bg-white/10"
                               disabled={loading}
                               onClick={async () => {
                                 toast({ title: "Sincronizando...", description: "Atualizando dados desta conversa em tempo real." });
                                 await syncChannels(channelData?.platform);
                               }}
                             >
                               <RefreshCw className={cn("w-4 h-4 text-primary", loading && "animate-spin")} />
                             </Button>
                          )}
                          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => { setChatSearchOpen(!chatSearchOpen); setChatSearchQuery(""); }}>
                            <Search className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-xl">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => { if (isChannel && channelData) handleOpenInfo(channelData); }} className="cursor-pointer">
                                <Info className="w-4 h-4 mr-2" /> Ver Informações
                              </DropdownMenuItem>
                              {isChannel && channelData && (
                                <DropdownMenuItem onClick={() => handleEditChannel(channelData)} className="cursor-pointer">
                                  <Edit className="w-4 h-4 mr-2" /> Editar Canal
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={cleanupSystemMessages} className="cursor-pointer">
                                <AlertCircle className="w-4 h-4 mr-2" /> Limpar Mensagens do Sistema
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  if (isChannel && channelData) {
                                    handleDelete(channelData.id, e as any);
                                    setActiveChatId(null);
                                  } else if (activeChatId) {
                                    handleDeleteConversation(activeChatId);
                                  } else {
                                    toast({ title: "Erro", description: "Nenhuma conversa ativa para excluir." });
                                  }
                                }}
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Excluir Histórico/Conversa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Chat search bar */}
                      {chatSearchOpen && (
                        <div className={cn("px-4 py-2 border-b border-white/5", styles.chatBg)}>
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

                      {/* Message List Rendering */}
                      {activeMessages.length === 0 && chatSearchQuery.trim() ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                          <Search className="w-12 h-12 mb-2" />
                          <p className="text-sm font-medium">Nenhuma mensagem encontrada</p>
                        </div>
                      ) : (
                        <div className={cn("flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4", styles.chatBg)}>
                          {activeMessages.map((msg) => {
                            const isSelfMsg = msg.status !== "received";
                            const msgStyles = getPlatformStyles(msg.platform);
                            const mediaType = inferMediaType(msg.media_url);
                            const mediaUrl = msg.media_url;
                            return (
                              <div key={msg.id} className={cn("flex flex-col", isSelfMsg ? "items-end" : "items-start")}>
                                <div className={cn(
                                  "max-w-[95%] sm:max-w-[85%] px-3 md:px-4 py-2.5 rounded-2xl text-[14px] relative shadow-xl backdrop-blur-md group/msg",
                                  isSelfMsg ? cn(msgStyles.bubbleSelf, "rounded-tr-none") : cn(msgStyles.bubbleOther, "rounded-tl-none")
                                )}>
                                  <div className="absolute top-1 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10 bg-background/20 backdrop-blur-md rounded-md">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="p-1 rounded hover:bg-black/20 text-white/70 hover:text-white transition-all">
                                          <MoreHorizontal className="w-3.5 h-3.5" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align={isSelfMsg ? "end" : "start"} className="w-40 bg-background/95 backdrop-blur-xl border-border/50">
                                        <DropdownMenuItem onClick={() => openEditMessage(msg)} className="cursor-pointer">
                                          <Edit className="w-4 h-4 mr-2" /> Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive">
                                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  <p className="leading-relaxed font-medium whitespace-pre-wrap break-words">{msg.content}</p>

                                  {mediaUrl && mediaType === "image" && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                      <SafeImage src={mediaUrl} alt="Imagem" className="max-h-[300px] w-full object-contain" />
                                    </div>
                                  )}

                                  {mediaUrl && (mediaType === "video") && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                      <video src={mediaUrl} controls preload="metadata" className="max-h-[300px] w-full" style={{ aspectRatio: "16/9" }}>
                                        Seu navegador não suporta vídeo.
                                      </video>
                                    </div>
                                  )}

                                  {mediaUrl && (mediaType === "audio") && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/20 p-3">
                                      <audio src={mediaUrl} controls preload="metadata" className="w-full h-10" />
                                    </div>
                                  )}

                                  {mediaUrl && mediaType === "document" && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/20 p-3 flex items-center gap-3">
                                      <FileText className="w-8 h-8 text-amber-400 shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold truncate">Documento</p>
                                      </div>
                                      <a href={mediaUrl} target="_blank" rel="noopener noreferrer" download>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full"><Download className="w-4 h-4" /></Button>
                                      </a>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-end gap-1.5 mt-1 opacity-40 text-[9px] font-bold uppercase">
                                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isSelfMsg && msg.status !== "sending" && <CheckCircle2 className={cn("w-2.5 h-2.5", msg.status === "failed" && "text-red-500")} />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="p-2 md:p-4 border-t border-border bg-background/80 backdrop-blur-sm">
                        <div className="flex items-end gap-2 md:gap-3 max-w-4xl mx-auto">
                          <div className="flex gap-0.5 md:gap-1 mb-1.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary hidden sm:flex" onClick={() => openFileDialog("*/*")} title="Anexar Arquivo"><Paperclip className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary" onClick={() => openFileDialog("image/*")} title="Anexar Imagem"><Image className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary" onClick={() => openFileDialog("video/*")} title="Anexar Vídeo"><Video className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary" onClick={() => openFileDialog("audio/*")} title="Gravar Áudio"><Mic className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary hidden sm:flex" onClick={handleLocationAttach} title="Enviar Localização"><MapPin className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary" onClick={() => {
                              const emojis = ["😀","😂","😍","🤔","😎","🙏","💪","🔥","❤️","🎉","👍","✅","⭐","💯","🎯","🚀"];
                              const pick = emojis[Math.floor(Math.random() * emojis.length)];
                              setReplyMessage(prev => prev + pick);
                            }} title="Adicionar Emoji"><Smile className="w-4 h-4" /></Button>
                          </div>

                          <div className="flex-1 relative">
                            <Textarea
                              placeholder="Digite uma mensagem..."
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              className="min-h-[44px] max-h-[200px] resize-none py-3 pr-12 bg-muted/30 border-border/50 rounded-2xl focus:ring-primary/30 text-sm"
                              disabled={sendingReply}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleReply();
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              className={cn(
                                "h-9 w-9 absolute right-1.5 bottom-1.5 rounded-xl shadow-lg transition-all bg-primary text-white"
                              )}
                              onClick={() => handleReply()}
                              disabled={sendingReply || (!replyMessage.trim() && attachments.length === 0)}
                            >
                              {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 text-center bg-gradient-to-b from-transparent to-primary/5">
                  <div className="w-24 h-24 rounded-[2rem] bg-muted/50 border border-border flex items-center justify-center mb-6 shadow-inner">
                    <MessageCircle className="w-10 h-10 opacity-20" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Hub de Mensagens Unificado</h3>
                  <p className="max-w-sm text-sm leading-relaxed opacity-70">
                    Selecione uma conversa ao lado para visualizar o histórico de mensagens e interagir em tempo real com seus canais e contatos.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm">
                    <div className="p-4 rounded-2xl border border-border bg-background/50 flex flex-col items-center gap-2">
                      <Hash className="w-5 h-5 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-tighter">Canais</span>
                    </div>
                    <div className="p-4 rounded-2xl border border-border bg-background/50 flex flex-col items-center gap-2">
                       <User className="w-5 h-5 text-primary" />
                       <span className="text-xs font-bold uppercase tracking-tighter">Privadas</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== CHANNELS TAB ===== */}
        <TabsContent value="channels">
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Canal
            </Button>
            <Button variant="outline" onClick={() => { setDiscoverChatIds(""); setDiscoverResults([]); setShowDiscoverDialog(true); }} className="gap-2 border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
              <Search className="w-4 h-4" /> Descobrir Grupos/Canais
            </Button>
            <Button variant="outline" onClick={syncChannels} disabled={loading} className="gap-2">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Sincronizar
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
                        const platformColor = socialPlatforms.find(p => p.id === ch.platform)?.color || "bg-muted";
                        const platformIcon = socialPlatforms.find(p => p.id === ch.platform)?.icon;
                        const PIcon = platformIcon;

                        return (
                          <motion.div key={ch.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                            whileHover={{ y: -4 }}
                            onClick={() => {
                              setActiveTab("inbox");
                              setActiveChatId(ch.channel_id || ch.id);
                              setActiveChatType("channel");
                            }}
                            className="glass-card rounded-2xl border border-border p-4 hover:border-primary/40 hover:shadow-lg transition-all group overflow-hidden relative cursor-pointer">
                            
                            {/* Decorative background gradient */}
                            <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity")} />

                            <div className="flex items-start justify-between relative z-10">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-background shadow-md bg-muted/30">
                                    {ch.profile_picture ? (
                                      <SafeImage 
                                        src={ch.profile_picture} 
                                        alt={ch.channel_name} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        fallbackLetter={ch.channel_name?.substring(0, 1)}
                                      />
                                    ) : (
                                      <div className={cn("w-full h-full flex items-center justify-center", platformColor)}>
                                        {PIcon ? <PIcon className="w-7 h-7 text-white" /> : <TypeIcon className="w-7 h-7 text-muted-foreground" />}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Platform mini-badge */}
                                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-background flex items-center justify-center p-1 border border-border shadow-sm">
                                    {PIcon ? (
                                      <div className={cn("w-full h-full rounded-sm flex items-center justify-center", platformColor)}>
                                        <PIcon className="w-2.5 h-2.5 text-white" />
                                      </div>
                                    ) : (
                                      <TypeIcon className="w-2.5 h-2.5 text-primary" />
                                    )}
                                  </div>
                                </div>

                                <div className="min-w-0">
                                  <p className="font-display font-bold text-base truncate pr-2">{ch.channel_name}</p>
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                    <TypeIcon className="w-3 h-3" />
                                    {getTypeLabel(ch.channel_type)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-1 shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); handleEditChannel(ch, e); }}
                                  className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all duration-200" title="Editar canal">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => handleDelete(ch.id, e)}
                                  className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all duration-200" title="Remover canal">

                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Stats bar */}
                            <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-border/40">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 text-primary border border-primary/10 transition-colors group-hover:bg-primary/10">
                                <Users className="w-3.5 h-3.5" /> 
                                <span className="text-xs font-bold">{(ch.members_count || 0).toLocaleString('pt-BR')}</span>
                                <span className="text-[10px] opacity-70 font-medium">seguidores</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50 text-muted-foreground transition-colors group-hover:bg-muted/80">
                                <Send className="w-3.5 h-3.5" /> 
                                <span className="text-xs font-bold">{( (ch as any).posts_count || 0).toLocaleString('pt-BR')}</span>
                                <span className="text-[10px] opacity-70 font-medium">posts</span>
                              </div>

                              {ch.online_count > 0 && (
                                <div className="flex items-center gap-1.5 text-green-500 bg-green-500/5 px-3 py-1.5 rounded-xl border border-green-500/10">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" /> 
                                  <span className="text-xs font-bold">{ch.online_count}</span>
                                  <span className="text-[10px] opacity-70 font-medium whitespace-nowrap">online</span>
                                </div>
                              )}
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
                                <button onClick={(e) => { e.stopPropagation(); handleEditChannel(ch, e); }}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-accent transition-all" title="Editar canal">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => handleDelete(ch.id, e)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all" title="Remover canal">

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
                          className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all border",
                            selected ? "bg-primary/10 border-primary/40 shadow-sm" : "hover:bg-muted/40 border-transparent")}>
                          <div className="relative shrink-0">
                            {ch.profile_picture ? (
                              <SafeImage src={ch.profile_picture} alt={ch.channel_name} className="w-8 h-8 rounded-lg object-cover border border-border" fallbackLetter={ch.channel_name?.substring(0, 1)} />
                            ) : (
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", platform?.color || "bg-muted")}>
                                {PIcon ? <PIcon className="w-4 h-4 text-white" /> : <Hash className="w-4 h-4 text-muted-foreground" />}
                              </div>
                            )}
                            {PIcon && (
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-md bg-background flex items-center justify-center p-0.5 border border-border">
                                <PIcon className="w-2 h-2 text-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-bold truncate">{ch.channel_name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-70">
                              {ch.members_count > 0 ? `${ch.members_count.toLocaleString('pt-BR')} membros` : getTypeLabel(ch.channel_type)}
                            </p>
                          </div>
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
                {[{ id: "all", label: "Todas" }, { id: "draft", label: "Rascunhos" }, { id: "scheduled", label: "Agendadas" }, { id: "sent", label: "Enviadas" }, { id: "received", label: "Recebidas" }, { id: "failed", label: "Falhas" }].map(f => (
                  <Button key={f.id} variant={historyFilter === f.id ? "default" : "outline"} size="sm" onClick={() => setHistoryFilter(f.id)}>
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {messagesLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 w-full rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>

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
                        <div className="relative shrink-0">
                          {ch?.profile_picture ? (
                            <SafeImage src={ch.profile_picture} alt={ch.channel_name} className="w-12 h-12 rounded-xl object-cover border border-border shadow-sm" fallbackLetter={ch.channel_name?.substring(0, 1)} />
                          ) : (
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", platform?.color || "bg-muted")}>
                              {PIcon ? <PIcon className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-muted-foreground" />}
                            </div>
                          )}
                          {PIcon && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-background flex items-center justify-center p-1 border border-border shadow-sm">
                              <PIcon className="w-3 h-3 text-foreground" />
                            </div>
                          )}
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

      {/* ===== Avatar Full-size Modal ===== */}
      <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DialogContent className="sm:max-w-md p-0 bg-black/95 border-none" aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>Foto do Perfil</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center p-6 gap-4">
            <div className="w-64 h-64 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
              {selectedInfoChannel?.profile_picture ? (
                <SafeImage src={getChatPhoto(selectedInfoChannel.profile_picture) || ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center"><User className="w-20 h-20 opacity-20" /></div>
              )}
            </div>
            <h3 className="text-lg font-bold text-white text-center">{selectedInfoChannel?.channel_name || activeChatId}</h3>
            <p className="text-xs text-white/40">ID: {selectedInfoChannel?.channel_id}</p>
            {selectedInfoChannel?.members_count && selectedInfoChannel.members_count > 0 && (
              <p className="text-xs text-white/50">{selectedInfoChannel.members_count.toLocaleString('pt-BR')} membros</p>
            )}
            {selectedInfoChannel?.created_at && (
              <p className="text-[10px] text-white/30">Registrado em {new Date(selectedInfoChannel.created_at).toLocaleDateString('pt-BR')}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Discover Telegram/WhatsApp Channels Dialog ===== */}
      <Dialog open={showDiscoverDialog} onOpenChange={setShowDiscoverDialog}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Busca e Descoberta de Perfis/Grupos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
              <button
                onClick={() => setDiscoverPlatform("telegram")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                  discoverPlatform === "telegram" ? "bg-background shadow-sm text-blue-500" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Telegram
              </button>
              <button
                onClick={() => setDiscoverPlatform("whatsapp")}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                  discoverPlatform === "whatsapp" ? "bg-background shadow-sm text-green-500" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="w-2 h-2 rounded-full bg-green-500" /> WhatsApp
              </button>
            </div>

            <div className={cn(
              "border rounded-xl p-3 text-sm",
              discoverPlatform === "telegram" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-green-500/10 border-green-500/20 text-green-400"
            )}>
              <p className="font-semibold mb-1">Como buscar:</p>
              <ul className={cn(
                "list-disc list-inside space-y-1 text-xs",
                discoverPlatform === "telegram" ? "text-blue-300" : "text-green-300"
              )}>
                {discoverPlatform === "telegram" ? (
                  <>
                    <li>Use <code className="bg-blue-500/20 px-1 rounded">@username</code> ou Link (<code className="bg-blue-500/20 px-1 rounded">t.me/...</code>)</li>
                    <li>Grupos privados: use o ID numérico completo (<code className="bg-blue-500/20 px-1 rounded">-100...</code>)</li>
                    <li>O Bot deve ser **membro ou administrador** do grupo</li>
                  </>
                ) : (
                  <>
                    <li>Use o número completo com DDD (ex: <code className="bg-green-500/20 px-1 rounded">55119...</code>)</li>
                    <li>Links de grupos e comunidades também são suportados</li>
                    <li>Busca de perfis individuais exibe nome e status quando disponível</li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {discoverPlatform === "telegram" ? "IDs / Usernames / Links" : "Números (com DDD) / Links"}
              </label>
              <Textarea
                value={discoverChatIds}
                onChange={e => setDiscoverChatIds(e.target.value)}
                placeholder={discoverPlatform === "telegram" ? "@MeuCanal\n-1001234567890\nt.me/id" : "5511900000000\nchat.whatsapp.com/..."}
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            {discoverResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Resultados:</p>
                {discoverResults.map((r, i) => (
                  <div key={i} className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border text-sm",
                    r.success ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                  )}>
                    <div className="relative shrink-0">
                      {r.photo ? (
                        <SafeImage src={r.photo} alt={r.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          {discoverPlatform === "whatsapp" ? <Phone className="w-5 h-5 text-green-500" /> : <Users className="w-5 h-5 text-blue-500" />}
                        </div>
                      )}
                      {r.isOnline && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-sm" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{r.name || r.chatId}</p>
                            {r.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          {r.success ? (
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider shrink-0",
                                discoverPlatform === 'telegram' ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" : "bg-green-500/20 text-green-400 border border-green-500/20"
                              )}>
                                {r.type}
                              </span>
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0">
                                {r.members > 0 ? (
                                  <span className="font-medium text-foreground/80">{r.members.toLocaleString('pt-BR')} membros</span>
                                ) : (
                                  <span>{r.type === 'individual' ? 'Perfil Seguro' : 'Grupo/Comunidade'}</span>
                                )}
                                {r.username && <span className="text-primary truncate">· {r.username}</span>}
                                {r.isOnline && <span className="text-green-500 font-medium shrink-0 ml-1">● Online</span>}
                                {r.registered && <span className="text-green-500 font-bold ml-1 shrink-0">✓ Vinculado</span>}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-red-400">{r.error}</p>
                          )}
                        </div>

                        {r.success && (
                          <div className="flex items-center gap-2 shrink-0">
                            {r.registered && (
                              <Badge variant="outline" className="h-8 rounded-lg bg-green-500/10 text-green-400 border-green-500/20 gap-1 font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Vinculado
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant={r.registered ? "outline" : "secondary"}
                              className="h-8 gap-1.5"
                              onClick={() => handleLinkDiscoveryResult(r)}
                              disabled={linkingResult === r.chatId}
                            >
                              {linkingResult === r.chatId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : r.registered ? (
                                <RefreshCw className="w-3.5 h-3.5" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              {r.registered ? "Atualizar" : "Vincular"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscoverDialog(false)}>Fechar</Button>
            <Button
              onClick={handleDiscoverTelegramChats}
              disabled={discovering}
              className={cn(
                "gap-2 transition-all",
                discoverPlatform === "whatsapp" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {discovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {discovering ? "Buscando..." : "Buscar e Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Detailed Info Dialog ===== */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className={cn(
          "sm:max-w-2xl p-0 overflow-hidden border-none shadow-2xl",
          selectedInfoChannel?.platform === "whatsapp" ? "bg-[#0b141a]" : "bg-[#17212b]"
        )} aria-describedby={undefined}>
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedInfoChannel?.channel_name || "Informações do Canal"}</DialogTitle>
          </DialogHeader>
          
          {/* Header Banner */}
          <div className={cn(
             "relative p-6 flex items-center gap-6",
             selectedInfoChannel?.platform === "whatsapp" ? "bg-[#202c33]" : "bg-[#242f3d]"
          )}>
            <div className="relative cursor-pointer" onClick={() => setShowAvatarModal(true)}>
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 shadow-xl hover:ring-2 hover:ring-primary/50 transition-all">
                 {selectedInfoChannel?.profile_picture ? (
                   <SafeImage src={getChatPhoto(selectedInfoChannel.profile_picture) || ""} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full bg-muted flex items-center justify-center">
                     <User className="w-10 h-10 opacity-30" />
                   </div>
                 )}
              </div>
              {selectedInfoChannel?.is_online && (
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#202c33] shadow-lg" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
               <h2 className="text-2xl font-bold text-white">{selectedInfoChannel?.channel_name}</h2>
               <div className="flex items-center gap-2 mt-1 flex-wrap">
                 <Badge variant="outline" className="bg-white/5 border-white/10 text-white/60">
                   {getTypeLabel(selectedInfoChannel?.channel_type || "group")}
                 </Badge>
                 <span className="text-xs text-white/40 font-medium">#{selectedInfoChannel?.channel_id}</span>
               </div>
               <p className="text-[10px] text-white/30 mt-1">
                 Registrado em {selectedInfoChannel?.created_at ? new Date(selectedInfoChannel.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
               </p>
            </div>
            
            <Button variant="ghost" size="icon" onClick={() => setShowInfoDialog(false)} className="text-white/40 hover:text-white hover:bg-white/5 shrink-0">
               <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Membros Total", val: selectedInfoChannel?.members_count || 0, icon: Users, color: "text-blue-400" },
                { label: "Online Agora", val: selectedInfoChannel?.online_count || 0, icon: Clock, color: "text-green-400" },
                { label: "Posts Realizados", val: infoPosts, icon: SendHorizontal, color: "text-purple-400" },
                { label: "Administradores", val: infoMembers.filter((m: any) => m.is_admin).length, icon: UserPlus, color: "text-orange-400" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                  <p className="text-xl font-bold text-white">{(typeof stat.val === 'number' ? stat.val : 0).toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Audience Chart */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest opacity-80">
                   <BarChart3 className="w-4 h-4 text-primary" /> Histórico de Audiência
                </h3>
                <span className="text-[10px] text-white/40 font-bold bg-white/5 px-2 py-1 rounded-lg">
                  {audienceLogs.length > 0 ? `${audienceLogs.length} registros` : "AGUARDANDO DADOS"}
                </span>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 h-32 flex items-end justify-between gap-1 overflow-hidden group">
                 {audienceLogs.length > 0 ? (
                   audienceLogs.map((log: any, i: number) => {
                     const maxMembers = Math.max(...audienceLogs.map((l: any) => l.members_online || 1));
                     const h = Math.max(5, Math.round(((log.members_online || 0) / maxMembers) * 100));
                     return (
                       <div key={i} className="flex-1 bg-primary/20 hover:bg-primary transition-all rounded-t-sm relative group/bar" style={{ height: `${h}%` }}>
                         <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-[8px] px-1 rounded opacity-0 group-hover/bar:opacity-100 font-bold whitespace-nowrap">
                           {log.members_online} online
                         </div>
                       </div>
                     );
                   })
                 ) : (
                   <div className="flex-1 flex items-center justify-center text-white/20 text-xs font-medium">
                     Os dados do gráfico serão preenchidos conforme a atividade for capturada
                   </div>
                 )}
              </div>
              {audienceLogs.length > 0 && (
                <div className="flex justify-between mt-2 text-[9px] text-white/20 font-bold uppercase tracking-widest px-1">
                  <span>{new Date(audienceLogs[0]?.logged_at).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
                  <span>{new Date(audienceLogs[audienceLogs.length-1]?.logged_at).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-10 rounded-xl bg-white/5 border-white/10 text-white/70 hover:bg-white/10 gap-2" onClick={() => {
                const link = selectedInfoChannel?.channel_id || '';
                navigator.clipboard.writeText(link);
                toast({ title: "Link copiado!", description: link });
              }}>
                <Copy className="w-4 h-4" /> Copiar Link
              </Button>
              <Button variant="outline" className="h-10 rounded-xl bg-white/5 border-white/10 text-white/70 hover:bg-white/10 gap-2" onClick={handleOpenAddPeople}>
                <UserPlus className="w-4 h-4" /> Adicionar Pessoas
              </Button>
            </div>

            {/* Connected Profiles / Admins */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest opacity-80">
                   <Users className="w-4 h-4 text-primary" /> Perfis e Administradores ({infoMembers.length})
                </h3>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 rounded-xl bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20 gap-2"
                  onClick={syncToGoogle}
                  disabled={syncingGoogle || infoMembers.length === 0}
                >
                  {syncingGoogle ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Sincronizar Google
                </Button>
              </div>
              
              <div className="space-y-2">
                {fetchingInfo ? (
                   <div className="flex items-center justify-center py-10 opacity-30"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : infoMembers.length === 0 ? (
                   <div className="bg-white/5 rounded-2xl p-8 border border-dashed border-white/10 text-center">
                     <p className="text-sm text-white/30">Nenhum perfil identificado ainda. Use a busca para capturar contatos.</p>
                   </div>
                ) : infoMembers.map((member: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                       {member.profile_picture ? (
                         <SafeImage src={member.profile_picture} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/20 font-bold">{member.full_name?.charAt(0) || "?"}</div>
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-xs font-bold text-white truncate">{member.full_name || member.phone_number}</p>
                       <p className="text-[10px] text-white/40 truncate">
                         {member.username ? `@${member.username}` : member.phone_number} 
                         {member.is_admin && <span className="ml-2 text-primary/60 font-black">ADM</span>}
                       </p>
                    </div>
                    {member.google_contact_id ? (
                      <Badge className="bg-green-500/20 text-green-400 border-none h-5 px-1.5 text-[8px] font-black uppercase">SYNC</Badge>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/10" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-white/5 text-center">
             <p className="text-[9px] text-white/20 font-medium uppercase tracking-[0.2em]">Vitória Net Advanced Messaging Business Module v3.4</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Add People Dialog (Contact Picker) ===== */}
      <Dialog open={showAddPeopleDialog} onOpenChange={setShowAddPeopleDialog}>
        <DialogContent className="sm:max-w-md bg-[#17212b] border border-white/10 p-0 overflow-hidden" aria-describedby={undefined}>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Selecionar Contato
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 pt-2 space-y-4">
            <p className="text-xs text-white/40">Selecione contatos do seu Hub para adicionar ao grupo <strong>{selectedInfoChannel?.channel_name}</strong>.</p>
            
            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10">
              {loadingContacts ? (
                <div className="flex items-center justify-center py-20 opacity-30"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : hubContacts.length === 0 ? (
                <div className="bg-white/5 rounded-2xl p-8 border border-dashed border-white/10 text-center">
                  <p className="text-xs text-white/30">Nenhum contato encontrado no Hub.</p>
                </div>
              ) : hubContacts.map((contact: any, i: number) => {
                const isAlreadyIn = infoMembers.some((m: any) => m.phone_number === contact.phone || m.full_name === contact.name);
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 group transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">{contact.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{contact.name}</p>
                      <p className="text-[10px] text-white/40">{contact.phone || "Sem dados"}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className={cn(
                        "h-8 rounded-lg",
                        isAlreadyIn ? "text-green-500 opacity-50" : "text-primary hover:bg-primary/20"
                      )}
                      onClick={() => !isAlreadyIn && handleAddPerson(contact)}
                      disabled={addingContactId === contact.id || isAlreadyIn}
                    >
                      {addingContactId === contact.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isAlreadyIn ? "Já no grupo" : "Adicionar"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="p-4 bg-white/5 border-t border-white/5 text-right">
             <Button variant="ghost" onClick={() => setShowAddPeopleDialog(false)} className="text-white/40 text-xs text-white hover:bg-white/5">Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
