/**
 * WhatsAppBotSettingsTab — Multi-connection Bot Control
 * 
 * Renders one WhatsAppBotControl card per WhatsApp connection.
 * Allows independent bot activation per phone number.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smartphone, Bot, AlertCircle } from "lucide-react";
import { WhatsAppBotControl } from "../settings/WhatsAppBotControl";

interface WhatsAppConnection {
  id: string;
  phone_number_id: string;
  page_name: string | null;
  platform_user_id: string;
  metadata: any;
}

interface BotSettings {
  id: string;
  connection_id: string | null;
  is_active: boolean;
  [key: string]: any;
}

export function WhatsAppBotSettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [botSettingsMap, setBotSettingsMap] = useState<Record<string, BotSettings>>({});
  const [botCounts, setBotCounts] = useState<Record<string, { sent: number; answered: number }>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch WhatsApp connections
      const { data: conns, error: connErr } = await supabase
        .from("social_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", "whatsapp")
        .eq("is_connected", true);

      if (connErr) throw connErr;
      const waConns = conns || [];
      setConnections(waConns);

      // Fetch bot settings for each connection
      const { data: settings, error: setErr } = await supabase
        .from("bot_settings")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", "whatsapp");

      if (setErr) throw setErr;

      const settingsMap: Record<string, BotSettings> = {};
      const settingsList = settings || [];

      // Map settings by connection_id, with a fallback for null (default)
      for (const s of settingsList) {
        const key = s.connection_id || "__default__";
        settingsMap[key] = s;
      }
      setBotSettingsMap(settingsMap);

      // Fetch message counts per connection
      const countsMap: Record<string, { sent: number; answered: number }> = {};
      for (const conn of waConns) {
        // Count bot replies for this connection
        const { count: sentCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("platform", "whatsapp")
          .eq("metadata->>connection_id", conn.id)
          .eq("metadata->>bot_reply", "true");

        const { count: answeredCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("platform", "whatsapp")
          .eq("metadata->>connection_id", conn.id)
          .not("metadata->>bot_reply", "eq", "true")
          .eq("status", "received");

        countsMap[conn.id] = {
          sent: sentCount || 0,
          answered: answeredCount || 0,
        };
      }
      setBotCounts(countsMap);
    } catch (err) {
      console.error("Error fetching WhatsApp bot data:", err);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar as configurações do bot.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleBot = useCallback(async (connectionId: string | null, checked: boolean) => {
    if (!user) return;
    const key = connectionId || "__default__";
    setToggling(prev => ({ ...prev, [key]: true }));

    try {
      const existing = botSettingsMap[key];

      if (existing) {
        const { error } = await supabase
          .from("bot_settings")
          .update({ is_active: checked })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bot_settings")
          .insert({
            user_id: user.id,
            platform: "whatsapp",
            connection_id: connectionId,
            is_active: checked,
          });
        if (error) throw error;
      }

      setBotSettingsMap(prev => ({
        ...prev,
        [key]: { ...(prev[key] || {}), is_active: checked } as BotSettings,
      }));

      toast({
        title: checked ? "Robô ativado" : "Robô pausado",
        description: connectionId
          ? `Configuração para esta conexão atualizada.`
          : "Configuração padrão atualizada.",
      });
    } catch (err) {
      console.error("Error toggling bot:", err);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o estado do robô.",
        variant: "destructive",
      });
    } finally {
      setToggling(prev => ({ ...prev, [key]: false }));
    }
  }, [user, botSettingsMap, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="flex items-center justify-center h-[40vh] text-muted-foreground">
        <div className="text-center space-y-3">
          <Bot className="w-12 h-12 mx-auto opacity-30" />
          <p className="text-sm font-medium">Nenhuma conexão WhatsApp</p>
          <p className="text-xs text-muted-foreground/60 max-w-sm">
            Conecte um número de WhatsApp nas Configurações para configurar o robô.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="px-4 pt-2 pb-1">
        <p className="text-xs text-muted-foreground/70">Bot do WhatsApp: configure respostas automáticas para seus contatos.</p>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Bot className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-base">Controle do Robô por Número</h3>
      </div>

      {connections.map(conn => {
        const key = conn.id;
        const settings = botSettingsMap[key];
        const counts = botCounts[key] || { sent: 0, answered: 0 };
        const isToggling = toggling[key] || false;

        return (
          <div key={conn.id} className="relative">
            <div className="flex items-center gap-2 mb-2 pl-1">
              <Smartphone className="w-4 h-4 text-[#25D366]" />
              <span className="text-sm font-semibold text-muted-foreground">
                {conn.page_name || conn.platform_user_id || conn.phone_number_id}
              </span>
            </div>
            <WhatsAppBotControl
              waMetadata={{ is_active: settings?.is_active ?? false }}
              localBotActive={isToggling ? null : (settings?.is_active ?? false)}
              handleToggleBot={(checked) => handleToggleBot(conn.id, checked)}
              botPosts={counts.sent}
              botAnswers={counts.answered}
            />
          </div>
        );
      })}

      {/* Default settings for connections without specific config */}
      {botSettingsMap["__default__"] && !connections.find(c => botSettingsMap[c.id]) && (
        <div className="mt-6 pt-4 border-t border-border/20">
          <div className="flex items-center gap-2 mb-2 pl-1">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">
              Configuração Padrão
            </span>
          </div>
          <WhatsAppBotControl
            waMetadata={{ is_active: botSettingsMap["__default__"]?.is_active ?? false }}
            localBotActive={botSettingsMap["__default__"]?.is_active ?? false}
            handleToggleBot={(checked) => handleToggleBot(null, checked)}
            botPosts={0}
            botAnswers={0}
          />
        </div>
      )}
    </div>
  );
}

export default WhatsAppBotSettingsTab;
