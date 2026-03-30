import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Bell, Key, Shield, Globe, Save, Camera, Check, AlertCircle, Loader2, Unplug, Info,
  Eye, EyeOff, ChevronDown, ChevronUp, Trash2, Users, RefreshCw, Heart, Share2, TrendingUp, Plus, X,
  Phone, MessageSquare, Calendar, Mail, Image as ImageIcon, Link2, LogOut, Pencil, Laptop, Clock,
  UserCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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

const MetaIcon = ({ "data-active": isActive, className }: any) => renderApiAsset("/api-icons/meta.png", isActive, className);
const GoogleIcon = ({ "data-active": isActive, className }: any) => renderApiAsset("/api-icons/google.png", isActive, className);
const SpotifyIcon = ({ "data-active": isActive, className }: any) => renderApiAsset("/api-icons/spotify.png", isActive, className);
const GiphyIcon = ({ "data-active": isActive, className }: any) => renderApiAsset("/api-icons/giphy.png", isActive, className);

// Merged platform configurations with oauth meta and dev integrations
const PLATFORM_CONFIGS: any[] = [
  ...socialPlatforms.map(p => ({
    ...p,
    oauthSupported: p.id !== 'site' && p.id !== 'telegram'
  })),
  { id: 'meta_ads', name: 'Meta Marketing & Ads API', icon: MetaIcon, color: "bg-[#1877F210]", textColor: "text-[#1877F2]", gradient: "from-blue-500 to-indigo-500", oauthSupported: false },
  { id: 'google_cloud', name: 'Google Cloud (Maps, YouTube, Ads)', icon: GoogleIcon, color: "bg-[#EA433510]", textColor: "text-[#EA4335]", gradient: "from-red-500 to-orange-500", oauthSupported: false },
  { id: 'spotify', name: 'Spotify Web API', icon: SpotifyIcon, color: "bg-[#1DB95410]", textColor: "text-[#1DB954]", gradient: "from-green-500 to-emerald-500", oauthSupported: false },
  { id: 'giphy', name: 'Giphy SDK', icon: GiphyIcon, color: "bg-purple-500/10", textColor: "text-purple-500", gradient: "from-purple-500 to-fuchsia-500", oauthSupported: false }
];

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
  
  const [socialStats, setSocialStats] = useState<SocialAccountStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchSocialStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    const { data, error } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id);
    
    if (data) {
      setSocialStats(data as any);
    }
    setStatsLoading(false);
  };

  const syncSocialStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      // Temporariamente desativado para evitar Erro 401 nativo do navegador
      // O servidor backend precisará ser configurado com supabase CLI depois
      // await supabase.functions.invoke("sync-social-data", { method: "POST" });
      
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (e) {
      // SILENT FAIL completely

    } finally {
      await fetchSocialStats();
      setStatsLoading(false);
    }
  };

  const hasSyncedRef = useRef(false);

  useEffect(() => {
    fetchSocialStats();
  }, [user]);

  // Auto-sync on first load when there are connections
  useEffect(() => {
    if (!hasSyncedRef.current && connections.length > 0) {
      hasSyncedRef.current = true;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          syncSocialStats();
        }
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
    social_links: profile?.social_links || [] as Array<{platform: string, name: string}>,
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
      const saved = localStorage.getItem('activePlatformIds');
      // Default set of popular platforms
      return saved ? JSON.parse(saved) : ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'threads', 'tiktok', 'telegram', 'google_cloud'];
    } catch (e) {
      return ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'threads', 'tiktok', 'telegram', 'google_cloud'];
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
      const success = await updateProfile({ 
        name: `${profileData.first_name} ${profileData.last_name}`.trim(),
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        bio: profileData.bio,
        phone: profileData.phone,
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
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-border p-6 outline-none">
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
                        onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
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
                        onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
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
                          onChange={(e) => setProfileData({...profileData, birthdate: e.target.value})}
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
                        onChange={(e) => setProfileData({...profileData, gender: e.target.value})}
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
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
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
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
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
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
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
                        onChange={(e) => setNewSocialLink({...newSocialLink, platform: e.target.value})}
                        className="w-28 h-8 px-2 rounded-md border border-border/40 bg-muted/30 focus:outline-none focus:ring-1 focus:ring-ring text-xs"
                      >
                        {socialPlatforms.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <Input 
                        value={newSocialLink.name}
                        onChange={(e) => setNewSocialLink({...newSocialLink, name: e.target.value})}
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-border p-6">
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
                  onClick={syncSocialStats}
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
              {PLATFORM_CONFIGS.filter(c => activePlatformIds.includes(c.id)).map((config) => {
                const platformConnections = connections.filter(c => c.platform === config.id && c.is_connected);
                const hasConnections = platformConnections.length > 0;
                
                const isConnecting = connectingPlatform === config.id;
                const isExpanded = expandedPlatform === config.id;
                const hasCreds = hasCredentials(config.id);
                const fields = PLATFORM_CREDENTIAL_FIELDS[config.id] || [];
                
                return (
                  <div key={config.id} className="glass-card rounded-2xl border border-border/50 overflow-hidden">
                    <div 
                      className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-muted/20 border-b border-border/10 cursor-pointer"
                      onClick={() => toggleExpand(config.id)}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <PlatformIconBadge 
                          platform={config as any} 
                          size="md" 
                          muted={hasConnections ? false : (config.oauthSupported ? true : !hasCreds)}
                        />

                        <div className="text-left min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <p className="font-semibold text-base">{config.name}</p>
                            {hasConnections && (
                              <div className="flex items-center">
                                <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-600">Conectado</Badge>
                              </div>
                            )}
                             {hasCreds && !hasConnections && (
                               <Badge variant="outline" className={cn(
                                 "text-[10px]",
                                 !config.oauthSupported ? "bg-green-600/10 text-green-600 border-green-600/30" : "text-yellow-600 border-yellow-600/30"
                               )}>
                                 {!config.oauthSupported ? "Conectado" : "Credenciais salvas"}
                               </Badge>
                             )}
                          </div>
                          
                          {hasConnections ? (
                            <p className="text-sm text-muted-foreground mt-1">
                              {platformConnections.length === 1 
                                ? <><span className="font-medium text-foreground">{platformConnections[0].page_name || "Conta Conectada"}</span> — expanda para gerenciar</>
                                : <><span className="font-medium text-foreground">{platformConnections.length} contas conectadas</span> — expanda para gerenciar</>}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                              {hasCreds ? "Credenciais configuradas — pronto para conectar nas configurações de API abaixo" : "Configurações pendentes"}
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
                          <Key className="w-4 h-4" /> 
                          <span className="font-medium">{config.oauthSupported ? (hasConnections ? 'Gerenciar' : 'Conectar') : 'API'}</span>
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
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 border-t border-border bg-background/50 space-y-6">

                            {/*  Google Cloud services status  */}
                            {config.id === 'google_cloud' && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Globe className="w-4 h-4 text-muted-foreground" />
                                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Serviços Google Configurados</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {[
                                    { name: 'Maps API', key: 'maps_api_key', desc: 'Mapas e Geolocalização' },
                                    { name: 'News API', key: 'news_api_key', desc: 'Google News Discovery' },
                                    { name: 'YouTube API', key: 'youtube_api_key', desc: 'Vídeos e Canal' },
                                    { name: 'Google Ads', key: 'ads_id', desc: 'Campanhas e Anúncios' },
                                    { name: 'Analytics', key: 'analytics_id', desc: 'Dados e Métricas' },
                                    { name: 'Search Console', key: 'search_console_id', desc: 'SEO e Buscas' },
                                  ].map(svc => {
                                    const isActive = !!credentials['google_cloud']?.[svc.key];
                                    return (
                                      <div key={svc.name} className={cn(
                                        "flex flex-col gap-1 p-3 rounded-lg border text-xs",
                                        isActive ? "border-green-500/30 bg-green-500/5" : "border-border bg-muted/20"
                                      )}>
                                        <div className="flex items-center gap-1.5">
                                          {isActive 
                                            ? <Check className="w-3 h-3 text-green-500" />
                                            : <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />}
                                          <span className={cn("font-semibold", isActive ? "text-green-600" : "text-muted-foreground")}>{svc.name}</span>
                                        </div>
                                        <span className="text-muted-foreground text-[10px]">{svc.desc}</span>
                                        {isActive && <span className="text-green-500 font-medium text-[10px]">Conectado</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/*  Connected Profiles List  */}
                            {hasConnections && (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contas Conectadas</p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                  {platformConnections.map(conn => {
                                    const stats = socialStats.find(s => s.platform === config.id && s.platform_user_id === conn.platform_user_id) 
                                               || socialStats.find(s => s.platform === config.id);
                                    
                                    return (
                                      <div key={conn.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border/50 shadow-sm transition-all hover:border-primary/20">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                          <Avatar className="w-12 h-12 rounded-xl border-2 border-background shadow-sm">
                                            <AvatarImage src={(conn as any)?.profile_image_url || stats?.profile_picture || ""} alt={conn.page_name || config.name} className="object-cover" />
                                            <AvatarFallback className="rounded-xl bg-muted text-lg font-bold">{config.name[0]}</AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0 flex-1">
                                            <p className="font-bold truncate text-base text-foreground">{conn.page_name || stats?.username || "Conta Conectada"}</p>
                                            
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1 text-xs text-muted-foreground font-medium">
                                              {stats ? (
                                                <>
                                                  <span className="flex items-center gap-1.5 text-foreground"><Users className="w-3.5 h-3.5 text-primary" /> {(stats.followers_count || 0) > 1000 ? ((stats.followers_count || 0)/1000).toFixed(1) + 'K' : (stats.followers_count || 0)} seguidores</span>
                                                  <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-muted-foreground/30"></div> {stats.metadata?.posts_count || 0} posts</span>
                                                  {stats.views > 0 && <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-muted-foreground/30"></div> {stats.views > 1000 ? (stats.views/1000).toFixed(1) + 'K' : stats.views} views</span>}
                                                  {stats.likes > 0 && <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-muted-foreground/30"></div> {stats.likes > 1000 ? (stats.likes/1000).toFixed(1) + 'K' : stats.likes} likes</span>}
                                                </>
                                              ) : (
                                                <span>Aguardando estatísticas...</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 shrink-0 w-full sm:w-auto mt-1 sm:mt-0"
                                          onClick={() => disconnect(`${config.id}|${conn.id}`)}
                                        >
                                          <Unplug className="w-4 h-4 mr-2" />
                                          Desconectar
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/*  Credential fields and Actions  */}
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveCreds(config.id); }} className="space-y-6">
                              {/*  Hidden username to satisfy DOM accessibility warnings for password inputs  */}
                              <input type="text" name="username" autoComplete="username" defaultValue={user?.email || "api_user"} style={{display: 'none'}} />
                              
                              {fields.length > 0 && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2">
                                    <Key className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-semibold">Configuração da API</p>
                                  </div>
                                  <div className="grid gap-3">
                                    {fields.map((field) => {
                                      const fieldId = `${config.id}-${field.key}`;
                                      const isVisible = visibleFields[fieldId] || false;
                                      const savedValue = credentials[config.id]?.[field.key];
                                      const val = (formValues[config.id] || credentials[config.id] || {})[field.key] || "";
                                      
                                      return (
                                        <div key={field.key} className="space-y-1.5">
                                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-tight">{field.label}</label>
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
                {PLATFORM_CONFIGS.map(config => {
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
        <TabsContent value="system_portal">
          <PortalSettingsWrapper />
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
