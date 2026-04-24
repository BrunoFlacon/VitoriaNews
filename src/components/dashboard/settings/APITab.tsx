import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, RefreshCw, ChevronUp, ChevronDown, X, Globe, 
  Unplug, Link2, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
  getBrandLogo
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
                         {config.id === 'telegram' ? (
                            <span className="font-bold text-slate-200">
                              {platformConnections.length > 0 ? platformConnections[0].page_name : "Bot Telegram"}
                            </span>
                         ) : (
                            <span className="font-bold text-slate-200">
                              {platformConnections.length > 0 ? platformConnections[0].page_name : "Conta Principal"}
                            </span>
                         )}
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
                    {/* Aqui entrariam os campos específicos de cada API */}
                    {/* Platform Specific Controls */}
                    {config.id === 'google_cloud' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border/40 pb-4">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Hub Central Google (Cloud & Marketing)</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-2 bg-background border-primary/20 hover:bg-primary/5 text-primary rounded-xl"
                            onClick={() => {
                              if (hasCreds) {
                                if (window.confirm("Deseja desconectar todas as APIs do Google?")) {
                                  deleteCredentials('google_cloud');
                                }
                              } else {
                                handleSaveCreds('google_cloud');
                              }
                            }}
                          >
                            {hasCreds ? <><Unplug className="w-3.5 h-3.5" /> Desconectar Tudo</> : <><Link2 className="w-3.5 h-3.5" /> Conectar</>}
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[
                            { name: 'Maps API', key: 'maps_api_key', desc: 'Geolocalização', syncFn: null },
                            { name: 'News API', key: 'news_api_key', desc: 'Google News', syncFn: 'radar-api' },
                            { name: 'YouTube API', key: 'youtube_api_key', desc: 'Vídeos/Canal', syncFn: 'collect-youtube-analytics' },
                            { name: 'Google Ads', key: 'ads_id', desc: 'Campanhas', syncFn: 'collect-meta-ads-analytics' },
                            { name: 'Analytics', key: 'analytics_id', desc: 'Métricas', syncFn: 'collect-google-analytics' },
                            { name: 'Search Console', key: 'search_console_id', desc: 'SEO', syncFn: 'collect-search-console-data' },
                          ].map(svc => {
                            const svcActive = !!credentials['google_cloud']?.[svc.key];
                            return (
                              <div key={svc.name} className={cn(
                                "p-3 rounded-xl border transition-all",
                                svcActive ? "border-green-500/20 bg-green-500/[0.03]" : "border-border/40 opacity-60"
                              )}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold">{svc.name}</span>
                                  <Badge variant={svcActive ? "default" : "outline"} className={cn("text-[9px] h-4", svcActive ? "bg-green-500/20 text-green-500 border-none" : "")}>
                                    {svcActive ? "Ativo" : "Off"}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-muted-foreground">{svc.desc}</span>
                                  {svcActive && svc.syncFn && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10"
                                      onClick={() => syncSocialStats('google_cloud')}
                                    >
                                      Sincronizar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/*  Connected Profiles List  */}
                    {hasConnections && (
                      <div className="space-y-4 pt-4 border-t border-border/20">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground/70" />
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/70">Contas Conectadas</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {platformConnections.map(conn => (
                            <div key={conn.id} className="flex items-center justify-between p-3 rounded-xl bg-background/30 border border-border/40 group/item hover:border-primary/30 transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
                                  {conn.page_name?.substring(0, 2).toUpperCase() || "U"}
                                </div>
                                <div>
                                  <p className="text-sm font-bold tracking-tight">{conn.page_name || conn.username || "Conta Conectada"}</p>
                                  <p className="text-[10px] text-muted-foreground opacity-60">ID: {conn.platform_user_id?.substring(0, 8)}...</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => syncSocialStats(config.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                              >
                                <RefreshCw className={cn("w-3.5 h-3.5", statsLoading && "animate-spin")} />
                              </Button>
                            </div>
                          ))}
                        </div>
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
  );
});

APITab.displayName = "APITab";
