import React, { useState, useEffect, useCallback } from "react";
import { Users, FileText, Check, Unplug, MessageSquare, AlertTriangle, RefreshCw } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn, getProxyUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConnectionCardProps {
  conn: any;
  config: any;
  stats: any;
  isEffectivelyConnected: boolean;
  metaAdsProfile: any;
  displayPhoto: string;
  displayName: string;
  displayFollowers: number;
  displayPosts: number;
  waMetadata: any;
  botPosts: number;
  botAnswers: number;
  localBotActive: boolean | null;
  isExpiringSoon?: boolean;
  daysUntilExpiry?: number | null;
  onRenew?: () => void;
  handleDisconnectCustom: (platformId: string, connectionId: string) => void;
  handleToggleBot: (active: boolean) => void;
}

export const ConnectionCard = ({
  conn,
  config,
  stats,
  isEffectivelyConnected,
  metaAdsProfile,
  displayPhoto,
  displayName,
  displayFollowers,
  displayPosts,
  waMetadata,
  botPosts,
  botAnswers,
  localBotActive,
  isExpiringSoon,
  daysUntilExpiry,
  onRenew,
  handleDisconnectCustom,
  handleToggleBot
}: ConnectionCardProps) => {
  const { toast } = useToast();
  const [renewing, setRenewing] = useState(false);
  const isBotOn = localBotActive !== null ? localBotActive : waMetadata?.is_active === true;

  const handleRenewToken = useCallback(async () => {
    if (onRenew) {
      onRenew();
      return;
    }
    setRenewing(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session?.data?.session?.access_token;
      if (!accessToken) throw new Error("No session");

      const { error } = await supabase.functions.invoke('refresh-social-token', {
        body: { platform: config.id, connectionId: conn.id },
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (error) throw error;
      toast({ title: "Token renovado!", description: `Token ${config.name} renovado com sucesso.` });
    } catch (err: any) {
      toast({
        title: "Erro ao renovar",
        description: err.message || "Falha ao renovar token. Reconecte a conta.",
        variant: "destructive"
      });
    } finally {
      setRenewing(false);
    }
  }, [config.id, config.name, conn.id, onRenew, toast]);

  const expiryLabel = daysUntilExpiry != null && daysUntilExpiry < 0
    ? "Expirado"
    : daysUntilExpiry != null && daysUntilExpiry <= 1
      ? "Expira hoje"
      : daysUntilExpiry != null
        ? `${daysUntilExpiry} dias`
        : null;

  // Build ordered list of candidate image URLs to try
  const proxyUrl = getProxyUrl(metaAdsProfile?.profile_image_url) || getProxyUrl(displayPhoto) || "";
  const directUrl = metaAdsProfile?.profile_image_url || displayPhoto || "";

  const [imgSrc, setImgSrc] = useState<string>(proxyUrl || directUrl);
  const [imgAttempt, setImgAttempt] = useState(0);

  // Reset when displayPhoto or metaAdsProfile changes (e.g. after sync)
  useEffect(() => {
    const freshProxy = getProxyUrl(metaAdsProfile?.profile_image_url) || getProxyUrl(displayPhoto) || "";
    const freshDirect = metaAdsProfile?.profile_image_url || displayPhoto || "";
    setImgSrc(freshProxy || freshDirect);
    setImgAttempt(0);
  }, [displayPhoto, metaAdsProfile?.profile_image_url]);

  const handleImgError = () => {
    if (imgAttempt === 0 && directUrl && imgSrc !== directUrl) {
      // Proxy failed → try direct URL
      setImgSrc(directUrl);
      setImgAttempt(1);
    } else {
      // Both failed → let AvatarFallback (letter) show
      setImgSrc("");
      setImgAttempt(2);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Account Card (Official) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-[#0a0b14]/60 p-5 rounded-[22px] border border-white/5 shadow-2xl transition-all hover:bg-[#111322] group">
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div className="relative">
            <Avatar className="w-16 h-16 rounded-2xl border-[3px] border-[#151726] shadow-xl flex-shrink-0 transition-transform group-hover:scale-105">
              {imgSrc ? (
                <AvatarImage
                  src={imgSrc}
                  alt={displayName}
                  className="object-cover"
                  onError={handleImgError}
                />
              ) : null}
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
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <p className="font-black text-[17px] text-white tracking-tight">{displayName}</p>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[9px] font-black uppercase tracking-tighter">Oficial</Badge>
              {isExpiringSoon && (
                <Badge
                  className={cn(
                    "text-[9px] font-black uppercase tracking-tighter gap-1 cursor-pointer",
                    (daysUntilExpiry ?? 0) <= 0
                      ? "bg-red-500/20 text-red-500 border-red-500/30"
                      : (daysUntilExpiry ?? 0) <= 3
                        ? "bg-orange-500/20 text-orange-500 border-orange-500/30"
                        : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                  )}
                  onClick={handleRenewToken}
                >
                  {renewing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  Token: {expiryLabel || "Expirando"}
                </Badge>
              )}
            </div>

            {/* Detalhamento de Serviços Google */}
            {(config.id === 'google' || config.id === 'youtube') && (
              <div className="flex flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <div className={cn("w-1.5 h-1.5 rounded-full", isEffectivelyConnected ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-slate-600")} />
                  <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>YouTube</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <div className={cn("w-1.5 h-1.5 rounded-full", isEffectivelyConnected ? "bg-[#F9AB00] shadow-[0_0_8px_rgba(249,171,0,0.5)]" : "bg-slate-600")} />
                  <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Analytics</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <div className={cn("w-1.5 h-1.5 rounded-full", isEffectivelyConnected ? "bg-[#4285F4] shadow-[0_0_8px_rgba(66,133,244,0.5)]" : "bg-slate-600")} />
                  <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Contatos</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <div className={cn("w-1.5 h-1.5 rounded-full", isEffectivelyConnected ? "bg-[#34A853] shadow-[0_0_8px_rgba(52,168,83,0.5)]" : "bg-slate-600")} />
                  <span className={cn("text-[9px] font-bold", isEffectivelyConnected ? "text-white" : "text-slate-500")}>Search Console</span>
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
                  WBB
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-[#151726] shadow-sm animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-black text-[17px] text-white tracking-tight">WhatsApp Business Bot</p>
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
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{isBotOn ? 'LIGADO' : 'DESLIGADO'}</span>
            <Switch
              checked={isBotOn}
              onCheckedChange={(checked) => handleToggleBot(checked)}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
