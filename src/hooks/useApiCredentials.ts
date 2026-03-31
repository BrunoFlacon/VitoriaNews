import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface PlatformCredentials {
  platform: string;
  credentials: Record<string, string>;
}

export const PLATFORM_CREDENTIAL_FIELDS: Record<string, { label: string; key: string; placeholder?: string; masked?: boolean }[]> = {
  facebook: [
    { label: "App ID (Meta for Developers)", key: "app_id", placeholder: "Ex: 123456789012345" },
    { label: "App Secret", key: "app_secret", masked: true, placeholder: "Seu App Secret da Meta" },
  ],
  instagram: [
    { label: "App ID (Meta Business App)", key: "app_id", placeholder: "Ex: 123456789012345" },
    { label: "App Secret", key: "app_secret", masked: true },
  ],
  threads: [
    { label: "Threads App ID (Meta)", key: "app_id", placeholder: "Ex: 123456789012345" },
    { label: "Threads App Secret", key: "app_secret", masked: true },
  ],
  whatsapp: [
    { label: "WhatsApp App ID (Meta)", key: "app_id", placeholder: "Ex: 123456789012345" },
    { label: "App Secret", key: "app_secret", masked: true },
  ],
  twitter: [
    { label: "Client ID (OAuth 2.0)", key: "client_id", placeholder: "ID Alfanumérico longo — ex: V0VfM3Bvamd..." },
    { label: "Client Secret (opcional para App Nativo)", key: "client_secret", masked: true, placeholder: "Deixe vazio se usar App Nativo" },
  ],
  youtube: [
    { label: "Google Client ID", key: "client_id", placeholder: "Ex: ...apps.googleusercontent.com" },
    { label: "Google Client Secret", key: "client_secret", masked: true },
  ],
  google: [
    { label: "Google Client ID", key: "client_id", placeholder: "Ex: ...apps.googleusercontent.com" },
    { label: "Google Client Secret", key: "client_secret", masked: true },
  ],
  linkedin: [
    { label: "LinkedIn Client ID", key: "client_id" },
    { label: "LinkedIn Client Secret", key: "client_secret", masked: true },
  ],
  tiktok: [
    { label: "TikTok Client Key", key: "client_key" },
    { label: "TikTok Client Secret", key: "client_secret", masked: true },
  ],
  pinterest: [
    { label: "Pinterest App ID", key: "app_id" },
    { label: "Pinterest App Secret", key: "app_secret", masked: true },
  ],
  telegram: [
    { label: "Bot Token (@BotFather)", key: "bot_token", masked: true, placeholder: "Ex: 123456:ABC-DEF1234ghIkl-zyx57" },
  ],
  snapchat: [
    { label: "Snapchat Client ID", key: "client_id" },
    { label: "Snapchat Client Secret", key: "client_secret", masked: true },
  ],
  site: [
    { label: "URL do Site", key: "site_url", placeholder: "https://seusite.com" },
  ],
  meta_ads: [
    { label: "System User Token", key: "access_token", masked: true },
    { label: "Ad Account ID", key: "ad_account_id", placeholder: "act_123456..." },
  ],
  google_cloud: [
    { label: "Google Maps API Key", key: "maps_api_key", masked: true },
    { label: "Google News API Key", key: "news_api_key", masked: true },
    { label: "YouTube API Key", key: "youtube_api_key", masked: true },
    { label: "Google Ads ID", key: "ads_id", placeholder: "Ex: 123-456-7890" },
    { label: "Google Analytics ID", key: "analytics_id", placeholder: "Ex: G-XXXXXXXXXX" },
    { label: "Search Console ID", key: "search_console_id" },
  ],
  spotify: [
    { label: "Spotify Client ID", key: "client_id" },
    { label: "Spotify Client Secret", key: "client_secret", masked: true },
  ],
  giphy: [
    { label: "Giphy API Key", key: "api_key", masked: true },
  ],
  kwai: [
    { label: "Kwai App ID", key: "app_id" },
    { label: "Kwai App Secret", key: "app_secret", masked: true },
  ],
  rumble: [
    { label: "Rumble Channel ID", key: "channel_id" },
    { label: "Rumble API Key", key: "api_key", masked: true },
  ],
  truthsocial: [
    { label: "Truth Social Client ID", key: "client_id" },
    { label: "Truth Social Client Secret", key: "client_secret", masked: true },
  ],
  gettr: [
    { label: "Gettr API Key", key: "api_key", masked: true },
  ],
  googlenews: [
    { label: "Google News API Key", key: "api_key", masked: true },
  ],
  newsapi: [
    { label: "NewsAPI.org API Key", key: "api_key", masked: true, placeholder: "Cole a sua key (ex: 3a5d8f...)" },
  ]
};

export function useApiCredentials() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchCredentials = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("api_credentials" as any)
        .select("platform, credentials")
        .eq("user_id", user.id);
      if (error) throw error;
      const map: Record<string, Record<string, string>> = {};
      (data as any[])?.forEach((row: any) => {
        map[row.platform] = row.credentials || {};
      });
      setCredentials(map);
    } catch (e: any) {
      // Error handled by loading state
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const saveCredentials = async (platform: string, creds: Record<string, string>) => {
    if (!user) return false;
    setSaving(platform);
    try {
      const { error } = await supabase
        .from("api_credentials" as any)
        .upsert(
          { user_id: user.id, platform, credentials: creds } as any,
          { onConflict: "user_id,platform" }
        );
      if (error) throw error;
      setCredentials(prev => ({ ...prev, [platform]: creds }));
      toast({ title: "Credenciais salvas", description: `${platform} atualizado com sucesso.` });

      // Trigger sync for special platforms
      if (platform === "telegram") {
        try {
          const { data: syncResult, error: syncError } = await supabase.functions.invoke("sync-telegram-info", {
            body: { platform: "telegram" }
          });
          if (syncError) throw syncError;
        } catch (syncErr: any) {
          toast({
            title: "Aviso de Sincronização",
            description: "Credenciais salvas, mas não conseguimos buscar os dados do Bot agora.",
            variant: "destructive"
          });
        }
      }

      return true;
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(null);
    }
  };

  const deleteCredentials = async (platform: string) => {
    if (!user) return false;
    setSaving(platform);
    try {
      const { error } = await supabase
        .from("api_credentials" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("platform", platform);
      if (error) throw error;
      setCredentials(prev => {
        const next = { ...prev };
        delete next[platform];
        return next;
      });
      toast({ title: "Credenciais removidas", description: `${platform} removido.` });
      return true;
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(null);
    }
  };

  const hasCredentials = (platform: string) => {
    const creds = credentials[platform];
    if (!creds) return false;
    return Object.values(creds).some(v => v && v.trim() !== "");
  };

  return { credentials, loading, saving, saveCredentials, deleteCredentials, hasCredentials, refetch: fetchCredentials };
}
