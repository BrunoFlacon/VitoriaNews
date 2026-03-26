import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Bell, Key, Shield, Globe, Save, Camera, Check, AlertCircle, Loader2, Unplug, Info,
  Eye, EyeOff, ChevronDown, ChevronUp, Trash2, Users, RefreshCw, Heart, Share2, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useApiCredentials, PLATFORM_CREDENTIAL_FIELDS } from "@/hooks/useApiCredentials";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { socialPlatforms } from "@/components/icons/SocialIcons";

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

// Merged platform configurations with oauth meta
const PLATFORM_CONFIGS = socialPlatforms.map(p => ({
  ...p,
  oauthSupported: p.id !== 'site' && p.id !== 'telegram'
}));

export const SettingsView = () => {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
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
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.access_token) {
        // Refresh session to prevent 401 from expired JWTs on long sessions
        const { data: refreshed } = await supabase.auth.refreshSession();
        const activeToken = refreshed?.session?.access_token || sessionData.session.access_token;

        const { error } = await supabase.functions.invoke("sync-social-data", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeToken}`
          }
        });

        if (error) {
          if (error.status === 401) {
            toast({
              title: "Sessão expirada",
              description: "Sua sessão do Supabase expirou. Por favor, faça login novamente.",
              variant: "destructive"
            });
          } else {
            // Potencial erro silencioso ou logado se não for crítico
          }
        }
      }
    } catch (e) {
      // Background sync fail is handled silently
    } finally {
      await fetchSocialStats();
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
    email: user?.email || "",
    bio: profile?.bio || "",
    website: ""
  });

  const [notifications, setNotifications] = useState({
    emailPosts: true, emailEngagement: false, pushPosts: true, pushEngagement: true, pushSchedule: true, weeklyReport: true
  });

  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const success = await updateProfile({ avatar_url: avatarUrl });
      if (success) toast({ title: "Foto atualizada" });
    } catch (error) {
      toast({ title: "Erro no upload", description: "Não foi possível enviar a foto.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    const success = await updateProfile({ name: profileData.name, bio: profileData.bio });
    if (success) toast({ title: "Perfil atualizado" });
    else toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
  };

  const handleConnectApi = async (platform: string) => {
    // 🛡️ Validação extra para Threads (garantir que salvou o App ID primeiro)
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
      // Initialize form with saved values
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

  return (
    <div>
      <div className="mb-8">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display font-bold text-3xl mb-2">Configurações</motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-muted-foreground">Gerencie suas preferências e integrações</motion.p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-background"><User className="w-4 h-4 mr-2" />Perfil</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-background"><Bell className="w-4 h-4 mr-2" />Notificações</TabsTrigger>
          <TabsTrigger value="api" className="rounded-lg data-[state=active]:bg-background"><Key className="w-4 h-4 mr-2" />APIs Sociais</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-lg data-[state=active]:bg-background"><Globe className="w-4 h-4 mr-2" />Integrações Dev</TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-background"><Shield className="w-4 h-4 mr-2" />Segurança</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-border p-6">
            <h3 className="font-display font-bold text-lg mb-6">Informações do Perfil</h3>
            <div className="flex items-start gap-6 mb-6">
              <div className="relative">
                <Avatar className="w-24 h-24 rounded-2xl">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profileData.name} className="object-cover" />}
                  <AvatarFallback className="rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 text-3xl font-bold">{profileData.name.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                  {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">{profileData.name || "Usuário"}</h4>
                <p className="text-sm text-muted-foreground">{profileData.email}</p>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome</label>
                  <Input value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={profileData.email} disabled className="bg-muted/50" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <textarea value={profileData.bio} onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="w-full h-24 px-3 py-2 bg-muted/50 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Conte um pouco sobre você..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={profileData.website} onChange={(e) => setProfileData({ ...profileData, website: e.target.value })} className="pl-10 bg-muted/50" placeholder="https://seusite.com" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveProfile} className="bg-gradient-to-r from-primary to-accent"><Save className="w-4 h-4 mr-2" />Salvar alterações</Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* Notifications Tab */}
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
                      <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })} />
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
                      <Switch checked={notifications[item.key as keyof typeof notifications]} onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* API Tab — Expandable CRUD cards */}
        <TabsContent value="api">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-border p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display font-bold text-lg">Integrações de API</h3>
                <p className="text-sm text-muted-foreground mt-1">Configure credenciais e conecte suas contas</p>
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
              </div>
            </div>

            
            <div className="space-y-3">
              {PLATFORM_CONFIGS.map((config) => {
                const platformConnections = connections.filter(c => c.platform === config.id && c.is_connected);
                const hasConnections = platformConnections.length > 0;
                
                const isConnecting = connectingPlatform === config.id;
                const isExpanded = expandedPlatform === config.id;
                const hasCreds = hasCredentials(config.id);
                const fields = PLATFORM_CREDENTIAL_FIELDS[config.id] || [];
                const isSaving = saving === config.id;
                const currentValues = formValues[config.id] || credentials[config.id] || {};
                const PlatformIcon = config.icon;
                
                return (
                  <div key={config.id} className="rounded-xl border border-border overflow-hidden transition-all bg-muted/10">
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between p-4 bg-muted/20 border-b border-border/10">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all mt-0.5",
                          hasConnections ? config.color : hasCreds ? "bg-yellow-500/10" : "bg-muted"
                        )}>
                          {typeof PlatformIcon === 'string' ? PlatformIcon : <PlatformIcon className={cn("w-5 h-5", hasConnections ? "text-white" : "text-muted-foreground")} />}
                        </div>

                        <div className="text-left min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-base">{config.name}</p>
                            {hasConnections && (
                              <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-600">Conectado</Badge>
                            )}
                            {hasCreds && !hasConnections && (
                              <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-600/30">Credenciais salvas</Badge>
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
                      
                      <button 
                         onClick={() => toggleExpand(config.id)}
                         className="flex items-center gap-2 mt-4 sm:mt-0 p-2 hover:bg-muted/50 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        <Key className="w-4 h-4" /> 
                        <span className="font-medium">API</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Expanded panel */}
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

                            {/* Connected Profiles List (moved from header) */}
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

                            {/* Credential fields and Actions */}
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveCreds(config.id); }} className="space-y-6">
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
                                      const formValue = currentValues[field.key] || "";
                                      
                                      return (
                                        <div key={field.key} className="space-y-1.5">
                                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-tight">{field.label}</label>
                                          <div className="relative">
                                            <Input
                                              type={field.masked && !isVisible ? "password" : "text"}
                                              value={formValue}
                                              onChange={(e) => updateFormField(config.id, field.key, e.target.value)}
                                              placeholder={field.placeholder || (savedValue ? maskValue(savedValue) : `${field.label}`)}
                                              className={cn(
                                                "bg-muted/50 h-10 text-sm",
                                                config.id === 'youtube' && field.key === 'client_id' && (formValue.startsWith('UC') || (formValue && !formValue.endsWith('.apps.googleusercontent.com') && formValue.length > 5)) && "border-red-500 ring-2 ring-red-500",
                                                config.id === 'threads' && field.key === 'app_id' && formValue && !/^\d+$/.test(formValue) && "border-red-500 ring-2 ring-red-500"
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
                                          {config.id === 'youtube' && field.key === 'client_id' && (formValue.startsWith('UC') || (formValue && !formValue.endsWith('.apps.googleusercontent.com') && formValue.length > 5)) && (
                                            <div className="text-[10px] text-red-500 font-bold mt-1 p-2 bg-red-500/10 rounded-lg space-y-1">
                                              <p className="flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> 
                                                CLIENT ID INVÁLIDO
                                              </p>
                                              <p className="pl-4 font-normal">
                                                {formValue.startsWith('UC') 
                                                  ? "Você inseriu um ID de CANAL. O Client ID deve terminar com '.apps.googleusercontent.com'." 
                                                  : "O Client ID deve terminar exatamente com '.apps.googleusercontent.com'."}
                                              </p>
                                            </div>
                                          )}
                                          {config.id === 'threads' && field.key === 'app_id' && formValue && !/^\d+$/.test(formValue) && (
                                            <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3" /> 
                                              Atenção: O App ID da Meta deve ser composto apenas por números.
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
  
                              {/* Action buttons */}
                              <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={isSaving}
                                  className="bg-gradient-to-r from-primary to-accent"
                                >
                                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                  {hasCreds ? "Atualizar Credenciais" : "Salvar Configuração"}
                                </Button>
  
                                {config.oauthSupported && hasCreds && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={hasConnections ? "outline" : "secondary"}
                                    onClick={() => handleConnectApi(config.id)}
                                    disabled={isConnecting}
                                    className={cn(!hasConnections && "bg-primary/20 text-primary hover:bg-primary/30 border-primary/20")}
                                  >
                                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 
                                     hasConnections ? <><Check className="w-4 h-4 mr-2" />Adicionar Outra Conta</> : 
                                     <><Check className="w-4 h-4 mr-2" />Autorizar Acesso</>}
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
                                
                                {hasConnections && (
                                  <Button type="button" variant="ghost" size="sm" onClick={fetchSocialStats} className="text-muted-foreground ml-auto">
                                    <RefreshCw className="w-4 h-4 mr-2" /> Atualizar Dados
                                  </Button>
                                )}
                              </div>
                            </form>

                            {/* Info note */}
                            {config.id === 'telegram' && (
                              <div className="flex gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Telegram utiliza <strong>Bot Tokens</strong>. Crie um bot via @BotFather, copie o token e salve acima. Após salvar, o bot estará pronto para uso.
                                </p>
                              </div>
                            )}
                            {(config.id === 'instagram' || config.id === 'threads' || config.id === 'whatsapp') && (
                              <div className="flex gap-2 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  Estas plataformas utilizam o <strong>Meta Business App</strong>. Configure o App ID e App Secret do seu aplicativo registrado no portal Meta for Developers.
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-dashed border-border flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Insira as credenciais de cada plataforma e clique em "Salvar". Após salvar, o botão "Autorizar Acesso" ficará disponível para iniciar a autenticação OAuth.
                </p>
              </div>
              <div className="pl-8 space-y-2">
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <Globe className="w-3 h-3" /> 
                  <strong>Google:</strong> Use o "Client ID" do Google Cloud Console, não o ID do canal.
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <Shield className="w-3 h-3" /> 
                  <strong>Meta:</strong> Use o "App ID" numérico do portal Meta for Developers.
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <Key className="w-3 h-3" /> 
                  <strong>Twitter:</strong> Use o "Client ID" do OAuth 2.0 Settings no Portal X.
                </p>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Developer Integrations Tab */}
        <TabsContent value="integrations">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-border p-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-lg">Integrações Oficiais (Desenvolvedor)</h3>
                <p className="text-sm text-muted-foreground mt-1">Configure as chaves e tokens para recursos avançados (Hashtags, Mapas, Música)</p>
              </div>
              {credsLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            </div>

            <div className="grid gap-6">
              {[
                { id: 'meta_ads', name: 'Meta Marketing & Ads API', icon: Check, color: "bg-[#1877F210]", textColor: "text-[#1877F2]" },
                { id: 'google_cloud', name: 'Google Cloud (Maps, YouTube, Ads)', icon: Globe, color: "bg-red-500/10", textColor: "text-red-500" },
                { id: 'spotify', name: 'Spotify Web API', icon: RefreshCw, color: "bg-[#1DB95410]", textColor: "text-[#1DB954]" },
                { id: 'giphy', name: 'Giphy SDK', icon: Info, color: "bg-purple-500/10", textColor: "text-purple-500" }
              ].map(devPlatform => {
                const fields = PLATFORM_CREDENTIAL_FIELDS[devPlatform.id] || [];
                const currentValues = formValues[devPlatform.id] || credentials[devPlatform.id] || {};
                const isSaving = saving === devPlatform.id;
                const hasCreds = hasCredentials(devPlatform.id);

                return (
                  <div key={devPlatform.id} className="space-y-4 p-4 rounded-xl border border-border bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", devPlatform.color)}>
                          <devPlatform.icon className={cn("w-4 h-4", devPlatform.textColor)} />
                        </div>
                        <h4 className="font-bold text-sm">{devPlatform.name}</h4>
                      </div>
                      {hasCreds && <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/30 bg-green-500/5">Configurado</Badge>}
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); saveCredentials(devPlatform.id, currentValues); }} className="grid gap-4">
                      <div className="grid gap-4">
                        {fields.map(field => {
                          const fieldId = `${devPlatform.id}-${field.key}`;
                          const isVisible = visibleFields[fieldId] || false;
                          const savedValue = credentials[devPlatform.id]?.[field.key];
                          const val = currentValues[field.key] || "";

                          return (
                            <div key={field.key} className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">{field.label}</label>
                              <div className="relative">
                                <Input
                                  type={field.masked && !isVisible ? "password" : "text"}
                                  value={val}
                                  onChange={(e) => updateFormField(devPlatform.id, field.key, e.target.value)}
                                  placeholder={field.placeholder || (savedValue ? maskValue(savedValue) : `Insira o ${field.label.toLowerCase()}`)}
                                  className={cn(
                                    "bg-background h-10 text-sm",
                                    devPlatform.id === 'google_cloud' && field.key === 'api_key' && val && !val.startsWith('AIza') && "border-red-500 ring-2 ring-red-500",
                                    devPlatform.id === 'google_cloud' && field.key === 'youtube_id' && val && (val.startsWith('UC') || (val && !val.endsWith('.apps.googleusercontent.com') && val.length > 5)) && "border-red-500 ring-2 ring-red-500"
                                  )}
                                  autoComplete={field.masked ? "new-password" : "off"}
                                />
                                {field.masked && (
                                  <button
                                    type="button"
                                    onClick={() => toggleFieldVisibility(fieldId)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                  >
                                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                              {devPlatform.id === 'google_cloud' && field.key === 'api_key' && val && !val.startsWith('AIza') && (
                                <div className="text-[10px] text-red-500 font-bold mt-1 p-2 bg-red-500/10 rounded-lg flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> 
                                  FORMATO INVÁLIDO: Chaves de API do Google devem começar com "AIza".
                                </div>
                              )}
                              {devPlatform.id === 'google_cloud' && field.key === 'youtube_id' && val && (val.startsWith('UC') || (val && !val.endsWith('.apps.googleusercontent.com') && val.length > 5)) && (
                                <div className="text-[10px] text-red-500 font-bold mt-1 p-2 bg-red-500/10 rounded-lg space-y-1">
                                  <p className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> 
                                    CLIENT ID INVÁLIDO
                                  </p>
                                  <p className="pl-4 font-normal">
                                    {val.startsWith('UC') 
                                      ? "Você inseriu um ID de CANAL. O Client ID deve terminar com '.apps.googleusercontent.com'." 
                                      : "O Client ID deve terminar exatamente com '.apps.googleusercontent.com'."}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          disabled={isSaving}
                          className="gap-2"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-dashed border-primary/20 flex flex-col items-center text-center gap-2">
              <Globe className="w-6 h-6 text-primary mb-2" />
              <p className="text-sm font-bold text-primary">Pronto para Integração Oficial</p>
              <p className="text-xs text-muted-foreground max-w-md">
                Ao salvar estas chaves, o sistema utilizará automaticamente as APIs oficiais para busca de hashtags, localizações e bibliotecas de música.
              </p>
            </div>
          </motion.div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-border p-6">
            <h3 className="font-display font-bold text-lg mb-6">Segurança</h3>
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <h4 className="font-medium mb-1">Autenticação</h4>
                <p className="text-sm text-muted-foreground">Gerenciada pelo sistema de autenticação do projeto.</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <h4 className="font-medium mb-1">Sessões ativas</h4>
                <p className="text-sm text-muted-foreground">Você está logado neste dispositivo.</p>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
