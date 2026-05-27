import { useState, useCallback, useMemo, memo } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Share2, CheckCircle2, AlertCircle, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useSocialStats } from "@/hooks/useSocialStats";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { SocialNetworkCard } from "./SocialNetworkCard";
import { cn, getProxyUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { safeInvoke } from "@/utils/supabase-utils";
import { useAuth } from "@/contexts/AuthContext";

// Only show social platforms (not dev tools like google, meta_ads, newsapi)
const SOCIAL_PLATFORM_IDS = socialPlatforms
  .filter((p) => p.type === "social")
  .map((p) => p.id);

export const SocialNetworksView = memo(() => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { connections, loading, initiateOAuth, disconnect, setPrimary, refetch } = useSocialConnections();
  const { stats, refresh: refreshStats } = useSocialStats();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});

  // Count connected platforms
  const connectedCount = useMemo(
    () => connections.filter((c) => c.is_connected).length,
    [connections]
  );

  // Group connections by platform for multi-account support
  const accountsByPlatform = useMemo(() => {
    const map: Record<string, typeof connections> = {};
    for (const conn of connections) {
      if (!map[conn.platform]) map[conn.platform] = [];
      map[conn.platform].push(conn);
    }
    return map;
  }, [connections]);

  const isConnected = useCallback(
    (platformId: string) =>
      connections.some((c) => c.platform === platformId && c.is_connected),
    [connections]
  );

          const getPageName = useCallback(
            (platformId: string) => {
              const conn = connections.find((c) => c.platform === platformId && c.is_connected);
              const relatedStats = stats.find(s => s.platform === platformId);
              return relatedStats?.username || conn?.page_name || conn?.username || (platformId === 'threads' ? "Threads Profile" : null);
            },
            [connections, stats]
          );

  const handleConnect = async (platformId: string) => {
    setConnectingPlatform(platformId);
    try {
      await initiateOAuth(platformId);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    const conn = connections.find((c) => c.platform === platformId && c.is_connected);
    if (!conn) return;
    await disconnect(`${platformId}|${conn.id}`);
  };

  const handleSyncAll = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      await safeInvoke("collect-social-analytics", {
        body: { userId: session.user.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
        timeoutMs: 30000,
      });
      await refreshStats();
      await refetch();
      toast({ title: "Sincronizado!", description: "Métricas atualizadas com sucesso." });
    } catch (e: any) {
      const msg = e?.message || "";
      if (!msg.includes("fetch") && !msg.includes("CORS")) {
        toast({ title: "Aviso", description: msg || "Erro na sincronização.", variant: "destructive" });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Stats summary per platform
  const getStats = useCallback(
    (platformId: string) => stats.find((s) => s.platform === platformId),
    [stats]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl mb-0.5 md:mb-1 flex items-center gap-2">
            <Share2 className="w-7 h-7 text-primary" />
            Redes Sociais
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as conexões com suas redes sociais e sincronize os dados
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection summary badge */}
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 px-3 py-1 text-sm font-semibold border",
              connectedCount > 0
                ? "border-green-500/40 text-green-500 bg-green-500/5"
                : "border-muted text-muted-foreground"
            )}
          >
            {connectedCount > 0 ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {connectedCount} conectada{connectedCount !== 1 ? "s" : ""}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={isSyncing || connectedCount === 0}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            Sincronizar Tudo
          </Button>
        </div>
      </motion.div>

      {/* Empty state if no platforms exist */}
      {!loading && connectedCount === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <PlusCircle className="w-8 h-8 text-primary/50" />
          </div>
          <p className="font-semibold text-foreground">Nenhuma rede conectada</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Conecte suas redes sociais abaixo para começar a publicar e monitorar suas métricas em um só lugar.
          </p>
        </motion.div>
      )}

      {/* Platform grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {SOCIAL_PLATFORM_IDS.map((platformId, i) => {
          const platform = socialPlatforms.find((p) => p.id === platformId);
          if (!platform) return null;

           const platformAccounts = (accountsByPlatform[platformId] || []).map((conn) => {
             const accountStats = stats.find(s => {
               if (s.platform !== platformId) return false;
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
 
             // Use media proxy for profile images to handle expiration
             const rawPhoto = accountStats?.profile_picture || conn.profile_image_url || conn.profile_picture || "";
             const displayPhoto = getProxyUrl(rawPhoto);
 
             return {
                id: conn.id,
                page_name: accountStats?.username || conn.page_name || conn.username,
                platform_user_id: conn.platform_user_id,
                profile_image_url: displayPhoto,
                followers_count: Math.max(Number(accountStats?.followers_count || 0), Number(conn.followers_count || 0)),
                posts_count: Math.max(Number(accountStats?.posts_count || 0), Number(conn.posts_count || 0)),
                page_id: conn.page_id,
                username: accountStats?.username || conn.username,
                token_expires_at: conn.token_expires_at,
                isExpiringSoon: conn.isExpiringSoon,
                daysUntilExpiry: conn.daysUntilExpiry,
                is_primary: conn.is_primary,
              };
           });

          return (
            <SocialNetworkCard
              key={platformId}
              platform={platform as any}
              isConnected={isConnected(platformId)}
              isConnecting={connectingPlatform === platformId}
              pageName={getPageName(platformId)}
              onConnect={() => handleConnect(platformId)}
              onDisconnect={() => handleDisconnect(platformId)}
              delay={i * 0.04}
              accounts={platformAccounts}
              selectedAccountId={selectedAccounts[platformId] || null}
              onSelectAccount={(account) =>
                setSelectedAccounts((prev) => ({ ...prev, [platformId]: account.id }))
              }
              onSetPrimary={setPrimary}
            />
          );
        })}
      </div>

      {/* Hint footer */}
      <p className="text-[11px] text-muted-foreground/50 text-center pt-2">
        Clique em um card para conectar ou desconectar. Use ⚙️ para alternar entre múltiplos perfis da mesma plataforma.
      </p>
    </div>
  );
});

SocialNetworksView.displayName = "SocialNetworksView";

export default SocialNetworksView;
