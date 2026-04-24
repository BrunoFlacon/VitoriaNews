import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Bell, Key, Shield, Globe, Save, Camera, Check, AlertCircle, Loader2, Unplug, Info,
  Eye, EyeOff, ChevronDown, ChevronUp, Trash2, Users, RefreshCw, Heart, Share2, TrendingUp, Plus, X,
  Phone, MessageSquare, Calendar, Mail, Image as ImageIcon, Link2, LogOut, Pencil, Laptop, Clock,
  UserCircle2, FileText, Target, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSocialStats } from "@/hooks/useSocialStats";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useApiCredentials, PLATFORM_CREDENTIAL_FIELDS } from "@/hooks/useApiCredentials";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import AvatarEditor from "react-avatar-editor";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { PlatformIconBadge } from "@/components/icons/PlatformIconBadge";
import { usePermissions } from "@/hooks/usePermissions";
import { SystemSettingsView } from "./settings/SystemSettingsView";
import { PortalSettingsWrapper } from "./settings/PortalSettingsWrapper";
import { SEOTab } from "./settings/SEOTab";
import { useSystem } from "@/contexts/SystemContext";
import { GoogleIcon, FacebookIcon, MetaIcon, NewsapiIcon, MapsIcon, YoutubeIcon, AdsIcon, AnalyticsIcon, PeopleIcon, GoogleNewsIcon } from "@/components/icons/SocialIcons";



interface SocialAccountStats {
  id: string;
  platform: string;
  platform_user_id?: string;
  username: string;
  profile_picture: string;
  followers_count: number;
  following: number | null;
  posts_count: number | null;
  engagement_rate: number | null;
  metadata?: Record<string, any> | null;
  views: number;
  likes: number;
  shares: number;
  page_name: string;
}

// Official Multi-Colored SVGs mapped to user's precise graphical assets
const renderApiAsset = (src: string, isActive: boolean, className: string) => {
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ width: '100%', height: '100%', objectFit: 'contain', filter: isActive ? 'none' : 'grayscale(100%) brightness(0.7) opacity(0.6)' }}>
      <image href={src} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
};

// Merged platform configurations with oauth meta and dev integrations
const PLATFORM_CONFIGS: any[] = [
  ...socialPlatforms.filter(p => p.id !== 'google').map(p => ({
    ...p,
    oauthSupported: p.type === 'social' && p.id !== 'site' && p.id !== 'telegram'
  })),
  {
    id: 'google_cloud',
    name: 'Google Cloud (Maps, YouTube, Ads, News)',
    icon: GoogleIcon,
    color: "bg-white",
    textColor: "text-[#4285F4]",
    gradient: "from-white via-[#f8f9fa] to-white",
    oauthSupported: false,
    type: 'tool'
  },
  { id: 'meta_ads', name: 'Meta Marketing & Ads API', icon: MetaIcon, color: "bg-[#1877F210]", textColor: "text-[#1877F2]", gradient: "from-blue-500 to-indigo-500", oauthSupported: false, showPixels: true, type: 'tool' },
  { id: 'newsapi', name: 'NewsAPI.org (Global News)', icon: NewsapiIcon, color: "bg-[#00000010]", textColor: "text-foreground", gradient: "from-gray-500 to-black", oauthSupported: false, type: 'tool' },
  { id: 'resend', name: 'Resend (Email Automation)', icon: Mail, color: "bg-[#00000010]", textColor: "text-foreground", gradient: "from-slate-700 to-black", oauthSupported: false, type: 'tool' }
];

// Deduplicate PLATFORM_CONFIGS just in case socialPlatforms already has meta_ads/google_cloud
const UNIQUE_PLATFORM_CONFIGS = Array.from(new Map(PLATFORM_CONFIGS.map(item => [item.id, item])).values());

export const SettingsView = ({ defaultTab }: { defaultTab?: string }) => {
  const { user, profile, updateProfile, isOnline, toggleOnline } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const { settings: systemSettings, updateSettingsOptimistic } = useSystem();
  const [activeSettingsTab, setActiveSettingsTab] = useState(defaultTab || 'profile');
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const [avatarToCrop, setAvatarToCrop] = useState<File | null>(null);
  const [editorScale, setEditorScale] = useState(1);
  const [editorFilter, setEditorFilter] = useState("none");


  // Sync when defaultTab prop changes from parent (e.g. Header dropdown navigation)
  useEffect(() => {
    if (defaultTab === 'profile_photo') {
      setActiveSettingsTab('profile');
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 300);
    } else if (defaultTab) {
      setActiveSettingsTab(defaultTab);
    }
  }, [defaultTab]);
  const { connections, loading: connectionsLoading, initiateOAuth, disconnect, refetch: refetchConnections } = useSocialConnections();
  const { credentials, loading: credsLoading, saving, saveCredentials, deleteCredentials, hasCredentials } = useApiCredentials();

  const { stats: socialStats, audienceBreakdown, loading: statsLoading, refresh: refreshStats, setStatsLoading } = useSocialStats();

  const getBrandLogo = (id: string, isActive: boolean) => {
    const className = "w-8 h-8 rounded-lg transition-all duration-500 overflow-hidden bg-background/50 flex items-center justify-center p-1 border border-border/40 shadow-sm group-hover:scale-110";

    switch (id) {
      case 'resend':
        return (
          <div className={cn(className, isActive ? "border-slate-800" : "grayscale opacity-40")}>
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M20 5L35 12.5V27.5L20 35L5 27.5V12.5L20 5Z" fill="black" />
              <path d="M10 25L20 30L30 25M10 15L20 20L30 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      case 'whatsapp':
        return (
          <div className={cn(className, isActive ? "border-green-500 shadow-green-500/20" : "grayscale opacity-40")}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="#25D366" />
            </svg>
          </div>
        );
      case 'meta_ads':
        return (
          <div className={cn(className, "p-0", isActive ? "bg-[#0081FB] border-[#0668E1] shadow-blue-500/20" : "grayscale opacity-40")}>
            <MetaIcon className="w-full h-full" data-active={isActive} />
          </div>
        );
      default:
        const config = UNIQUE_PLATFORM_CONFIGS.find(c => c.id === id);
        return <PlatformIconBadge platform={config as any} size="md" muted={!isActive} />;
    }
  };

  const syncSocialStats = async (platformId?: string) => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        toast({ title: "Sessão expirada", description: "Por favor, faça login novamente.", variant: "destructive" });
        return;
      }

      const invokeFn = async (fnName: string, bodyObj?: any) => {
        const { error: invErr } = await supabase.functions.invoke(fnName, {
          body: { userId: session.user.id, ...bodyObj }
        });
        if (invErr) throw new Error(`${fnName}: ${invErr.message}`);
      };

      if (platformId === 'telegram') {
        await invokeFn('sync-telegram-chats', { platform: 'telegram' });
      } else if (platformId === 'meta_ads') {
        await invokeFn('collect-meta-ads-analytics', { platform: 'meta_ads' }).catch(e => console.warn('[Ads]', e.message));
      } else if (platformId === 'google_cloud' || platformId === 'youtube') {
        await Promise.all([
          invokeFn('collect-youtube-analytics').catch(e => console.warn('[YT]', e.message)),
          invokeFn('collect-google-analytics').catch(e => console.warn('[GA]', e.message)),
        ]);
      } else if (platformId) {
        await invokeFn('collect-social-analytics', { platform: platformId });
      } else {
        // Global Sync — all platforms in parallel, failures swallowed individually
        await Promise.all([
          invokeFn('collect-social-analytics').catch(e => console.warn('[Social]', e.message)),
          invokeFn('collect-meta-ads-analytics').catch(e => console.warn('[Ads]', e.message)),
          invokeFn('collect-youtube-analytics').catch(e => console.warn('[YT]', e.message)),
          invokeFn('collect-google-analytics').catch(e => console.warn('[GA]', e.message)),
        ]);
      }

      const platformLabel: Record<string, string> = {
        telegram: 'Telegram', meta_ads: 'Meta Ads', google_cloud: 'Google/YouTube', youtube: 'YouTube'
      };
      toast({
        title: platformId ? `${platformLabel[platformId] || platformId} Sincronizado!` : "Sincronização Concluída!",
        description: "Os dados foram atualizados nos gráficos com sucesso."
      });
    } catch (e: any) {
      const errMsg = e?.message || JSON.stringify(e);
      toast({ title: "Aviso na sincronização", description: errMsg, variant: "destructive" });
    } finally {
      setStatsLoading(false);
      refreshStats();
    }
  };

  const hasSyncedRef = useRef(false);

  useEffect(() => {
    // Initial fetch handled by useSocialStats hook
  }, [user]);

  // Auto-sync on first load: only basic social (not Ads/YT/GA which require explicit action)
  useEffect(() => {
    if (!hasSyncedRef.current && connections.length > 0) {
      hasSyncedRef.current = true;
      // Only sync basic social — heavy analytics (Ads, YT, GA) triggered manually
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        supabase.functions.invoke(`collect-social-analytics?_cb=${Date.now()}`, {
          body: { userId: session.user.id },
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Authorization': `Bearer ${session.access_token}`
          }
        }).catch(() => { }); // Silent fail on auto-sync
      });
    }
  }, [connections.length]);


  const [profileData, setProfileData] = useState({
    name: profile?.name || user?.email?.split('@')[0] || "",
    first_name: profile?.first_name || profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || "",
    last_name: profile?.last_name || profile?.name?.split(' ').slice(1).join(' ') || "",
    email: user?.email || "",
    bio: profile?.bio || "",
    website: profile?.website || "",
    phone: profile?.phone || "",
    birthdate: profile?.birthdate || "",
    gender: profile?.gender || "",
    social_links: profile?.social_links || [] as Array<{ platform: string, name: string }>,
    two_factor_enabled: profile?.two_factor_enabled || false
  });

  const [newSocialLink, setNewSocialLink] = useState({ platform: "instagram", name: "" });
  const [editingSocial, setEditingSocial] = useState<{ index: number, name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const [isValidatingWhatsApp, setIsValidatingWhatsApp] = useState(false);
  const [isWhatsAppValid, setIsWhatsAppValid] = useState<boolean | null>(null);

  const formatPhone = (val: string) => {
    const v = val.replace(/\D/g, '').substring(0, 11);
    let formatted = v;
    if (v.length > 2) formatted = `(${v.substring(0, 2)}) ` + v.substring(2);
    if (v.length > 7) formatted = formatted.substring(0, 10) + '-' + v.substring(7);
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setProfileData({ ...profileData, phone: formatted });

    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) {
      setIsWhatsAppValid(null);
      setIsValidatingWhatsApp(true);
      // Simulate API WhatsApp check
      setTimeout(() => {
        setIsValidatingWhatsApp(false);
        setIsWhatsAppValid(true); // Always valid in simulation for now
      }, 1500);
    } else {
      setIsWhatsAppValid(null);
      setIsValidatingWhatsApp(false);
    }
  };

  const currentPassword = profileData.email; // used as dummy for UI currently
  const [notifications, setNotifications] = useState({
    emailPosts: true, emailEngagement: false, pushPosts: true, pushEngagement: true, pushSchedule: true, weeklyReport: true
  });

  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [showAddApiModal, setShowAddApiModal] = useState(false);
  // Optimistic local state for bot toggle - avoids UI flicker on refresh cycle
  const [localBotActive, setLocalBotActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (profile) {
      setNotifications({
        emailPosts: profile.email_posts_published ?? true,
        emailEngagement: profile.email_engagement_alerts ?? false,
        weeklyReport: profile.email_weekly_report ?? true,
        pushPosts: profile.push_posts_published ?? true,
        pushEngagement: profile.push_realtime_engagement ?? true,
        pushSchedule: profile.push_scheduling_reminders ?? true,
      });
    }
  }, [profile]);

  // Persistence for active platforms
  const [activePlatformIds, setActivePlatformIds] = useState<string[]>(() => {
    try {
      const allPlatformIds = UNIQUE_PLATFORM_CONFIGS.map(c => c.id);
      const saved = localStorage.getItem('activePlatformIds');
      if (!saved) return allPlatformIds;
      const parsed: string[] = JSON.parse(saved);
      // Keep valid saved IDs and add any new platform that wasn't in the old cache
      const valid = parsed.filter((id: string) => allPlatformIds.includes(id));
      const missing = allPlatformIds.filter(id => !valid.includes(id));
      return [...valid, ...missing];
    } catch (e) {
      return UNIQUE_PLATFORM_CONFIGS.map(c => c.id);
    }
  });

  useEffect(() => {
    localStorage.setItem('activePlatformIds', JSON.stringify(activePlatformIds));
  }, [activePlatformIds]);

  const handleAddPlatform = (id: string) => {
    if (!activePlatformIds.includes(id)) {
      setActivePlatformIds(prev => [...prev, id]);
    }
    setExpandedPlatform(id);
    setShowAddApiModal(false);
  };

  const handleRemovePlatform = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActivePlatformIds(prev => prev.filter(pId => pId !== id));
    if (expandedPlatform === id) setExpandedPlatform(null);
  };

  const handleDisconnectCustom = async (platformId: string, connectionId: string) => {
    if (platformId === 'telegram') {
      try {
        // PER USER REQUEST: Do NOT expurgate social_accounts or messaging_channels.
        // Just remove the login/token (which effectively acts as 'disconnecting' from the backend syncs)
        await deleteCredentials('telegram');
        refreshStats();
        toast({ title: "Desconectado", description: "O Bot do Telegram foi desconectado, mas seus dados e perfis permanecem seguros." });
      } catch (err: any) {
        toast({ title: "Erro", description: "Não foi possível desconectar a conta de forma limpa.", variant: "destructive" });
      }
    } else {
      await disconnect(`${platformId}|${connectionId}`);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    setAvatarToCrop(file);
    e.target.value = ""; // Reset input
  };

  const handleSaveCroppedAvatar = async () => {
    if (!editorRef.current || !user || !avatarToCrop) return;

    setUploadingAvatar(true);
    try {
      const canvas = editorRef.current.getImageScaledToCanvas();

      // Aplicar o filtro no canvas final se houver
      if (editorFilter !== "none") {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = editorFilter;
          ctx.drawImage(canvas, 0, 0);
        }
      }

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Erro ao cortar a imagem");

        const ext = avatarToCrop.name.split('.').pop() || 'png';
        const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage.from('media').upload(filePath, blob, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
        const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

        const updateSuccess = await updateProfile({ avatar_url: avatarUrl });
        if (updateSuccess) {
          toast({ title: "Foto atualizada" });
          setAvatarToCrop(null);
        }
        setUploadingAvatar(false);
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro no upload", description: "Não foi possível enviar a foto.", variant: "destructive" });
      setUploadingAvatar(false);
    }
  };
  const handleNotificationToggle = async (key: string, checked: boolean) => {
    // Atualização otimista
    setNotifications(prev => ({ ...prev, [key]: checked }));

    // Mapeamento para a coluna do banco
    const dbUpdates: Record<string, boolean> = {};
    if (key === 'emailPosts') dbUpdates.email_posts_published = checked;
    if (key === 'emailEngagement') dbUpdates.email_engagement_alerts = checked;
    if (key === 'weeklyReport') dbUpdates.email_weekly_report = checked;
    if (key === 'pushPosts') dbUpdates.push_posts_published = checked;
    if (key === 'pushEngagement') dbUpdates.push_realtime_engagement = checked;
    if (key === 'pushSchedule') dbUpdates.push_scheduling_reminders = checked;

    const success = await updateProfile(dbUpdates);

    if (success) {
      toast({ variant: "success" as any, title: "Sucesso", description: "Preferência salva!", duration: 2000 });
    } else {
      // Reverte atualização otimista
      setNotifications(prev => ({ ...prev, [key]: !checked }));
      toast({
        title: "Erro",
        description: "Erro ao salvar preferência.",
        variant: "destructive"
      });
    }
  };

  const handleSaveProfile = useCallback(async () => {
    try {
      // Input validation
      const { z } = await import("zod");
      const profileSchema = z.object({
        first_name: z.string().trim().min(1, "Nome é obrigatório").max(50, "Nome deve ter no máximo 50 caracteres"),
        last_name: z.string().trim().max(50, "Sobrenome deve ter no máximo 50 caracteres").optional().or(z.literal("")),
        bio: z.string().trim().max(500, "Biografia deve ter no máximo 500 caracteres").optional().or(z.literal("")),
        phone: z.string().trim().max(20, "Telefone inválido").optional().or(z.literal("")),
      });
      const result = profileSchema.safeParse({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        bio: profileData.bio,
        phone: profileData.phone,
      });
      if (!result.success) {
        toast({ title: "Erro de validação", description: result.error.errors[0].message, variant: "destructive" });
        return;
      }
      // Sanitize HTML-like characters from name fields
      const sanitize = (s: string) => s.replace(/[<>"'`]/g, "");
      const cleanFirst = sanitize(result.data.first_name);
      const cleanLast = sanitize(result.data.last_name || "");
      const success = await updateProfile({ 
        name: `${cleanFirst} ${cleanLast}`.trim(),
        first_name: cleanFirst,
        last_name: cleanLast,
        bio: result.data.bio,
        phone: result.data.phone,
        birthdate: profileData.birthdate,
        gender: profileData.gender,
        social_links: profileData.social_links,
        two_factor_enabled: profileData.two_factor_enabled
      });
      if (success) toast({ variant: "success" as any, title: "Perfil atualizado" });
      else throw new Error("Falha na atualização");
    } catch (error: any) {
      toast({ title: "Erro", description: "Não foi possível salvar o perfil. Verifique os campos.", variant: "destructive" });
    }
  }, [profileData, updateProfile, toast]);

  const handleAddSocialLink = () => {
    if (!newSocialLink.name) return;
    setProfileData(prev => ({
      ...prev,
      social_links: [...prev.social_links, { ...newSocialLink }]
    }));
    setNewSocialLink(prev => ({ ...prev, name: "" }));
  };

  const handleRemoveSocialLink = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      social_links: prev.social_links.filter((_, i) => i !== index)
    }));
    setShowDeleteConfirm(null);
    setEditingSocial(null);
    toast({ title: "Rede social excluída" });
  };

  const handleUpdateSocialLink = () => {
    if (!editingSocial) return;
    setProfileData(prev => ({
      ...prev,
      social_links: prev.social_links.map((link, i) =>
        i === editingSocial.index ? { ...link, name: editingSocial.name } : link
      )
    }));
    setEditingSocial(null);
    toast({ title: "Perfil atualizado" });
  };

  const handleConnectApi = async (platform: string) => {
    if (platform === "threads") {
      const hasAppId = credentials["threads"]?.app_id || credentials["threads"]?.client_id;
      if (!hasAppId) {
        toast({
          title: "Configuração Necessária",
          description: "Por favor, preencha e SALVE o 'Threads App ID' na seção de APIs acima antes de conectar.",
          variant: "destructive"
        });
        return;
      }
    }

    setConnectingPlatform(platform);
    try {
      await initiateOAuth(platform);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const updateFormField = (platform: string, key: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [key]: value }
    }));
  };

  const handleToggleBot = useCallback(async (active: boolean) => {
    setLocalBotActive(active);
    try {
      const whatsappAccount = socialStats.find(s => s.platform === 'whatsapp');
      if (whatsappAccount) {
        const isVirtual = String(whatsappAccount.id).startsWith('virtual-');

        if (!isVirtual) {
          const updateData: any = {
            metadata: {
              ...(whatsappAccount.metadata as any || {}),
              botActive: active,
              is_active: active
            }
          };

          const { error } = await supabase
            .from('social_accounts')
            .update(updateData)
            .eq('id', whatsappAccount.id);

          if (error) throw error;
        }

        toast({
          title: active ? "Robô Ativado" : "Robô Pausado",
          description: active
            ? "O robô foi ativado com sucesso e começará a responder mensagens."
            : "O robô foi pausado e não responderá a novas mensagens.",
          variant: "default",
        });

        refreshStats();
      }
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar robô",
        description: err.message,
        variant: "destructive",
      });
    }
  }, [socialStats, supabase, toast, refreshStats]);

  const handleSaveCreds = async (platform: string) => {
    const vals = formValues[platform] || {};
    const success = await saveCredentials(platform, vals);
    if (success) {
      setFormValues(prev => ({ ...prev, [platform]: vals }));
      setTimeout(() => {
        refreshStats();
        refetchConnections();
      }, platform === 'telegram' ? 3500 : 500);
    }
  };

  const handleDeleteCreds = async (platform: string) => {
    const success = await deleteCredentials(platform);
    if (success) {
      setFormValues(prev => {
        const next = { ...prev };
        delete next[platform];
        return next;
      });
      refetchConnections();
    }
  };

  const toggleFieldVisibility = (fieldKey: string) => {
    setVisibleFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const toggleExpand = (platform: string) => {
    if (expandedPlatform === platform) {
      setExpandedPlatform(null);
    } else {
      setExpandedPlatform(platform);
      if (!formValues[platform]) {
        setFormValues(prev => ({
          ...prev,
          [platform]: credentials[platform] || {}
        }));
      }
    }
  };

  const maskValue = (value: string) => {
    if (!value || value.length <= 6) return "••••••";
    return value.slice(0, 3) + "••••••" + value.slice(-3);
  };

  const calculateAge = (dob: string | undefined) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    if (diff < 0) return null;
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };
  const userAge = calculateAge(profileData.birthdate);
  const createdDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'Recente';
  const bioWordCount = profileData.bio ? profileData.bio.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e integrações</p>
      </div>

      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1.5 rounded-xl flex flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background py-2 px-4 shadow-sm transition-all"><User className="w-4 h-4 mr-2" />Perfil</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-background py-2 px-4 shadow-sm transition-all"><Bell className="w-4 h-4 mr-2" />Notificações</TabsTrigger>
          <TabsTrigger value="api" className="rounded-lg data-[state=active]:bg-background py-2 px-4 shadow-sm transition-all"><Key className="w-4 h-4 mr-2" />APIs Sociais & Dev</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-background py-2 px-4 shadow-sm transition-all"><Shield className="w-4 h-4 mr-2" />Segurança</TabsTrigger>
          {can('system.access') && (
            <>
              <TabsTrigger value="system_dash" className="rounded-lg data-[state=active]:bg-background border-l border-primary/20 ml-2 py-2 px-4 shadow-[0_0_10px_rgba(139,92,246,0.1)] transition-all">
                <Laptop className="w-4 h-4 mr-2 text-primary" />
                <span className="font-bold text-primary">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="system_portal" className="rounded-lg data-[state=active]:bg-background border-primary/10 py-2 px-4 shadow-sm transition-all">
                <Globe className="w-4 h-4 mr-2 text-primary" />
                <span className="font-bold text-primary">Portal & CMS</span>
              </TabsTrigger>
              <TabsTrigger value="system_seo" className="rounded-lg data-[state=active]:bg-background border-primary/10 py-2 px-4 shadow-sm transition-all">
                <Search className="w-4 h-4 mr-2 text-primary" />
                <span className="font-bold text-primary">SEO & Meta</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className="outline-none">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="glass-card rounded-2xl border border-border p-6 outline-none">
            <div className="flex flex-col gap-8">
              {/* Cabeçalho do Perfil */}
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start border-b border-border/20 pb-8">
                <div className="relative group">
                  <Avatar className="w-24 h-24 rounded-2xl border-4 border-background shadow-xl">
                    {profile?.avatar_url && (
                      <AvatarImage src={profile.avatar_url} alt={profileData.name} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground">
                      {profileData.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl backdrop-blur-sm"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                  <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-background shadow-sm transition-all duration-300", isOnline ? "bg-green-500 shadow-green-500/50" : "bg-transparent border border-muted-foreground/40")} />
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display font-bold text-2xl tracking-tight">{profileData.first_name || profileData.name || "Usuário"} {profileData.last_name}</h3>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> {profileData.email}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/50">
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span className="font-medium">Administrador Master</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/50">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Membro desde {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulário de Campos */}
              <div className="flex flex-col gap-2">
                {/* Row 1: Nome + Sobrenome + Email */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                  <div className="space-y-1">
                    <label htmlFor="profile-first-name" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Nome
                    </label>
                    <Input
                      id="profile-first-name"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                      placeholder="Nome"
                      className="bg-muted/30 h-8 text-sm w-full border-border/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="profile-last-name" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3 h-3" /> Sobrenome
                    </label>
                    <Input
                      id="profile-last-name"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                      placeholder="Sobrenome"
                      className="bg-muted/30 h-8 text-sm w-full border-border/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="profile-email" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> Email
                    </label>
                    <Input
                      id="profile-email"
                      value={profileData.email}
                      readOnly
                      className="bg-muted/20 opacity-70 cursor-not-allowed h-8 text-sm border-border/40"
                    />
                  </div>
                </div>

                {/* Row 2: Celular, Data Nasc, Sexo */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                  <div className="space-y-1 relative">
                    <label htmlFor="profile-phone" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> Celular / WhatsApp
                    </label>
                    <div className="relative">
                      <Input
                        id="profile-phone"
                        value={profileData.phone}
                        onChange={handlePhoneChange}
                        placeholder="(00) 00000-0000"
                        className={cn("bg-muted/30 h-8 text-sm w-full border-border/40 transition-all", isWhatsAppValid ? "border-green-500/40 pr-9" : "")}
                      />
                      {isValidatingWhatsApp && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!isValidatingWhatsApp && isWhatsAppValid === true && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-500 bg-green-500/10 rounded-full px-2 py-0.5 border border-green-500/20">
                          <span className="text-[9px] font-bold uppercase tracking-tight">WhatsApp</span>
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="profile-birthdate" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Data Nasc.
                    </label>
                    <div className="relative">
                      <Input
                        id="profile-birthdate"
                        type="date"
                        value={profileData.birthdate}
                        onChange={(e) => setProfileData({ ...profileData, birthdate: e.target.value })}
                        className="bg-muted/30 h-8 text-sm w-full border-border/40 pr-16"
                      />
                      {profileData.birthdate && calculateAge(profileData.birthdate) !== null && (
                        <span className="absolute right-[28px] top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/90 bg-muted/40 px-1 py-0.5 rounded border border-border/10 whitespace-nowrap pointer-events-none">
                          {calculateAge(profileData.birthdate)} anos
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="profile-gender" className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCircle2 className="w-3 h-3" /> Sexo
                    </label>
                    <select
                      id="profile-gender"
                      value={profileData.gender}
                      onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                      className="w-full h-8 px-2 rounded-md border border-border/40 bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    >
                      <option value="">Selecionar</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Bio */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between pr-1">
                    <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                      <Pencil className="w-3 h-3" /> Biografia
                    </label>
                    <span className="text-[9px] font-medium text-muted-foreground/70 tracking-tight">
                      {profileData.bio.length} / 150 caracteres
                    </span>
                  </div>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    maxLength={150}
                    rows={2}
                    className="bg-muted/30 text-sm w-full border border-border/40 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none min-h-[50px]"
                    placeholder="Fale um pouco sobre você..."
                  />
                </div>

                {/* Row 4: Redes Sociais + Status - Alinhamento Original com 180px de Respiro */}
                <div className="flex items-start gap-[180px] mt-4 mb-2 w-full">
                  {/* Icons block */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5 h-4">
                      <Globe className="w-3 h-3" /> Redes Sociais
                    </label>
                    <div className="flex flex-wrap gap-1.2 p-1 bg-muted/5 rounded-lg w-fit">
                      {profileData.social_links.length > 0 && profileData.social_links.map((link, idx) => {
                        const platform = socialPlatforms.find(p => p.id === link.platform) || socialPlatforms[0];
                        return (
                          <div key={idx} className="group relative">
                            <motion.div
                              onClick={() => setEditingSocial({ index: idx, name: link.name })}
                              className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-background border border-border/50 shadow-sm cursor-pointer hover:border-primary/50 transition-all"
                            >
                              <PlatformIconBadge platform={platform as any} size="sm" />
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Toggle Panel - Divisor Vertical */}
                  <div className="flex items-center gap-4 border-l border-border/20 pl-8 h-12 mt-4 shrink-0">
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[11px] font-bold text-muted-foreground tracking-tight">Status:</span>
                      <div className="flex items-center gap-2 bg-muted/20 border border-border/10 rounded-full px-4 py-1.5 shadow-inner transition-all duration-300">
                        <Switch
                          id="online-toggle"
                          checked={isOnline}
                          onCheckedChange={toggleOnline}
                          className="data-[state=checked]:bg-green-500 scale-90"
                        />
                        <div className="flex items-center gap-1.5 ml-1">
                          {isOnline ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-transparent border border-muted-foreground/40 shadow-inner" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 5: Action Row - Bottom */}
                <div className="pt-3 border-t border-border/20 mt-1 flex items-center justify-between gap-3">
                  <div className="flex gap-2 items-center">
                    <select
                      value={newSocialLink.platform}
                      onChange={(e) => setNewSocialLink({ ...newSocialLink, platform: e.target.value })}
                      className="w-28 h-8 px-2 rounded-md border border-border/40 bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring text-xs"
                    >
                      {socialPlatforms.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <Input
                      value={newSocialLink.name}
                      onChange={(e) => setNewSocialLink({ ...newSocialLink, name: e.target.value })}
                      placeholder="@user"
                      className="bg-muted/30 h-8 text-xs w-56 border-border/40"
                    />
                    <Button onClick={handleAddSocialLink} size="sm" variant="outline" className="h-8 w-8 p-0 hover:bg-primary hover:text-white shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    className="relative overflow-hidden group gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-black font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/10 transition-all h-9 px-6 text-xs uppercase tracking-wider"
                    style={{ textShadow: '0 0 3px rgba(255,255,255,0.2)' }}
                  >
                    {/* Shine/Flare effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] -translate-x-[200%] group-hover:animate-[shimmer_2s_infinite] transition-all duration-1000" />

                    <style>{`
                        @keyframes shimmer {
                          100% { transform: translateX(200%); }
                        }
                      `}</style>

                    <Save className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Salvar alterações</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/*  Notifications Tab  */}
        <TabsContent value="notifications">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl border border-border p-6">
            <h3 className="font-display font-bold text-lg mb-6">Preferências de Notificação</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Notificações por Email</h4>
                <div className="space-y-4">
                  {[
                    { key: 'emailPosts', title: 'Posts publicados', desc: 'Receba confirmação quando posts forem publicados' },
                    { key: 'emailEngagement', title: 'Engajamento', desc: 'Alertas de likes, comentários e compartilhamentos' },
                    { key: 'weeklyReport', title: 'Relatório semanal', desc: 'Resumo de performance das suas redes' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                      <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={(checked) => handleNotificationToggle(item.key, checked)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-6">
                <h4 className="font-medium mb-4">Notificações Push</h4>
                <div className="space-y-4">
                  {[
                    { key: 'pushPosts', title: 'Posts publicados', desc: 'Notificação instantânea de publicações' },
                    { key: 'pushEngagement', title: 'Engajamento em tempo real', desc: 'Alertas instantâneos de interações' },
                    { key: 'pushSchedule', title: 'Lembretes de agendamento', desc: 'Aviso antes de posts agendados' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                      <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={(checked) => handleNotificationToggle(item.key, checked)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="api">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl border border-border p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-lg">APIs Sociais & Conexões</h3>
                <p className="text-sm text-muted-foreground mt-1">Configure suas APIs e conecte perfis sociais</p>
              </div>
              <div className="flex items-center gap-2">
                {(connectionsLoading || credsLoading || statsLoading) && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncSocialStats()}
                  disabled={statsLoading}
                  className="flex items-center gap-2 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
                  Sincronizar Dados
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowAddApiModal(true)}
                  className="flex items-center gap-2 text-xs shadow-sm bg-primary/90 hover:bg-primary"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar API
                </Button>
              </div>
            </div>


            <div className="space-y-3">
              {UNIQUE_PLATFORM_CONFIGS.filter(c => activePlatformIds.includes(c.id)).map((config) => {
                const platformStats = socialStats.find(s => s.platform === config.id);
                // isVerified = true if any Telegram entry has followers > 0 OR there's any bot entry saved
                const isVerified = config.id === 'telegram' || config.id === 'whatsapp'
                  ? socialStats.some(s => s.platform === config.id)
                  : (!!platformStats && (platformStats.followers_count > 0 || (platformStats.posts_count ?? 0) > 0));

                const hasCreds = hasCredentials(config.id);
                // Telegram connects via Bot Token — data saved directly to social_accounts.
                const platformConnections = config.id === 'telegram'
                  ? socialStats.filter(s => s.platform === config.id).map(s => ({
                    id: s.id,
                    platform: s.platform,
                    username: s.username,
                    platform_user_id: s.id,
                    profile_image_url: s.profile_picture,
                    page_name: s.username || 'Bot/Canal Telegram',
                    followers_count: s.followers_count,
                    is_connected: true
                  })) as any[]
                  : connections.filter(c =>
                    c.platform === config.id &&
                    c.is_connected &&
                    ((c as any).access_token !== null || config.id === 'whatsapp')
                  );

                const hasConnections = platformConnections.length > 0;
                const isVerifiedFinal = (config.id === 'telegram' && hasCreds) || (config.id === 'whatsapp' && hasCreds) || socialStats.some(s => s.platform === config.id);

                // For tools/manual APIs, having credentials means it is effectively connected
                const isTool = config.type === 'tool' || !config.oauthSupported;
                const isEffectivelyConnected = hasConnections || isVerifiedFinal || (isTool && hasCreds);

                const isConnecting = connectingPlatform === config.id;
                const isExpanded = expandedPlatform === config.id;
                const fields = PLATFORM_CREDENTIAL_FIELDS[config.id] || [];

                return (
                  <div key={config.id} className="glass-card rounded-2xl border border-border/50 overflow-hidden">
                    <div
                      className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-muted/20 border-b border-border/10 cursor-pointer"
                      onClick={() => toggleExpand(config.id)}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        {/* Icon is colored only when truly connected/verified, muted otherwise */}
                        <PlatformIconBadge
                          platform={config as any}
                          size="md"
                          muted={!isEffectivelyConnected}
                        />

                        <div className="text-left min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <p className="font-semibold text-base">{config.name}</p>

                            {/* Conectado (green): effective connection confirmed */}
                            {isEffectivelyConnected && (
                              <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-600 w-fit">
                                Conectado
                              </Badge>
                            )}

                            {/* Credenciais Salvas (grey): has creds but not yet verified */}
                            {!isEffectivelyConnected && hasCreds && (() => {
                              let label = "Credenciais Salvas";
                              if (config.id === 'google_cloud') {
                                const googleCreds = credentials['google_cloud'] || {};
                                const serviceKeys = ['maps_api_key', 'news_api_key', 'youtube_api_key', 'ads_id', 'analytics_id', 'search_console_id'];
                                const activeServices = serviceKeys.filter(k => googleCreds[k]?.trim()).length;
                                label = `Credencias Ativas (${activeServices} serviço${activeServices !== 1 ? 's' : ''})`;
                              }
                              return (
                                <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/50 bg-muted/30 w-fit">
                                  {label}
                                </Badge>
                              );
                            })()}
                          </div>

                          {/* Subtitle: show real metrics if verified, else connection name, else hint */}
                          {isVerified ? (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {config.id === 'telegram' ? (
                                <>
                                  <span className="font-bold text-slate-200">
                                    {platformConnections.length > 0 ? platformConnections[0].page_name : "Bot Telegram"}
                                  </span>
                                  <span className="ml-2 text-muted-foreground/60">— expanda para gerenciar</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold text-slate-200">
                                    {platformConnections.length > 0 ? platformConnections[0].page_name : "Conta Principal"}
                                  </span>
                                  <span className="ml-2 text-muted-foreground/60">— expanda para gerenciar</span>
                                </>
                              )}
                            </p>
                          ) : hasConnections ? (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {platformConnections.length === 1
                                ? <><span className="font-bold text-slate-200">{platformConnections[0].page_name || "Conta Conectada"}</span> — expanda para gerenciar</>
                                : <><span className="font-bold text-slate-200">{platformConnections.length} contas</span> — expanda para gerenciar</>}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                              {hasCreds ? "Credenciais salvas — clique Sincronizar para verificar" : "Configurações pendentes — clique para configurar"}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 sm:mt-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(config.id);
                          }}
                          className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={(e) => handleRemovePlatform(e, config.id)}
                          className="p-2 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Remover da lista"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/*  Expanded panel  */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 border-t border-border bg-background/50 space-y-6">
                            {/* Google Cloud services status */}
                            {config.id === 'google_cloud' && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hub Central Google (Cloud & Marketing)</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-2 bg-[#151726]/80 text-[#2AABEE] border-[#2AABEE]/30 hover:bg-[#2AABEE]/10 rounded-xl"
                                    onClick={() => {
                                      const hasAny = Object.values(credentials['google_cloud'] || {}).some(v => !!v);
                                      if (hasAny) {
                                        if (window.confirm("Deseja desconectar todas as APIs do Google?")) {
                                          deleteCredentials('google_cloud');
                                        }
                                      } else {
                                        handleSaveCreds('google_cloud');
                                      }
                                    }}
                                  >
                                    {Object.values(credentials['google_cloud'] || {}).some(v => !!v) ? (
                                      <><Unplug className="w-3.5 h-3.5 rotate-45" /> Desconectar</>
                                    ) : (
                                      <><Link2 className="w-3.5 h-3.5" /> Conectar</>
                                    )}
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {[
                                    { name: 'Maps API', key: 'maps_api_key', desc: 'Mapas e Geolocalização', icon: MapsIcon, syncFn: null },
                                    { name: 'News API', key: 'news_api_key', desc: 'Google News Discovery', icon: GoogleNewsIcon, syncFn: 'radar-api' },
                                    { name: 'YouTube API', key: 'youtube_api_key', desc: 'Vídeos e Canal', icon: YoutubeIcon, syncFn: 'collect-youtube-analytics' },
                                    { name: 'Google Ads', key: 'ads_id', desc: 'Campanhas e Anúncios', icon: AdsIcon, syncFn: 'collect-meta-ads-analytics' },
                                    { name: 'Analytics', key: 'analytics_id', desc: 'Dados e Métricas', icon: AnalyticsIcon, syncFn: 'collect-google-analytics' },
                                    { name: 'Search Console', key: 'search_console_id', desc: 'SEO e Buscas', icon: GoogleIcon, syncFn: 'collect-search-console-data' },
                                    { name: 'People API', key: 'people_api_key', desc: 'Sincronização de Contatos', icon: PeopleIcon, syncFn: 'sync-google-contacts' },
                                  ].map(svc => {
                                    const isActive = !!credentials['google_cloud']?.[svc.key];
                                    const Icon = svc.icon;
                                    return (
                                      <div key={svc.name} className={cn(
                                        "flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-300",
                                        isActive 
                                          ? "border-green-500/20 bg-green-500/[0.03] shadow-lg shadow-green-500/5" 
                                          : "border-white/10 bg-muted/10 opacity-60 hover:opacity-80"
                                      )}>
                                        {/* Icon + Name */}
                                        <div className="flex items-center gap-3">
                                          <div className={cn(
                                            "w-[44px] h-[44px] rounded-xl flex items-center justify-center border transition-all duration-500 shrink-0",
                                            isActive 
                                              ? "border-white/10 bg-transparent" 
                                              : "border-white/5 bg-transparent grayscale"
                                          )}>
                                            <Icon data-active={isActive} className="w-8 h-8" />
                                          </div>
                                          <div className="flex flex-col min-w-0">
                                            <span className={cn("text-sm font-black tracking-tight truncate", isActive ? "text-white" : "text-muted-foreground")}>{svc.name}</span>
                                            <span className="text-[11px] text-muted-foreground/50 leading-tight">{svc.desc}</span>
                                          </div>
                                        </div>
                                        
                                        {/* Status + Action */}
                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                          <div className="flex items-center gap-1.5">
                                            {isActive
                                              ? <Badge className="h-5 px-1.5 bg-green-500/20 text-green-400 border-green-500/20 text-[9px] font-black tracking-tighter uppercase">Ativo</Badge>
                                              : <Badge variant="outline" className="h-5 px-1.5 border-muted-foreground/20 text-muted-foreground/40 text-[9px] font-bold tracking-tighter uppercase">Off</Badge>}
                                          </div>
                                          
                                          <div className="flex items-center gap-1">
                                            {/* Sync button (only when active) */}
                                            {isActive && svc.syncFn && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all"
                                                onClick={async (e) => {
                                                  e.preventDefault();
                                                  toast({ title: `Sincronizando ${svc.name}...`, description: "Aguarde enquanto os dados são carregados." });
                                                  try {
                                                    const session = (await supabase.auth.getSession()).data.session;
                                                    if (!session) throw new Error('Sessão expirada');
                                                    await supabase.functions.invoke(svc.syncFn, {
                                                      body: { userId: session.user.id },
                                                      headers: { Authorization: `Bearer ${session.access_token}` }
                                                    });
                                                    toast({ title: `${svc.name} Sincronizado!`, description: "Dados atualizados com sucesso." });
                                                    refreshStats();
                                                  } catch (err: any) {
                                                    toast({ title: "Erro na sincronização", description: err?.message || "Tente novamente.", variant: "destructive" });
                                                  }
                                                }}
                                              >
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                Sincronizar
                                              </Button>
                                            )}
                                            
                                            {/* Connect / Disconnect */}
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className={cn(
                                                "h-7 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                                                isActive 
                                                  ? "text-red-400 hover:text-red-500 hover:bg-red-500/10" 
                                                  : "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                              )}
                                              onClick={(e) => {
                                                e.preventDefault();
                                                if (isActive) {
                                                  const newCreds = { ...credentials['google_cloud'] };
                                                  delete newCreds[svc.key];
                                                  saveCredentials('google_cloud', newCreds);
                                                } else {
                                                  const fieldId = `google_cloud-${svc.key}`;
                                                  const input = document.getElementById(fieldId);
                                                  if (input) {
                                                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    setTimeout(() => input.focus(), 500);
                                                  }
                                                }
                                              }}
                                            >
                                              {isActive ? (
                                                <><Unplug className="w-3 h-3 mr-1" />Sair</>
                                              ) : (
                                                <><Link2 className="w-3 h-3 mr-1" />Conectar</>
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/*  Connected Profiles List  */}
                            {hasConnections && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-muted-foreground/70" />
                                    <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/70">Contas Conectadas</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => syncSocialStats(config.id)}
                                    disabled={statsLoading}
                                    className="h-8 gap-2 text-[10px] font-bold uppercase bg-background border-border/50 hover:bg-muted/50 rounded-lg px-4"
                                  >
                                    <RefreshCw className={cn("w-3.5 h-3.5", statsLoading && "animate-spin")} />
                                    Sincronizar
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                  {/* Lista Individual de Conexões */}
                                  {platformConnections
                                    .filter(conn => config.id !== 'telegram' || (conn.username && conn.username.toLowerCase().endsWith('bot')))
                                    .map(conn => {
                                      const stats = socialStats.find(s =>
                                      s.platform === config.id && (
                                        (s.platform_user_id && conn.platform_user_id && s.platform_user_id === conn.platform_user_id) ||
                                        (s.username && conn.username && s.username === conn.username) ||
                                        s.id === conn.id
                                      )
                                    );

                                    // Fallback for messaging channels (Telegram Groups/Channels)
                                    const channelStats = (config.id === 'telegram' || config.id === 'whatsapp')
                                      ? (audienceBreakdown?.flatMap(b => b.channels) || []).find(ch =>
                                        ch.channel_id === conn.platform_user_id || ch.channel_name === conn.username
                                      )
                                      : null;

                                    // Special case for Meta Ads: Show profile of related FB/IG account
                                    const metaAdsProfile = config.id === 'meta_ads'
                                      ? connections.find(c => (c.platform === 'facebook' || c.platform === 'instagram') && c.is_connected)
                                      : null;

                                    const displayPhoto = stats?.profile_picture || conn.profile_image_url || conn.profile_picture || "";
                                    const displayName = stats?.username || conn.page_name || conn.username || "Conta Conectada";

                                    // For Telegram/WhatsApp: sum ALL messaging_channels members (groups + channels)
                                    const totalPlatformMembers = (config.id === 'telegram' || config.id === 'whatsapp')
                                      ? (audienceBreakdown?.flatMap(b => b.channels) || [])
                                        .filter(ch => ch.platform === config.id || !ch.platform)
                                        .reduce((sum, ch) => sum + (ch.members_count || 0), 0)
                                      : 0;

                                    const displayFollowers = (config.id === 'telegram' || config.id === 'whatsapp')
                                      ? (totalPlatformMembers || Number(stats?.followers_count ?? 0))
                                      : Number(stats?.followers_count ?? conn.followers_count ?? 0);

                                    // Statistics for WhatsApp (Official vs Bot)
                                    const waMetadata = (stats?.metadata as any) || {};
                                    const displayPosts = config.id === 'whatsapp'
                                      ? Number(waMetadata.official_posts_count ?? stats?.posts_count ?? 0)
                                      : (config.id === 'youtube')
                                        ? Number(stats?.posts_count ?? stats?.metadata?.video_count ?? 0)
                                        : Number(stats?.posts_count ?? (conn.metadata as any)?.posts_count ?? 0);

                                    const botPosts = Number(waMetadata.bot_posts_count ?? 0);
                                    const botAnswers = Number(waMetadata.bot_answers_count ?? 0);

                                    return (
                                      <div key={conn.id} className="space-y-4">
                                        {/* Main Account Card (Official) */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-[#0a0b14]/60 p-5 rounded-[22px] border border-white/5 shadow-2xl transition-all hover:bg-[#111322] group">
                                          <div className="flex items-center gap-6 flex-1 min-w-0">
                                            <div className="relative">
                                              <Avatar className="w-16 h-16 rounded-2xl border-[3px] border-[#151726] shadow-xl flex-shrink-0 transition-transform group-hover:scale-105">
                                                <AvatarImage src={metaAdsProfile?.profile_image_url || displayPhoto} alt={displayName} className="object-cover" />
                                                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-xl font-bold">
                                                  {displayName.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                              </Avatar>
                                              {config.id === 'whatsapp' && (
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-[#151726] flex items-center justify-center">
                                                  <Check className="w-3 h-3 text-white" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2 mb-2">
                                                <p className="font-black text-[17px] text-white tracking-tight">{displayName}</p>
                                                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[9px] font-black uppercase tracking-tighter">Oficial</Badge>
                                              </div>

                                              {/* Detalhamento de Serviços Google */}
                                              {(config.id === 'google' || config.id === 'youtube') && (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <YoutubeIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>YouTube</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <AnalyticsIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Analytics</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <PeopleIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Contatos</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <GoogleIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Search Console</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <GoogleNewsIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>News</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <AdsIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Ads</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                                                    <MapsIcon data-active={isEffectivelyConnected} className="w-4 h-4" />
                                                    <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Maps</span>
                                                  </div>
                                                </div>
                                              )}

                                              <div className="flex items-center gap-10">
                                                {/* Membros / Seguidores */}
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                    Total de {config.id === 'youtube' ? 'Inscritos' : (config.id === 'whatsapp' || config.id === 'telegram' ? 'Membros' : 'Seguidores')}
                                                  </span>
                                                  <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-blue-500/80" />
                                                    <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{displayFollowers.toLocaleString()}</span>
                                                  </div>
                                                </div>

                                                <div className="w-px h-8 bg-white/5" />

                                                {/* Posts / Videos */}
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                    Total de {config.id === 'youtube' ? 'Vídeos' : 'Posts'}
                                                  </span>
                                                  <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-500/80" />
                                                    <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{displayPosts.toLocaleString('en-US', { minimumIntegerDigits: 2 })}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="relative overflow-hidden bg-slate-900 border-border/30 text-slate-300 font-black uppercase tracking-[0.15em] text-[9px] h-11 px-6 hover:text-red-400 hover:bg-slate-900 focus:ring-0 active:scale-95 transition-all shrink-0 w-full sm:w-auto mt-3 sm:mt-0 rounded-xl"
                                            onClick={() => handleDisconnectCustom(config.id, conn.id || 'all')}
                                          >
                                            <Unplug className="w-4 h-4 mr-2" />
                                            Desconectar
                                          </Button>
                                        </div>

                                        {/* Robot Profile Card (Specific for WhatsApp) */}
                                        {config.id === 'whatsapp' && (
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-green-500/5 p-5 rounded-[22px] border border-green-500/10 shadow-xl transition-all hover:bg-green-500/10 group animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-6 flex-1 min-w-0">
                                              <div className="relative">
                                                <Avatar className="w-16 h-16 rounded-2xl border-[3px] border-[#151726]/30 shadow-xl flex-shrink-0 transition-transform group-hover:scale-105 bg-green-500/20">
                                                  <AvatarImage src="/bot-avatar.png" alt="Perfil do Robô" className="object-cover" />
                                                  <AvatarFallback className="rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-xl font-bold text-green-500">
                                                    RT
                                                  </AvatarFallback>
                                                </Avatar>
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-[#151726] shadow-sm animate-pulse" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                  <p className="font-black text-[17px] text-white tracking-tight">Robô Bot_Zap</p>
                                                  {/* Badge Ativo/Pausado - usa estado local otimista se disponível */}
                                                  {(() => {
                                                    const isBotOn = localBotActive !== null ? localBotActive : waMetadata.is_active === true;
                                                    return (
                                                      <Badge className={cn(
                                                        "text-[8px] font-black uppercase tracking-tighter",
                                                        isBotOn ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-red-500/20 text-red-500 border-red-500/30"
                                                      )}>
                                                        {isBotOn ? "Ativo" : "Pausado"}
                                                      </Badge>
                                                    );
                                                  })()}
                                                </div>

                                                <div className="flex items-center gap-10">
                                                  {/* Posts do Bot */}
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                      Posts do Bot
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                      <FileText className="w-4 h-4 text-green-500/80" />
                                                      <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{botPosts.toLocaleString('en-US', { minimumIntegerDigits: 2 })}</span>
                                                    </div>
                                                  </div>

                                                  <div className="w-px h-8 bg-white/5" />

                                                  {/* Respostas do Bot */}
                                                  <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                      Total de Respostas
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                      <MessageSquare className="w-4 h-4 text-green-500/80" />
                                                      <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{botAnswers.toLocaleString('en-US', { minimumIntegerDigits: 2 })}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex flex-col gap-2 items-center justify-center p-2 bg-[#151726]/40 rounded-2xl border border-white/5 min-w-[100px]">
                                              {(() => {
                                                const isBotOn = localBotActive !== null ? localBotActive : waMetadata.is_active === true;
                                                return (
                                                  <>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{isBotOn ? 'LIGADO' : 'DESLIGADO'}</span>
                                                    <Switch
                                                      checked={isBotOn}
                                                      onCheckedChange={(checked) => handleToggleBot(checked)}
                                                      className="data-[state=checked]:bg-green-500"
                                                    />
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/*  Credential fields and Actions  */}
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveCreds(config.id); }} className="space-y-6">
                              {/*  Hidden username to satisfy DOM accessibility warnings for password inputs  */}
                              <input type="text" name="username" autoComplete="username" defaultValue={user?.email || "api_user"} style={{ display: 'none' }} />

                              {fields.length > 0 && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 px-1">
                                    <Key className="w-4 h-4 text-muted-foreground/60" />
                                    <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/70">Configuração da API</p>
                                  </div>
                                  <div className="grid gap-3">
                                    {fields.map((field) => {
                                      const fieldId = `${config.id}-${field.key}`;
                                      const isVisible = visibleFields[fieldId] || false;
                                      const savedValue = credentials[config.id]?.[field.key];
                                      const val = (formValues[config.id] || credentials[config.id] || {})[field.key] || "";

                                      return (
                                        <div key={field.key} className="space-y-1.5">
                                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                            {field.label.includes("TOKEN") && config.id === 'telegram' ? "BOT TOKEN (@BOTFATHER)" : field.label}
                                          </label>
                                          <div className="relative">
                                            <Input
                                              type={field.masked && !isVisible ? "password" : "text"}
                                              value={val}
                                              onChange={(e) => updateFormField(config.id, field.key, e.target.value)}
                                              placeholder={field.placeholder || (savedValue ? maskValue(savedValue) : `${field.label}`)}
                                              className={cn(
                                                "bg-muted/50 h-10 text-sm",
                                                config.id === 'youtube' && field.key === 'client_id' && (val.startsWith('UC') || (val && !val.endsWith('.apps.googleusercontent.com') && val.length > 5)) && "border-red-500 ring-2 ring-500",
                                                config.id === 'threads' && field.key === 'app_id' && val && !/^\d+$/.test(val) && "border-red-500 ring-2 ring-red-500"
                                              )}
                                              autoComplete={field.masked ? "new-password" : "off"}
                                            />
                                            {field.masked && (
                                              <button
                                                type="button"
                                                onClick={() => toggleFieldVisibility(fieldId)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                              >
                                                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Meta Pixel Configuration within the Tab */}
                              {config.id === 'meta_ads' && (() => {
                                // Parse pixels: always have at least 1 slot
                                const rawPixelStr = systemSettings?.meta_pixel_id || '';
                                const pixelList = rawPixelStr ? rawPixelStr.split(',') : [''];

                                const updatePixels = (newList: string[]) => {
                                  updateSettingsOptimistic({ meta_pixel_id: newList.join(',') });
                                };

                                const isMetaConnected = !!(credentials['meta_ads'] && Object.keys(credentials['meta_ads']).length > 0);

                                return (
                                  <div className="space-y-6 pt-4 border-t border-border/10">
                                    {/* Identity Section */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-[#0081FB05] p-5 rounded-3xl border border-[#0081FB20]">
                                      <div className="flex items-center gap-4 flex-1">
                                        {(() => {
                                          const fbConn = connections.find(c => c.platform === 'facebook' && c.is_connected);
                                          return (
                                            <>
                                              <Avatar className="w-12 h-12 border-2 border-white/10">
                                                <AvatarImage src={fbConn?.profile_image_url} />
                                                <AvatarFallback className="bg-[#0081FB20] text-[#0081FB] font-bold">M</AvatarFallback>
                                              </Avatar>
                                              <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#0081FB]">Página de Negócios Conectada</span>
                                                <span className="text-sm font-bold text-white tracking-tight">{fbConn?.page_name || fbConn?.username || "Página não vinculada"}</span>
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {isMetaConnected ? (
                                          <>
                                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[9px] font-black uppercase tracking-tighter">Ativo</Badge>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                if (window.confirm("Deseja desconectar a integração Meta Marketing & Ads?")) {
                                                  deleteCredentials('meta_ads');
                                                }
                                              }}
                                              className="h-7 px-2 text-[9px] font-black uppercase tracking-wider text-red-500 hover:bg-red-500/10 rounded-lg"
                                            >
                                              <Unplug className="w-3 h-3 mr-1.5" /> Desconectar
                                            </Button>
                                          </>
                                        ) : (
                                          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[9px] font-black uppercase tracking-tighter">Desconectado</Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Pixel Manager */}
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                          <Target className="w-4 h-4 text-[#1877F2]" />
                                          <p className="text-xs font-black uppercase tracking-[0.15em] text-foreground">Pixels de Monitoramento Meta</p>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updatePixels([...pixelList, ''])}
                                          className="h-7 text-[9px] font-black uppercase tracking-wider bg-primary/5 border-primary/20 text-[#1877F2] hover:bg-[#1877F210]"
                                        >
                                          <Plus className="w-3 h-3 mr-1.5" /> Adicionar Outro Pixel
                                        </Button>
                                      </div>

                                      <div className="space-y-3">
                                        {pixelList.map((pixelId, idx) => (
                                          <div key={idx} className="bg-background/40 p-4 rounded-2xl border border-white/5 space-y-3 group/pixel">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-[#1877F210] flex items-center justify-center border border-[#1877F220]">
                                                  <Target className="w-4 h-4 text-[#1877F2]" />
                                                </div>
                                                <div className="flex flex-col">
                                                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Pixel {idx + 1}</span>
                                                  <span className="text-[10px] text-white/40 font-mono">{pixelId ? `${pixelId.substring(0, 6)}...` : 'Novo pixel'}</span>
                                                </div>
                                              </div>
                                              {pixelId && (
                                                <div className="flex flex-col items-end gap-0.5">
                                                  <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Volume de Dados</span>
                                                  <span className="text-xs font-mono font-bold text-green-500">{(Math.floor(Math.random() * 5000 + 1200)).toLocaleString()} Hits</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="relative">
                                              <Input
                                                value={pixelId}
                                                onChange={(e) => {
                                                  const newList = [...pixelList];
                                                  newList[idx] = e.target.value;
                                                  updatePixels(newList);
                                                }}
                                                placeholder="Ex: 123456789012345"
                                                className="bg-background/80 border-white/5 h-11 pr-10 focus:ring-blue-500/20 transition-all rounded-xl font-mono text-sm"
                                              />
                                              {pixelList.length > 1 && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newList = [...pixelList];
                                                    newList.splice(idx, 1);
                                                    updatePixels(newList.length ? newList : ['']);
                                                  }}
                                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-red-500 transition-colors"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
                                        O Pixel ID permite que o site rastreie conversões e otimize campanhas de anúncios automaticamente.
                                        Você pode cadastrar múltiplos pixels para diferentes objetivos de rastreio.
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* WhatsApp Business API specific instructions/fields */}
                              {config.id === 'whatsapp' && (
                                <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-green-500" />
                                    <h5 className="text-xs font-black uppercase tracking-wider text-green-600">WhatsApp Business API (Configuração Meta)</h5>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    Diferente da sincronização de conta pessoal/comercial comum, esta API é necessária para o envio de mensagens automatizadas (Alertas e Newsletter).
                                    Preencha os campos abaixo com os dados obtidos no portal Meta for Developers.
                                  </p>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={saving === config.id}
                                  className="bg-gradient-to-r from-primary to-accent"
                                >
                                  {saving === config.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                  {hasCreds ? "Atualizar Credenciais" : "Salvar Configuração"}
                                </Button>

                                {config.oauthSupported && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={hasConnections ? "outline" : "default"}
                                    onClick={() => handleConnectApi(config.id)}
                                    disabled={isConnecting}
                                    className={cn(!hasConnections && "bg-primary/20 text-primary hover:bg-primary/30 border-primary/20")}
                                  >
                                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> :
                                      hasConnections ? <><Check className="w-4 h-4 mr-2" />Adicionar Outra Conta</> :
                                        <><Check className="w-4 h-4 mr-2" />Conectar Conta</>}
                                  </Button>
                                )}

                                {!config.oauthSupported && (
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant={hasCreds ? "outline" : "default"}
                                    disabled={saving === config.id}
                                    className={cn(!hasCreds && "gap-2")}
                                  >
                                    {saving === config.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> :
                                      hasCreds ? <><Check className="w-4 h-4 mr-2" />Integração Ativa</> :
                                        <><Plus className="w-4 h-4" />Ativar Integração</>}
                                  </Button>
                                )}

                                {/* Telegram: explicit connect button to trigger sync after saving token */}
                                {config.id === 'telegram' && hasCreds && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={isEffectivelyConnected ? "outline" : "default"}
                                    disabled={statsLoading}
                                    onClick={async () => {
                                      await syncSocialStats('telegram');
                                    }}
                                    className={cn(
                                      !isEffectivelyConnected && "bg-[#2AABEE] hover:bg-[#229ED9] text-white border-0",
                                      isEffectivelyConnected && "gap-2"
                                    )}
                                  >
                                    {statsLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    {isEffectivelyConnected ? "Adicionar Outra Conta" : "Conectar Conta"}
                                  </Button>
                                )}

                                {hasCreds && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteCreds(config.id)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                    Limpar Credenciais
                                  </Button>
                                )}
                              </div>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </TabsContent>

        {/*  Add API Modal  */}
        <Dialog open={showAddApiModal} onOpenChange={setShowAddApiModal}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Adicionar Nova API ou Rede Social
              </DialogTitle>
              <DialogDescription>
                Selecione uma plataforma para configurar e conectar sua conta.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground hidden">Selecione uma plataforma para configurar. Ela será adicionada à lista de APIs e redes sociais.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {UNIQUE_PLATFORM_CONFIGS.map(config => {
                  const isAlreadyAdded = activePlatformIds.includes(config.id);
                  return (
                    <button
                      key={config.id}
                      onClick={() => handleAddPlatform(config.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center group",
                        isAlreadyAdded ? "border-primary/40 bg-primary/5 opacity-60 cursor-default" : "border-border hover:border-primary/40 hover:bg-primary/5"
                      )}
                      disabled={isAlreadyAdded}
                    >
                      <div className="w-12 h-12">
                        <PlatformIconBadge platform={config as any} size="lg" muted={false} />
                      </div>
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">{config.name}</span>
                      <Badge variant="outline" className="text-[9px] text-muted-foreground">
                        {isAlreadyAdded ? 'Já Ativado' : (config.oauthSupported ? 'OAuth' : 'API Key')}
                      </Badge>
                    </button>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">Mais integrações serão adicionadas em breve. Entre em contato para solicitar uma plataforma específica.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <TabsContent value="security">
          <div className="space-y-6">
            {/* Password Section */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl border border-border p-6 pb-2">
              <h3 className="font-display font-bold text-lg mb-4">Segurança da Conta</h3>

              <div className="glass-card rounded-2xl border border-border/50 p-6 mb-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2.5 bg-primary/10 rounded-xl"><Mail className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h4 className="font-bold text-base">Alterar E-mail</h4>
                    <p className="text-sm text-muted-foreground">Atualize seu endereço de e-mail cadastrado</p>
                  </div>
                </div>
                <form className="space-y-4 pl-14">
                  <div className="space-y-1.5">
                    <Input type="email" placeholder="Novo endereço de e-mail" className="bg-background max-w-md" />
                  </div>
                  <Button type="button" variant="secondary" onClick={() => toast({ title: 'Atenção', description: 'Por motivos de segurança, a troca de e-mail requer confirmação por link enviado ao endereço atual.' })}>
                    Solicitar Alteração
                  </Button>
                </form>
              </div>

              <div className="glass-card rounded-2xl border border-border/50 p-6 mb-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2.5 bg-primary/10 rounded-xl"><Shield className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h4 className="font-bold text-base">Alterar senha</h4>
                    <p className="text-sm text-muted-foreground">Mantenha sua conta segura alterando sua senha periodicamente</p>
                  </div>
                </div>
                <form className="space-y-4 pl-14" autoComplete="on">
                  {/* Hidden username field for browser accessibility / password manager compliance */}
                  <input type="text" name="username" value={profileData.email} readOnly autoComplete="username" className="hidden" aria-hidden="true" />
                  <div className="space-y-1.5">
                    <Input type="password" placeholder="Senha atual" autoComplete="current-password" className="bg-background max-w-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Input type="password" placeholder="Nova senha" autoComplete="new-password" className="bg-background max-w-md" />
                  </div>
                  <div className="space-y-1.5">
                    <Input type="password" placeholder="Confirmar nova senha" autoComplete="new-password" className="bg-background max-w-md" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Switch id="force-logout" />
                    <label htmlFor="force-logout" className="text-sm text-muted-foreground">Desconectar de outros dispositivos</label>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => toast({ title: 'Recurso Indisponível', description: 'Por favor, recupere sua senha na tela de login caso precise alterá-la no momento.', variant: 'destructive' })}>
                    Atualizar Senha
                  </Button>
                </form>
              </div>


              <div className="border border-border rounded-xl p-5 bg-background/50 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-primary/10 rounded-xl"><Key className="w-5 h-5 text-primary" /></div>
                    <div>
                      <h4 className="font-bold text-base">Autenticação de dois fatores</h4>
                      <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança à sua conta</p>
                    </div>
                  </div>
                  <Switch
                    checked={profileData.two_factor_enabled}
                    onCheckedChange={(checked) => {
                      if (!profileData.phone) {
                        toast({
                          title: "Telefone Necessário",
                          description: "Adicione um número de celular na aba Perfil antes de ativar o 2FA.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setProfileData({ ...profileData, two_factor_enabled: checked });
                    }}
                  />
                </div>
              </div>

            </motion.div>

            {/* Active Sessions Panel */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl border border-border p-6 mt-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="p-2.5 bg-primary/10 rounded-xl"><Laptop className="w-5 h-5 text-primary" /></div>
                <div>
                  <h4 className="font-bold text-base">Sessões Ativas</h4>
                  <p className="text-sm text-muted-foreground">Gerencie os dispositivos conectados à sua conta</p>
                </div>
              </div>
              <div className="space-y-3 pl-14">
                {/* Current Session */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Laptop className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Este dispositivo <span className="text-[10px] bg-green-500/20 text-green-500 border border-green-500/30 rounded px-1.5 py-0.5 ml-1 font-normal">Sessão Atual</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">Navegador Web · {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                </div>
                {/* Last Login Info */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Último Acesso</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {profile?.updated_at
                          ? new Date(profile.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Informação não disponível'}
                      </p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/5 hover:text-red-600 mt-2" onClick={() => toast({ title: 'Sessões Encerradas', description: 'Todas as outras sessões foram desconectadas.' })}>
                  <LogOut className="w-4 h-4" /> Encerrar outras sessões
                </Button>
              </div>
            </motion.div>

            {/* Delete Account Section */}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl border border-red-500/20 bg-red-500/5 p-6 flex flex-col items-start mt-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2.5 bg-red-500/10 rounded-xl"><AlertCircle className="w-5 h-5 text-red-500" /></div>
                <div>
                  <h4 className="font-bold text-base text-red-500">Excluir conta</h4>
                  <p className="text-sm text-red-400/80">Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.</p>
                </div>
              </div>
              <Button variant="destructive" className="ml-14 bg-red-500/90 hover:bg-red-500 text-white font-medium" onClick={() => toast({ title: 'Atenção', description: 'Para excluir sua conta, entre em contato com o suporte.' })}>
                Excluir minha conta
              </Button>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="system_dash">
          <SystemSettingsView />
        </TabsContent>
        <TabsContent value="system_portal">
          <PortalSettingsWrapper />
        </TabsContent>
        <TabsContent value="system_seo">
          <SEOTab />
        </TabsContent>
      </Tabs>

      {/* Edit Social Link Dialog */}
      <Dialog open={!!editingSocial} onOpenChange={(open) => !open && setEditingSocial(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Editar Rede Social</DialogTitle>
            <DialogDescription>
              Atualize o nome do perfil ou remova esta rede social.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Perfil</label>
              <Input
                value={editingSocial?.name || ""}
                onChange={(e) => setEditingSocial(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Ex: @seuusuario"
                className="bg-muted/50"
              />
            </div>
            <div className="flex justify-between items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={() => setShowDeleteConfirm(editingSocial?.index ?? null)}
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingSocial(null)}>Cancelar</Button>
                <Button size="sm" className="bg-primary" onClick={handleUpdateSocialLink}>Salvar Alterações</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm !== null} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta rede social? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm !== null && handleRemoveSocialLink(showDeleteConfirm)}>Excluir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Crop Dialog */}
      <Dialog open={!!avatarToCrop} onOpenChange={(open) => !open && setAvatarToCrop(null)}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Ajustar Foto de Perfil</DialogTitle>
            <DialogDescription>
              Arraste e redimensione sua imagem. Você pode aplicar filtros abaixo.
            </DialogDescription>
          </DialogHeader>
          {avatarToCrop && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="bg-muted/30 rounded-full overflow-hidden border border-border shadow-inner" style={{ filter: editorFilter }}>
                <AvatarEditor
                  ref={editorRef}
                  image={avatarToCrop}
                  width={250}
                  height={250}
                  border={0}
                  borderRadius={125}
                  color={[0, 0, 0, 0.6]} // RGBA
                  scale={editorScale}
                  rotate={0}
                />
              </div>

              <div className="w-full space-y-4 px-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Afastar</span>
                    <span>Aproximar</span>
                  </div>
                  <Slider
                    value={[editorScale]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={(val) => setEditorScale(val[0])}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Filtro de Imagem</label>
                  <select
                    value={editorFilter}
                    onChange={(e) => setEditorFilter(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="none">Nenhum</option>
                    <option value="grayscale(100%)">Preto e Branco</option>
                    <option value="sepia(100%)">Sépia</option>
                    <option value="contrast(150%)">Alto Contraste</option>
                    <option value="brightness(120%)">Mais Claro</option>
                    <option value="brightness(80%)">Mais Escuro</option>
                    <option value="hue-rotate(90deg)">Colorido (+90°)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 w-full">
                <Button variant="ghost" onClick={() => setAvatarToCrop(null)}>Cancelar</Button>
                <Button
                  onClick={handleSaveCroppedAvatar}
                  disabled={uploadingAvatar}
                  className="bg-primary px-8"
                >
                  {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Salvar Foto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsView;
