import { memo, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, RefreshCw, ChevronUp, ChevronDown, X, Globe, 
  Unplug, Link2, Loader2, Plug, Save, FileText, MessageSquare,
  Key, Eye, EyeOff, Target, Phone, Check, Plus, Trash2, Star, Webhook, Tag, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn, getProxyUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PlatformIconBadge } from "@/components/icons/PlatformIconBadge";
import { GoogleIcon, FacebookIcon, MetaIcon, NewsapiIcon, MapsIcon, YoutubeIcon, AnalyticsIcon, PeopleIcon, GoogleNewsIcon, AdsIcon } from "@/components/icons/SocialIcons";

import { PLATFORM_CREDENTIAL_FIELDS } from "@/hooks/useApiCredentials";
import { WebhookStatusBadge } from "./WebhookStatusBadge";
import { WhatsAppMetricsDashboard } from "@/components/dashboard/analytics/WhatsAppMetricsDashboard";
import { WhatsAppPhotoUpload } from "./WhatsAppPhotoUpload";

interface APITabProps {
  UNIQUE_PLATFORM_CONFIGS: any[];
  activePlatformIds: string[];
  expandedPlatform: string | null;
  toggleExpand: (id: string) => void;
  connections: any[];
  socialStats: any[];
  audienceBreakdown: any | null;
  statsLoading: boolean;
  manualSyncLoading: boolean;
  syncSocialStats: (platformId?: string) => void;
  handleRemovePlatform: (e: React.MouseEvent, id: string) => void;
  credentials: Record<string, any>;
  deleteCredentials: (id: string) => void;
  handleSaveCreds: (id: string) => void;
  saveCredentials: (id: string, creds: any) => void;
  toast: any;
  refreshStats: () => void;
  getBrandLogo: (id: string, isActive: boolean) => React.ReactNode;
  updateFormField: (platform: string, key: string, value: string) => void;
  formValues: Record<string, Record<string, string>>;
  connectingPlatform: string | null;
  handleConnectApi: (platform: string) => void;
  visibleFields: Record<string, boolean>;
  toggleFieldVisibility: (fieldKey: string) => void;
  hasCredentials: (id: string) => boolean;
  maskValue: (value: string) => string;
  systemSettings: any;
  updateSettingsOptimistic: (updates: any) => void;
  localBotActive: boolean | null;
  handleToggleBot: (active: boolean) => void;
  handleDisconnectCustom: (platformId: string, connectionId: string) => void;
  user: any;
  saving?: string | null;
  handleDeleteCreds?: (id: string) => void;
  onSetPrimary?: (connectionId: string) => void;
  messageDeliveryStats?: any;
}

export const APITab = memo(({
  UNIQUE_PLATFORM_CONFIGS,
  activePlatformIds,
  expandedPlatform,
  toggleExpand,
  connections,
  socialStats,
  audienceBreakdown,
  statsLoading,
  manualSyncLoading,
  syncSocialStats,
  handleRemovePlatform,
  credentials,
  deleteCredentials,
  handleSaveCreds,
  saveCredentials,
  toast,
  refreshStats,
  getBrandLogo,
  updateFormField,
  formValues,
  connectingPlatform,
  handleConnectApi,
  visibleFields,
  toggleFieldVisibility,
  hasCredentials,
  maskValue,
  systemSettings,
  updateSettingsOptimistic,
  localBotActive,
  handleToggleBot,
  handleDisconnectCustom,
  user,
  saving,
  handleDeleteCreds = (id) => { deleteCredentials(id); },
  onSetPrimary,
  messageDeliveryStats
}: APITabProps) => {
  // toggleExpand is now received from parent to initialize formValues
  
  const [pixelList, updatePixels] = useState<string[]>(['']);

  // Auto-repair AI config if api_key is missing but openrouter_api_key exists
  // This is crucial because the current live Edge Function only looks at 'api_key'
  useEffect(() => {
    const aiCreds = credentials?.['ai_config'];
    const needsKeySync = aiCreds && aiCreds.openrouter_api_key && !aiCreds.api_key;
    const needsUrlSync = aiCreds && aiCreds.provider === 'openrouter' && !aiCreds.base_url;
    const needsProviderSync = aiCreds && aiCreds.openrouter_api_key && !aiCreds.provider;
    const needsModelSync = aiCreds && aiCreds.provider === 'openrouter' && !aiCreds.openrouter_model;

    if (needsKeySync || needsUrlSync || needsProviderSync || needsModelSync) {
      console.log("Auto-repairing AI config: syncing keys, model, provider and base_url for legacy support...");
      const updated = { ...aiCreds };
      if (needsKeySync) updated.api_key = aiCreds.openrouter_api_key;
      if (needsUrlSync) updated.base_url = 'https://openrouter.ai/api/v1';
      if (needsProviderSync) updated.provider = 'openrouter';
      if (needsModelSync) {
        updated.openrouter_model = 'google/gemini-2.0-flash-001';
        updated.text_model = 'google/gemini-2.0-flash-001';
      }
      
      saveCredentials('ai_config', updated);
    }
  }, [credentials, saveCredentials]);

  return (
      {/* Hidden username field for browser accessibility / password manager compliance */}
      <input type="text" name="username" value={user?.email || ""} readOnly autoComplete="username" className="hidden" aria-hidden="true" />
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

                            {/* Webhook status badge inline */}
                            {["facebook","instagram","threads","whatsapp","telegram","twitter","tiktok","linkedin","meta_ads"].includes(config.id) && (
                              <WebhookStatusBadge platform={config.id === "meta_ads" || config.id === "threads" ? "meta" : config.id} userId={user?.id} compact platformLabel={config.id === "threads" ? "Threads" : undefined} />
                            )}

                            {/* Credenciais Salvas (grey): has creds but not yet verified */}
                            {!isEffectivelyConnected && hasCreds && (() => {
                              let label = "Credenciais Salvas";
                              if (config.id === 'google_cloud') {
                                const googleCreds = credentials['google_cloud'] || {};
                                const serviceKeys = ['maps_api_key', 'news_api_key', 'analytics_id', 'gtag_id', 'search_console_id', 'people_api_key', 'ads_id'];
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
                                {(() => {
                                  const hasOAuth = connections.some(c => (c.platform === 'google' || c.platform === 'youtube') && c.is_connected);
                                  return !hasOAuth ? (
                                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-2">
                                      <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                                      <p className="text-xs text-yellow-300/90">
                                        GA4, Search Console e YouTube precisam de conta Google conectada via OAuth. 
                                        <button onClick={() => handleConnectApi('google')} className="ml-1 text-yellow-200 underline hover:text-yellow-100 font-medium">
                                          Conectar Google →
                                        </button>
                                      </p>
                                    </div>
                                  ) : null;
                                })()}
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
                                      { name: 'Maps API', key: 'maps_api_key', desc: 'Mapas e Geolocalização', icon: MapsIcon, syncFn: 'validate-maps-key' },
                                     { name: 'News API', key: 'news_api_key', desc: 'Google News Discovery', icon: GoogleNewsIcon, syncFn: 'radar-api', action: 'intelligence' },
                                     { name: 'Analytics', key: 'analytics_id', desc: 'Dados e Métricas', icon: AnalyticsIcon, syncFn: 'collect-google-analytics' },
                                     { name: 'Pixel ID', key: 'gtag_id', desc: 'G-TAG e Rastreio', icon: Tag, syncFn: 'validate-gtag' },
                                     { name: 'Search Console', key: 'search_console_id', desc: 'SEO e Buscas', icon: GoogleIcon, syncFn: 'collect-search-console-data' },
                                     { name: 'People API', key: 'people_api_key', desc: 'Sincronização de Contatos', icon: PeopleIcon, syncFn: 'sync-google-contacts' },
                                      { name: 'Google Ads', key: 'ads_id', desc: 'Campanhas e Anúncios', icon: AdsIcon, syncFn: 'collect-google-ads' },
                                     { name: 'Google Workspace', key: 'oauth', desc: 'OAuth Client', icon: GoogleIcon, syncFn: 'validate-google-oauth', isOAuth: true },
                                   ].map(svc => {
                                    const isOAuth = svc.isOAuth;
                                    const hasOAuth = connections.some(c => (c.platform === 'google' || c.platform === 'youtube') && c.is_connected);
                                    const needsOAuth = ['analytics_id', 'search_console_id', 'ads_id'].includes(svc.key);
                                    const hasCred = !!credentials['google_cloud']?.[svc.key];
                                    const isActive = isOAuth
                                      ? hasOAuth
                                      : svc.key === 'people_api_key'
                                        ? hasCred || hasOAuth
                                        : needsOAuth
                                          ? hasCred && hasOAuth
                                          : hasCred;
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
                                            {needsOAuth && !hasOAuth && hasCred
                                              ? <Badge variant="outline" className="h-5 px-1.5 border-yellow-500/30 text-yellow-500/70 text-[9px] font-bold tracking-tighter uppercase">Precisa OAuth</Badge>
                                              : isActive
                                                ? <Badge className="h-5 px-1.5 bg-green-500/20 text-green-400 border-green-500/20 text-[9px] font-black tracking-tighter uppercase">Ativo</Badge>
                                                : <Badge variant="outline" className="h-5 px-1.5 border-muted-foreground/20 text-muted-foreground/40 text-[9px] font-bold tracking-tighter uppercase">Off</Badge>}
                                          </div>
                                          
                                          <div className="flex items-center gap-1">
{/* Sync button (only when active) */}
                                            {isActive && svc.syncFn && (
                                              // Check if People API sync should be allowed (needs Google OAuth or People API key)
                                              svc.syncFn === 'sync-google-contacts' &&
                                              !connections.some(c => (c.platform === 'google' || c.platform === 'youtube') && c.is_connected) &&
                                              !credentials['google_cloud']?.people_api_key
                                                ? (
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg text-muted-foreground hover:text-muted-foreground/50 hover:bg-muted-foreground/10 transition-all cursor-not-allowed"
                                                    disabled
                                                    title="Conecte sua Conta Google/YouTube ou adicione People API Key"
                                                  >
                                                    <RefreshCw className="w-3 h-3 mr-1" />
                                                    Sincronizar
                                                  </Button>
                                                )
                                                : (
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
                                                        
                                                        if (svc.syncFn === 'validate-maps-key') {
                                                          const apiKey = formValues['google_cloud']?.maps_api_key || credentials['google_cloud']?.maps_api_key;
                                                          if (!apiKey) throw new Error('Maps API Key não configurada. Digite no campo abaixo e clique "Salvar Configuração" primeiro.');
                                                          try {
                                                            const testRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${apiKey}`);
                                                            const testData = await testRes.json();
                                                            if (testData.status === 'REQUEST_DENIED') {
                                                              toast({ title: 'Maps Key salva, Geocoding API desativada', description: 'Mapas funcionam, mas geolocalização precisa ativar Geocoding API + billing em console.cloud.google.com', variant: 'default' });
                                                            } else {
                                                              toast({ title: 'Maps API OK!', description: `Status: ${testData.status}` });
                                                            }
                                                          } catch (fetchErr: any) {
                                                            if (fetchErr.message?.includes('CSP') || fetchErr.message?.includes('Content Security Policy') || fetchErr.name === 'TypeError') {
                                                              toast({ title: 'Validação offline', description: 'Key salva. A validação online será feita no deploy.', variant: 'default' });
                                                            } else {
                                                              throw fetchErr;
                                                            }
                                                          }
                                                          refreshStats();
                                                          return;
                                                        }

                                                        if (syncResult?.data?.error) {
                                                          throw new Error(syncResult.data.error);
                                                        }
                                                        if (syncResult?.data?.status === 'skipped') {
                                                          const msg = syncResult?.data?.message || 'Sem dados para sincronizar';
                                                          toast({ title: `${svc.name} ignorado`, description: msg, variant: msg.includes('OAuth') ? 'destructive' : 'default' });
                                                        } else {
                                                          toast({ title: `${svc.name} Sincronizado!`, description: "Dados atualizados com sucesso." });
                                                        }
                                                        refreshStats();
                                                      } catch (err: any) {
                                                        toast({ title: "Erro na sincronização", description: err?.message || "Tente novamente.", variant: "destructive" });
                                                      }
                                                    }}
                                                  >
                                                    <RefreshCw className="w-3 h-3 mr-1" />
                                                    Sincronizar
                                                  </Button>
                                                )
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
                                                  if (isOAuth) {
                                                    handleDisconnectCustom('google', 'all');
                                                  } else {
                                                    const newCreds = { ...credentials['google_cloud'] };
                                                    delete newCreds[svc.key];
                                                    saveCredentials('google_cloud', newCreds);
                                                  }
                                                } else {
                                                  if (isOAuth) {
                                                    handleConnectApi('google');
                                                  } else {
                                                    const fieldId = `google_cloud-${svc.key}`;
                                                    const input = document.getElementById(fieldId);
                                                    if (input) {
                                                      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                      setTimeout(() => input.focus(), 500);
                                                    }
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
                                    disabled={statsLoading || manualSyncLoading}
                                    className="h-8 gap-2 text-[10px] font-bold uppercase bg-background border-border/50 hover:bg-muted/50 rounded-lg px-4"
                                  >
                                    <RefreshCw className={cn("w-3.5 h-3.5", (statsLoading || manualSyncLoading) && "animate-spin")} />
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
                                          (conn.page_id && s.platform_user_id === conn.page_id) ||
                                          (conn.platform_user_id && s.platform_user_id === conn.platform_user_id)
                                        )
                                      );

                                    // Special case for Meta Ads: Show profile of related FB/IG account
                                    const metaAdsProfile = config.id === 'meta_ads'
                                      ? connections.find(c => (c.platform === 'facebook' || c.platform === 'instagram') && c.is_connected)
                                      : null;

                                    const displayPhoto = stats?.profile_picture || conn.profile_image_url || conn.profile_picture || "";
                                    // Use page_name from connection as primary display name (most accurate for WA)
                                    const displayName = conn.page_name || stats?.username || conn.username || "Conta Conectada";

                                    // For Telegram/WhatsApp: sum ONLY channels matching THIS platform strictly
                                    const totalPlatformMembers = (config.id === 'telegram' || config.id === 'whatsapp')
                                      ? (audienceBreakdown?.flatMap(b => b.channels) || [])
                                        .filter(ch => ch.platform === config.id)
                                        .reduce((sum, ch) => sum + (ch.members_count || 0), 0)
                                      : 0;

                                    // WhatsApp metrics are independent from Facebook — use only WA-native data
                                    const displayFollowers = (config.id === 'telegram' || config.id === 'whatsapp')
                                      ? (totalPlatformMembers || Number(stats?.followers_count ?? 0))
                                      : Number(stats?.followers_count ?? conn.followers_count ?? 0);

                                    // Statistics for WhatsApp (Bot messages sent / posts via bot)
                                    const waMetadata = (stats?.metadata as any) || {};
                                    const displayPosts = config.id === 'whatsapp'
                                      ? Number(waMetadata.official_posts_count ?? waMetadata.bot_posts_count ?? stats?.posts_count ?? conn.posts_count ?? 0)
                                      : (config.id === 'youtube')
                                        ? Number(stats?.posts_count ?? stats?.metadata?.video_count ?? 0)
                                        : Number(stats?.posts_count ?? conn.posts_count ?? 0);

                                    return (
                                      <div key={conn.id} className="space-y-4">
                                        {/* Main Account Card (Official) */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-[#0a0b14]/60 p-5 rounded-[22px] border border-white/5 shadow-2xl transition-all hover:bg-[#111322] group">
                                          <div className="flex items-center gap-6 flex-1 min-w-0">
                                            <div className="relative">
                                              <Avatar className="w-16 h-16 rounded-2xl border-[3px] border-[#151726] shadow-xl flex-shrink-0 transition-transform group-hover:scale-105">
                                                <AvatarImage 
                                                  src={getProxyUrl(metaAdsProfile?.profile_image_url) || getProxyUrl(displayPhoto)} 
                                                  alt={displayName} 
                                                  className="object-cover" 
                                                />
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
                                                {conn.is_primary && (
                                                  <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[9px] font-black uppercase tracking-tighter">Padrão</Badge>
                                                )}
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
                                                    <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{displayFollowers.toLocaleString('pt-BR')}</span>
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
                                                    <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{displayPosts.toLocaleString('pt-BR', { minimumIntegerDigits: 2 })}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0 shrink-0">
                                            {onSetPrimary && !conn.is_primary && (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="bg-slate-900 border-border/30 text-slate-300 font-black uppercase tracking-[0.15em] text-[9px] h-11 px-6 hover:text-yellow-400 hover:bg-slate-900 focus:ring-0 active:scale-95 transition-all rounded-xl"
                                                onClick={(e) => { e.stopPropagation(); onSetPrimary(conn.id); }}
                                              >
                                                <Star className="w-4 h-4 mr-2" />
                                                Definir como Padrão
                                              </Button>
                                            )}
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="bg-slate-900 border-border/30 text-slate-300 font-black uppercase tracking-[0.15em] text-[9px] h-11 px-6 hover:text-red-400 hover:bg-slate-900 focus:ring-0 active:scale-95 transition-all rounded-xl"
                                              onClick={() => handleDisconnectCustom(config.id, conn.id || 'all')}
                                            >
                                              <Unplug className="w-4 h-4 mr-2" />
                                              Desconectar
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Robot Profile Card (Specific for WhatsApp) - MOVED OUTSIDE THE LOOP */}
                                  {config.id === 'whatsapp' && (() => {
                                    const whatsappStats = socialStats.find(s => s.platform === 'whatsapp');
                                    const waMetadata = (whatsappStats?.metadata as any) || {};
                                    // Fallback: sum posts_count from WhatsApp connections when social_accounts is missing data
                                    const connPostTotal = platformConnections.reduce((sum, c) => sum + (Number(c.posts_count) || 0), 0);
                                    const botPosts = Number(waMetadata.bot_posts_count ?? connPostTotal ?? 0);
                                    const botAnswers = Number(waMetadata.bot_answers_count ?? 0);
                                    const isBotOn = localBotActive !== null ? localBotActive : waMetadata.is_active === true;
                                    
                                    return (
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-green-500/5 p-5 rounded-[22px] border border-green-500/10 shadow-xl transition-all hover:bg-green-500/10 group animate-in fade-in slide-in-from-top-2 mt-4">
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
                                              <Badge className={cn(
                                                "text-[8px] font-black uppercase tracking-tighter",
                                                isBotOn ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-red-500/20 text-red-500 border-red-500/30"
                                              )}>
                                                {isBotOn ? "Ativo" : "Pausado"}
                                              </Badge>
                                            </div>

                                            <div className="flex items-center gap-10">
                                              {/* Posts do Bot */}
                                              <div className="flex flex-col gap-0.5">
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                                                  Posts do Bot
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <FileText className="w-4 h-4 text-green-500/80" />
                                                  <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{botPosts.toLocaleString('pt-BR', { minimumIntegerDigits: 2 })}</span>
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
                                                  <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{botAnswers.toLocaleString('pt-BR', { minimumIntegerDigits: 2 })}</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex flex-col gap-2 items-center justify-center p-2 bg-[#151726]/40 rounded-2xl border border-white/5 min-w-[100px]">
                                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{isBotOn ? 'LIGADO' : 'DESLIGADO'}</span>
                                          <Switch
                                            checked={isBotOn}
                                            onCheckedChange={(checked) => handleToggleBot(checked)}
                                            className="data-[state=checked]:bg-green-500"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* WhatsApp Photo Upload */}
                                  {config.id === 'whatsapp' && platformConnections.length > 0 && (
                                    <div className="px-1 pt-2">
                                      <WhatsAppPhotoUpload
                                        connectionId={platformConnections[0].id}
                                        currentPhoto={platformConnections[0].profile_image_url}
                                        onPhotoUpdated={() => refreshStats()}
                                      />
                                    </div>
                                  )}

                                  {/* WhatsApp Metrics */}
                                  {config.id === 'whatsapp' && (
                                    <div className="pt-4">
                                      <WhatsAppMetricsDashboard />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/*  Credential fields and Actions  */}
                            <div className="space-y-6">
                              {fields.length > 0 && (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 px-1">
                                    <Key className="w-4 h-4 text-muted-foreground/60" />
                                    <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/70">Configuração da API</p>
                                    <Badge variant="outline" className="ml-2 h-5 text-[8px] border-white/10 text-white/40 bg-white/5">
                                      v2.5.4-stable
                                    </Badge>
                                    {config.id === 'ai_config' && credentials['ai_config']?.api_key && (
                                      <Badge variant="outline" className="ml-2 h-5 text-[8px] border-purple-500/30 text-purple-400 bg-purple-500/5">
                                        Legacy Bridge: Sincronizado
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="grid gap-3">
                                    {fields.map((field) => {
                                      const fieldId = `${config.id}-${field.key}`;
                                      const isVisible = visibleFields[fieldId] ?? false;
                                      const savedValue = credentials[config.id]?.[field.key];
                                      const val = formValues[config.id]?.[field.key] ?? credentials[config.id]?.[field.key] ?? "";

                                      return (
                                        <div key={field.key} className="space-y-1.5">
                                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                            {field.label.includes("TOKEN") && config.id === 'telegram' ? "BOT TOKEN (@BOTFATHER)" : field.label}
                                          </label>
                                          <div className="relative">
                                            <Input
                                              type={isVisible ? "text" : "password"}
                                              value={val}
                                              onChange={(e) => updateFormField(config.id, field.key, e.target.value)}
                                              placeholder={field.placeholder || (savedValue ? maskValue(savedValue) : `${field.label}`)}
                                              className={cn(
                                                "bg-muted/50 h-10 text-sm pr-10",
                                                config.id === 'youtube' && field.key === 'client_id' && (val.startsWith('UC') || (val && !val.endsWith('.apps.googleusercontent.com') && val.length > 5)) && "border-red-500 ring-2 ring-red-500",
                                                config.id === 'threads' && field.key === 'app_id' && val && !/^\d+$/.test(val) && "border-red-500 ring-2 ring-red-500"
                                              )}
                                              autoComplete={field.masked ? "new-password" : "off"}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => toggleFieldVisibility(fieldId)}
                                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
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
                                                <AvatarImage 
                                                  src={getProxyUrl(fbConn?.profile_image_url)} 
                                                />
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
                                                  <span className="text-xs font-mono font-bold text-green-500">—</span>
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
                                  type="button"
                                  size="sm"
                                  onClick={(e) => { e.preventDefault(); handleSaveCreds(config.id); }}
                                  disabled={saving === config.id}
                                  className="bg-gradient-to-r from-primary to-accent"
                                >
                                  {saving === config.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                  {hasCreds ? "Atualizar Credenciais" : "Salvar Configuração"}
                                </Button>

                                {config.id === 'ai_config' && hasCreds && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      const creds = credentials['ai_config'] || {};
                                      const key = creds.openrouter_api_key || creds.api_key;
                                      if (!key) {
                                        toast({ title: "Nenhuma chave encontrada", description: "Adicione sua OpenRouter API Key primeiro.", variant: "destructive" });
                                        return;
                                      }
                                      toast({ title: "Testando conexão...", description: "Verificando sua chave no OpenRouter." });
                                      try {
                                        const res = await fetch("https://openrouter.ai/api/v1/models", {
                                          headers: { Authorization: `Bearer ${key.trim()}` }
                                        });
                                        if (res.ok) {
                                          toast({ title: "✅ Conexão OK!", description: "Sua chave OpenRouter é válida e está funcionando." });
                                        } else {
                                          const err = await res.json().catch(() => ({}));
                                          toast({ 
                                            title: `❌ Chave Inválida (${res.status})`, 
                                            description: err?.error?.message || "Verifique se a chave está correta e com créditos disponíveis no openrouter.ai", 
                                            variant: "destructive" 
                                          });
                                        }
                                      } catch (err: any) {
                                        toast({ title: "Erro de rede", description: err?.message || "Não foi possível alcançar o OpenRouter.", variant: "destructive" });
                                      }
                                    }}
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                    Testar Chave
                                  </Button>
                                )}

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
                                    type="button"
                                    size="sm"
                                    onClick={(e) => { e.preventDefault(); handleSaveCreds(config.id); }}
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
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                );
              })}
            

    </form>
  );
});

APITab.displayName = "APITab";
