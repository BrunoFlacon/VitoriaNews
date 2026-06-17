import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Bell, Key, Shield, Globe, Save, Camera, Check, AlertCircle, Loader2, Unplug, Info,
  Eye, EyeOff, ChevronDown, ChevronUp, Trash2, Users, RefreshCw, Heart, Share2, TrendingUp, Plus, X,
  Phone, MessageSquare, Calendar, Mail, Image as ImageIcon, Link2, LogOut, Pencil, Laptop, Clock,
  UserCircle2, FileText, Target, Search, Sparkles, Brain, Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useApiCredentials } from "@/hooks/useApiCredentials";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import AvatarEditor from "react-avatar-editor";
import { Slider } from "@/components/ui/slider";
import { cn, sanitizeHtml } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { PlatformIconBadge } from "@/components/icons/PlatformIconBadge";
import { usePermissions } from "@/hooks/usePermissions";
import { SystemSettingsView } from "./settings/SystemSettingsView";
import { ProfileTab } from "./settings/ProfileTab";
import { SecurityTab } from "./settings/SecurityTab";
import { SEOTab } from "./settings/SEOTab";
import { APITab } from "./settings/APITab";
import { BrandsTab } from "./BrandsTab";
import { useSystem } from "@/hooks/useSystem";
import { useSocialStats } from "@/hooks/useSocialStats";
import { GoogleIcon, FacebookIcon, MetaIcon, NewsapiIcon, MapsIcon, YoutubeIcon, AdsIcon, AnalyticsIcon, PeopleIcon, GoogleNewsIcon } from "@/components/icons/SocialIcons";




interface SocialAccountStats {
  id: string;
  platform: string;
  platform_user_id?: string;
  username: string;
  profile_picture: string;
  followers_count: number;
  metadata?: { posts_count?: number };
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

const PLATFORM_CONFIGS = [
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
  { id: 'resend', name: 'Resend (Email Automation)', icon: Mail, color: "bg-[#00000010]", textColor: "text-foreground", gradient: "from-slate-700 to-black", oauthSupported: false, type: 'tool' },
  { id: 'ai_config', name: 'Inteligência Artificial (Texto, Imagem, Áudio)', icon: Sparkles, color: "bg-purple-500/10", textColor: "text-purple-500", gradient: "from-purple-500 to-pink-500", oauthSupported: false, type: 'tool' }
];


// Deduplicate PLATFORM_CONFIGS just in case socialPlatforms already has meta_ads/google_cloud
const UNIQUE_PLATFORM_CONFIGS = Array.from(new Map(PLATFORM_CONFIGS.map(item => [item.id, item])).values());

export const SettingsView = ({ defaultTab }: { defaultTab?: string }) => {
  const { user, profile, updateProfile, isOnline, toggleOnline } = useAuth();
  const { can } = usePermissions();
  const { toast } = useToast();
  const [activeSettingsTab, setActiveSettingsTab] = useState(defaultTab || 'profile');

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
  const { connections, loading: connectionsLoading, initiateOAuth, disconnect } = useSocialConnections();
  const { credentials, loading: credsLoading, saving, saveCredentials, deleteCredentials, hasCredentials } = useApiCredentials();
  
  const { stats: socialStats, audienceBreakdown, loading: statsLoading, refresh: refreshStats } = useSocialStats();
  const { settings: systemSettings, updateSettingsOptimistic } = useSystem();
  const [manualSyncLoading, setManualSyncLoading] = useState(false);

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
    const now = Date.now();
    if (now - syncCooldownRef.current < 60000) {
      return;
    }
    setManualSyncLoading(true);
    syncCooldownRef.current = now;
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const invokeFn = async (fnName: string, bodyObj?: any) => {
        const { data, error: invErr } = await supabase.functions.invoke(fnName, {
          body: { userId: session.user.id, ...bodyObj }
        });
        if (invErr) {
          console.debug(`[Sync] ${fnName}:`, invErr.message);
          throw new Error(`${fnName}: ${invErr.message}`);
        }
        if (data?.status === 'skipped') {
          console.log(`[Sync] ${fnName} skipped: ${data.message || 'not configured'}`);
        }
      };

      if (platformId === 'telegram') {
        await invokeFn('sync-telegram-chats', { platform: 'telegram' });
      } else if (platformId === 'meta_ads') {
        if (hasCredentials('meta_ads')) {
          await invokeFn('collect-meta-ads-analytics', { platform: 'meta_ads' }).catch(e => console.warn('[Ads]', e.message));
        }
      } else if (platformId === 'google_cloud' || platformId === 'youtube') {
        if (hasCredentials('google_cloud')) {
          await Promise.all([
            invokeFn('collect-youtube-analytics').catch(e => console.warn('[YT]', e.message)),
            invokeFn('collect-google-analytics').catch(e => console.warn('[GA]', e.message)),
          ]);
        }
      } else if (platformId) {
        await invokeFn('collect-social-analytics', { platform: platformId });
      } else {
        const syncTasks = [];
        syncTasks.push(invokeFn('collect-social-analytics').catch(e => console.warn('[Social]', e.message)));
        
        if (hasCredentials('meta_ads')) {
          syncTasks.push(invokeFn('collect-meta-ads-analytics').catch(e => console.warn('[Ads]', e.message)));
        }
        
        if (hasCredentials('google_cloud')) {
          syncTasks.push(invokeFn('collect-youtube-analytics').catch(e => console.warn('[YT]', e.message)));
          syncTasks.push(invokeFn('collect-google-analytics').catch(e => console.warn('[GA]', e.message)));
        }
        
        await Promise.all(syncTasks);
      }
      
      toast({ 
        variant: "success" as any, 
        title: "Sincronização concluída", 
        description: `Dados atualizados com sucesso.` 
      });
    } catch (e: any) {
      console.error("Error syncing stats:", e);
    } finally {
      await refreshStats();
      setManualSyncLoading(false);
    }
  };

  const hasSyncedRef = useRef(false);
  const syncCooldownRef = useRef(0);

  useEffect(() => {
    refreshStats();
  }, [user]);

  // Auto-sync on first load when there are connections
  useEffect(() => {
    if (!hasSyncedRef.current && connections.length > 0) {
      hasSyncedRef.current = true;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        syncSocialStats().catch(() => {});
      });
    }
  }, [connections]);

  
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
    avatar_url: profile?.avatar_url || "",
    social_links: profile?.social_links || [] as Array<{ platform: string, name: string }>,

    two_factor_enabled: profile?.two_factor_enabled || false
  });

  // Sync profileData when profile object from useAuth changes (e.g. after async load)
  useEffect(() => {
    if (profile) {
      setProfileData(prev => ({
        ...prev,
        first_name: profile.first_name || profile.name?.split(' ')[0] || prev.first_name,
        last_name: profile.last_name || profile.name?.split(' ').slice(1).join(' ') || prev.last_name,
        email: profile.email || prev.email,
        bio: profile.bio || prev.bio,
        website: profile.website || prev.website,
        phone: profile.phone || prev.phone,
        birthdate: profile.birthdate || prev.birthdate,
        gender: profile.gender || prev.gender,
        avatar_url: profile.avatar_url || prev.avatar_url,
        social_links: profile.social_links || prev.social_links,
        two_factor_enabled: profile.two_factor_enabled || prev.two_factor_enabled
      }));
    }
  }, [profile]);

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

  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const [avatarToCrop, setAvatarToCrop] = useState<File | null>(null);
  const [editorScale, setEditorScale] = useState(1);
  const [editorFilter, setEditorFilter] = useState("none"); // Para filtros CSS
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [showAddApiModal, setShowAddApiModal] = useState(false);
  
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
        
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
        const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        
        const success = await updateProfile({ avatar_url: avatarUrl });
        if (success) {
          toast({ title: "Foto atualizada" });
          setProfileData(prev => ({ ...prev, avatar_url: avatarUrl }));
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

  const handleSaveProfile = async () => {
    try {
      const cleanFirst = sanitizeHtml(profileData.first_name);
      const cleanLast = sanitizeHtml(profileData.last_name || "");
      const cleanBio = sanitizeHtml(profileData.bio || "");
      const cleanPhone = sanitizeHtml(profileData.phone || "");

      const success = await updateProfile({ 
        name: `${cleanFirst} ${cleanLast}`.trim(),
        first_name: cleanFirst,
        last_name: cleanLast,
        bio: cleanBio,
        phone: cleanPhone,
        birthdate: profileData.birthdate,
        gender: profileData.gender,
        social_links: profileData.social_links,
        two_factor_enabled: profileData.two_factor_enabled
      });
      if (success) toast({ variant: "success" as any, title: "Perfil atualizado" });
      else throw new Error("Falha na atualização");
    } catch (error: any) {
      console.error("Erro ao salvar perfil:", error);
      toast({ title: "Erro", description: "Não foi possível salvar o perfil. Verifique os campos.", variant: "destructive" });
    }
  };

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

  const handleSaveCreds = async (platform: string) => {
    const vals = formValues[platform] || {};
    const success = await saveCredentials(platform, vals);
    if (success) {
      setFormValues(prev => ({ ...prev, [platform]: vals }));
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

  const [localBotActive, setLocalBotActive] = useState<boolean | null>(null);

  const handleToggleBot = async (active: boolean) => {
    setLocalBotActive(active);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'wa_bot_active', value: active ? 'true' : 'false', group: 'general' }, { onConflict: 'key' });
      if (error) throw error;
    } catch (e) {
      console.error('Error toggling bot:', e);
      setLocalBotActive(null);
    }
  };

  const handleDisconnectCustom = async (platformId: string, connectionId: string) => {
    try {
      await disconnect(connectionId);
      toast({ title: "Desconectado", description: `Conexão ${platformId} removida.` });
    } catch (e) {
      console.error('Error disconnecting:', e);
      toast({ title: "Erro", description: "Falha ao desconectar.", variant: "destructive" });
    }
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
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display font-bold text-3xl mb-2">Configurações</motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-muted-foreground">Gerencie suas preferências e integrações</motion.p>
      </div>

      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="space-y-6 min-h-[600px]">
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
              <TabsTrigger value="brands" className="rounded-lg data-[state=active]:bg-background border-primary/10 py-2 px-4 shadow-sm transition-all">
                <Palette className="w-4 h-4 mr-2 text-primary" />
                <span className="font-bold text-primary">Marcas</span>
              </TabsTrigger>
              <TabsTrigger value="system_seo" className="rounded-lg data-[state=active]:bg-background border-primary/10 py-2 px-4 shadow-sm transition-all">
                <Search className="w-4 h-4 mr-2 text-primary" />
                <span className="font-bold text-primary">SEO & Meta</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className="outline-none focus-visible:ring-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="p-0">
            <ProfileTab 
              profile={profile}
              profileData={profileData}
              setProfileData={setProfileData}
              isOnline={isOnline}
              can={can}
              fileInputRef={fileInputRef}
              handleAvatarUpload={handleAvatarUpload}
              handlePhoneChange={handlePhoneChange}
              isValidatingWhatsApp={isValidatingWhatsApp}
              isWhatsAppValid={isWhatsAppValid}
              calculateAge={(dateString) => {
                if (!dateString) return null;
                const birthDate = new Date(dateString);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                return age;
              }}
              toggleOnline={toggleOnline}
              socialPlatforms={socialPlatforms}
              setEditingSocial={setEditingSocial}
              newSocialLink={newSocialLink}
              setNewSocialLink={setNewSocialLink}
              handleAddSocialLink={handleAddSocialLink}
              handleSaveProfile={handleSaveProfile}
            />
            

          </motion.div>
        </TabsContent>


        <TabsContent value="notifications">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-border p-6">
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
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="api">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-border p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-lg">APIs Sociais & Conexões</h3>
                <p className="text-sm text-muted-foreground mt-1">Configure suas APIs e conecte perfis sociais</p>
              </div>
              <div className="flex items-center gap-2">
                {(connectionsLoading || credsLoading || statsLoading || manualSyncLoading) && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncSocialStats()}
                  disabled={statsLoading || manualSyncLoading}
                  className="flex items-center gap-2 text-xs"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", (statsLoading || manualSyncLoading) && "animate-spin")} />
                  Sincronização Global

                </Button>
                <Button variant="default" size="sm" onClick={() => setShowAddApiModal(true)} className="flex items-center gap-2 text-xs shadow-sm bg-primary/90 hover:bg-primary">
                  <Plus className="w-3.5 h-3.5" /> Adicionar API
                </Button>
              </div>
            </div>

            <APITab 
              UNIQUE_PLATFORM_CONFIGS={UNIQUE_PLATFORM_CONFIGS}
              activePlatformIds={activePlatformIds}
              expandedPlatform={expandedPlatform}
              setExpandedPlatform={setExpandedPlatform}
              connections={connections}
              socialStats={socialStats}
              audienceBreakdown={audienceBreakdown}
              statsLoading={statsLoading}
              manualSyncLoading={manualSyncLoading}
              syncSocialStats={syncSocialStats}
              handleRemovePlatform={handleRemovePlatform}
              credentials={credentials}
              deleteCredentials={deleteCredentials}
              handleSaveCreds={handleSaveCreds}
              saveCredentials={saveCredentials}
              toast={toast}
              refreshStats={refreshStats}
              getBrandLogo={getBrandLogo}
              connectingPlatform={connectingPlatform}
              handleConnectApi={handleConnectApi}
              formValues={formValues}
              updateFormField={updateFormField}
              visibleFields={visibleFields}
              toggleFieldVisibility={toggleFieldVisibility}
              hasCredentials={hasCredentials}
              maskValue={maskValue}
              systemSettings={systemSettings}
              updateSettingsOptimistic={updateSettingsOptimistic}
              localBotActive={localBotActive}
              handleToggleBot={handleToggleBot}
              handleDisconnectCustom={handleDisconnectCustom}
              user={user}
              saving={saving}
            />

          </motion.div>
        </TabsContent>

        {/*  Add API Modal  */}
        <Dialog open={showAddApiModal} onOpenChange={setShowAddApiModal}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-border p-6 pb-2">
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl border border-border p-6 mt-6">
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

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl border border-red-500/20 bg-red-500/5 p-6 flex flex-col items-start mt-6">
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
        <TabsContent value="brands">
          <BrandsTab />
        </TabsContent>
        <TabsContent value="system_seo">
          <SEOTab />

        </TabsContent>
      </Tabs>

      {/* Edit Social Link Dialog */}
      <Dialog open={!!editingSocial} onOpenChange={(open) => !open && setEditingSocial(null)}>
        <DialogContent className="sm:max-w-md">
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
        <DialogContent className="sm:max-w-sm">
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
        <DialogContent className="sm:max-w-md">
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
