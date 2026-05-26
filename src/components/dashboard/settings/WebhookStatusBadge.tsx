import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, getProxyUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Webhook, CheckCircle2, AlertCircle, HelpCircle, ExternalLink } from "lucide-react";

interface WebhookHealth {
  configured: boolean;
  healthy: boolean;
  details: string;
}

interface WebhookStatusBadgeProps {
  platform: string;
  userId?: string;
  compact?: boolean;
  onRefresh?: () => void;
}

const WEBHOOK_PLATFORMS: Record<string, { label: string; docField: string }> = {
  telegram: { label: "Telegram", docField: "telegram" },
  whatsapp: { label: "WhatsApp", docField: "whatsapp" },
  facebook: { label: "Facebook", docField: "facebook" },
  instagram: { label: "Instagram", docField: "instagram" },
  tiktok: { label: "TikTok", docField: "tiktok" },
  linkedin: { label: "LinkedIn", docField: "linkedin" },
  meta: { label: "Meta (Geral)", docField: "meta" },
};

export const WebhookStatusBadge = React.memo(({
  platform,
  userId,
  compact = false,
  onRefresh,
}: WebhookStatusBadgeProps) => {
  const [status, setStatus] = useState<WebhookHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const webhookInfo = WEBHOOK_PLATFORMS[platform];
  if (!webhookInfo) return null;

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        setError("Sem sessão");
        setLoading(false);
        return;
      }
      const { data, error: fnErr } = await supabase.functions.invoke("webhook-health", {
        body: { platform, userId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (fnErr) throw fnErr;
      const webhooks = data?.webhooks || {};
      const key = platform === "meta" ? "meta" : platform;
      const ws = webhooks[key] || webhooks["meta"] || null;
      setStatus(ws);
    } catch (err: any) {
      setError(err.message || "Falha ao verificar webhook");
    } finally {
      setLoading(false);
    }
  }, [platform, userId]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const getBadgeVariant = () => {
    if (!status || error) return "outline";
    if (status.healthy && status.configured) return "default";
    if (status.configured && !status.healthy) return "destructive";
    return "secondary";
  };

  const getBadgeContent = () => {
    if (loading) return <Loader2 className="w-3 h-3 animate-spin" />;
    if (error || !status) return <HelpCircle className="w-3 h-3" />;
    if (status.healthy && status.configured) return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    if (status.configured && !status.healthy) return <AlertCircle className="w-3 h-3 text-destructive" />;
    return <AlertCircle className="w-3 h-3 text-yellow-500" />;
  };

  const getBadgeLabel = () => {
    if (loading) return "Verificando...";
    if (error || !status) return "Erro";
    if (status.healthy && status.configured) return "Webhook Ativo";
    if (status.configured && !status.healthy) return "Webhook com Erro";
    return "Não Configurado";
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-tighter cursor-pointer transition-colors",
                getBadgeVariant() === "default" && "bg-green-600 text-primary-foreground border-green-600",
                getBadgeVariant() === "destructive" && "bg-destructive text-destructive-foreground border-destructive",
                getBadgeVariant() === "secondary" && "bg-secondary text-secondary-foreground border-secondary",
                getBadgeVariant() === "outline" && "border-border text-muted-foreground",
                loading && "opacity-50"
              )}
              onClick={() => { if (!loading) checkHealth(); }}
            >
              {getBadgeContent()}
              {getBadgeLabel()}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            <p className="font-semibold mb-1">{webhookInfo.label}</p>
            <p className="text-muted-foreground">
              {status?.details || error || "Verificando..."}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Clique para re-verificar
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border/30 bg-muted/10">
      <Webhook className="w-4 h-4 text-muted-foreground/70" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{webhookInfo.label}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {loading ? "Verificando..." : error ? error : status?.details || "Sem informações"}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {getBadgeContent()}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => { if (!loading) checkHealth(); }}
          disabled={loading}
        >
          <Loader2 className={cn("w-3 h-3", loading ? "animate-spin" : "")} />
        </Button>
      </div>
    </div>
  );
});

WebhookStatusBadge.displayName = "WebhookStatusBadge";
