import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, RefreshCw, ChevronUp, ChevronDown, X, Globe, 
  Unplug, Link2, Loader2, Plug, Save, FileText, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, getProxyUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { APIFields } from "./APIFields";
import { ConnectionCard } from "./ConnectionCard";
import { PLATFORM_CREDENTIAL_FIELDS } from "@/hooks/useApiCredentials";

interface APITabProps {
  UNIQUE_PLATFORM_CONFIGS: any[];
  activePlatformIds: string[];
  expandedPlatform: string | null;
  setExpandedPlatform: (id: string | null) => void;
  connections: any[];
  socialStats: any[];
  audienceBreakdown: any | null;
  statsLoading: boolean;
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
}

export const APITab = memo(({
  UNIQUE_PLATFORM_CONFIGS,
  activePlatformIds,
  expandedPlatform,
  setExpandedPlatform,
  connections,
  socialStats,
  audienceBreakdown,
  statsLoading,
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
  formValues
}: APITabProps) => {
  const toggleExpand = (id: string) => {
    setExpandedPlatform(expandedPlatform === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {UNIQUE_PLATFORM_CONFIGS.filter(c => activePlatformIds.includes(c.id)).map(config => {
        const isExpanded = expandedPlatform === config.id;
        const platformConnections = connections.filter(conn => conn.platform === config.id && conn.is_connected);
        const hasConnections = platformConnections.length > 0;
        const hasCreds = Object.values(credentials[config.id] || {}).some(v => !!v);
        const isActive = hasConnections || hasCreds;

        return (
          <div key={config.id} className={cn(
            "group rounded-2xl border transition-all duration-500 overflow-hidden",
            isExpanded ? "border-primary/30 shadow-2xl shadow-primary/5 bg-background/40" : "border-border/40 hover:border-primary/20 bg-muted/5"
          )}>
            {/* Header Clickable */}
            <div 
              onClick={() => toggleExpand(config.id)}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  {getBrandLogo(config.id, isActive)}
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-tight">{config.name}</h4>
                  {isActive ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          {(() => {
                            const conn = platformConnections[0];
                            if (!conn) return config.id === 'telegram' ? "Bot Telegram" : "Conta Principal";
                            const stats = socialStats.find(s => {
                              if (s.platform !== config.id) return false;
                              const s_pid = String(s.platform_user_id || "").toLowerCase();
                              const c_pid = String(conn.platform_user_id || "").toLowerCase();
                              return s_pid && c_pid && s_pid === c_pid;
                            });
                            return (
                              <span className="font-bold text-slate-200">
                                {stats?.username || conn.page_name || conn.username || (config.id === 'telegram' ? "Bot Telegram" : "Conta Conectada")}
                              </span>
                            );
                          })()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5 opacity-60">Configurações pendentes</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                <button
                  onClick={(e) => handleRemovePlatform(e, config.id)}
                  className="p-2 text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Panel */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 border-t border-border bg-background/50 space-y-6">
                    {/*  Connected Profiles List (MOVED TO TOP)  */}
                    {hasConnections && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground/70" />
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/70">Contas Conectadas</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => syncSocialStats(config.id)}
                            disabled={statsLoading}
                          >
                            <RefreshCw className={cn("w-3.5 h-3.5", statsLoading && "animate-spin")} />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {platformConnections.map(conn => {
                            const stats = socialStats.find(s => {
                              if (s.platform !== config.id) return false;
                              const s_pid = String(s.platform_user_id || "").toLowerCase();
                              const c_pid = String(conn.platform_user_id || "").toLowerCase();
                              const c_page = String(conn.page_id || "").toLowerCase();
                              const s_username = String(s.username || "").toLowerCase();
                              const c_username = String(conn.username || conn.page_name || "").toLowerCase();
                              
                              return (s_pid && c_pid && s_pid === c_pid) ||
                                     (s_pid && c_page && s_pid === c_page) ||
                                     (s_username && c_username && s_username === c_username) ||
                                     (s.id === conn.id);
                            });

                            const fbPictureFallback = (config.id === 'facebook' || config.id === 'instagram') ? `https://graph.facebook.com/${conn.page_id || conn.platform_user_id}/picture?type=large` : "";
                            const rawPhoto = stats?.profile_picture || conn.profile_image_url || conn.profile_picture || fbPictureFallback || "";
                            const isTwitter = String(rawPhoto || "").includes('twimg.com') || config.id === 'twitter';
                            const isGraphAPI = String(rawPhoto || "").includes('graph.facebook.com');
                            const isTikTok = String(rawPhoto || "").includes('tiktokcdn');
                            const isInstagram = String(rawPhoto || "").includes('cdninstagram.com') || config.id === 'instagram' || config.id === 'threads';
                            
                            const cacheBustedPhoto = (rawPhoto && !rawPhoto.includes('data:') && !isTwitter && !isGraphAPI && !isTikTok && !isInstagram)
                              ? `${rawPhoto}${rawPhoto.includes('?') ? '&' : '?'}v=${stats?.updated_at ? new Date(stats.updated_at).getTime() : Date.now()}`
                              : rawPhoto;
                            const displayPhoto = getProxyUrl(cacheBustedPhoto);
                            const displayName = stats?.username || conn.page_name || conn.username || (config.id === 'threads' ? "Threads Profile" : "Conta Conectada");

                            const individualChannels = (config.id === 'telegram' || config.id === 'whatsapp')
                               ? (audienceBreakdown?.flatMap(b => b.channels) || []).filter(ch => {
                                   if (ch.platform !== config.id) return false;
                                   const chId = String(ch.channel_id || ch.id || "").toLowerCase();
                                   const connId = String(conn.platform_user_id || conn.page_id || conn.id || "").toLowerCase();
                                   const chName = String(ch.channel_name || "").toLowerCase();
                                   const connName = String(conn.page_name || conn.username || "").toLowerCase();
                                   return (chId && connId && (chId.includes(connId) || connId.includes(chId))) || 
                                          (chName && connName && (chName.includes(connName) || connName.includes(chName)));
                                 })
                               : [];

                             const individualMembers = individualChannels.length > 0
                               ? individualChannels.reduce((sum, ch) => sum + (ch.members_count || 0), 0)
                               : 0;

                             const displayFollowers = (config.id === 'telegram' || config.id === 'whatsapp')
                               ? (individualMembers || Math.max(Number(conn.followers_count || 0), Number(stats?.followers_count || 0)))
                               : Math.max(Number(stats?.followers_count || 0), Number(conn.followers_count || 0));

                             const waMetadata = (stats?.metadata as any) || {};
                             const displayPosts = config.id === 'whatsapp'
                               ? Number(conn.posts_count || waMetadata.official_posts_count || stats?.posts_count || 0)
                               : (config.id === 'youtube')
                                 ? Number(stats?.posts_count || stats?.metadata?.video_count || 0)
                                 : (config.id === 'threads')
                                   ? Math.max(Number(stats?.posts_count || 0), Number(conn.posts_count || 0))
                                   : Math.max(Number(stats?.posts_count || 0), Number((conn.metadata as any)?.posts_count || conn.posts_count || 0));

                            return (
                              <ConnectionCard
                                key={conn.id}
                                conn={conn}
                                config={config}
                                stats={stats}
                                isEffectivelyConnected={conn.is_connected || !!stats}
                                metaAdsProfile={null}
                                displayPhoto={displayPhoto}
                                displayName={displayName}
                                displayFollowers={displayFollowers}
                                displayPosts={displayPosts}
                                waMetadata={waMetadata}
                                botPosts={Number(waMetadata.bot_posts_count || 0)}
                                botAnswers={Number(waMetadata.bot_answers_count || 0)}
                                localBotActive={null}
                                handleDisconnectCustom={() => deleteCredentials(config.id)}
                                handleToggleBot={() => {}}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* API Fields Section */}
                    <div className="space-y-4 pt-4 border-t border-border/20">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">Configuração da API</p>
                        <div className="flex items-center gap-2">
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="h-8 text-xs gap-1.5"
                             onClick={() => deleteCredentials(config.id)}
                             disabled={!hasCreds}
                           >
                             <X className="w-3.5 h-3.5 text-destructive" /> Limpar
                           </Button>
                           <Button 
                             size="sm" 
                             className="h-8 text-xs gap-1.5"
                             onClick={() => handleSaveCreds(config.id)}
                           >
                             <Save className="w-3.5 h-3.5" /> Salvar
                           </Button>
                        </div>
                      </div>

                      <APIFields 
                        config={config}
                        credentials={credentials}
                        fields={PLATFORM_CREDENTIAL_FIELDS[config.id] || []}
                        updateFormField={updateFormField}
                        formValues={formValues}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
});

APITab.displayName = "APITab";
