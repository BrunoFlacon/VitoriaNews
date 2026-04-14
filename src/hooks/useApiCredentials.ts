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
    { label: "Meta Pixel ID (Tracking)", key: "pixel_id", placeholder: "Ex: 1234567890" },
  ],
  instagram: [
    { label: "Instagram User ID", key: "platform_user_id", placeholder: "Ex: 17841400000000" },
    { label: "Access Token (Long Lived)", key: "access_token", masked: true },
  ],
  threads: [
    { label: "Threads User ID", key: "platform_user_id", placeholder: "Ex: 123456789012345" },
    { label: "Threads Access Token", key: "access_token", masked: true },
  ],
  whatsapp: [
    { label: "Phone Number ID (WhatsApp Business)", key: "phone_number_id", placeholder: "Ex: 123456789012345" },
    { label: "Access Token (Permanente / System User)", key: "access_token", masked: true },
    { label: "Business Account ID", key: "business_id", placeholder: "Ex: 1234567890" },
  ],
  twitter: [
    { label: "Twitter Username/Handle (sem @)", key: "platform_user_id", placeholder: "ex: lovable_dev" },
    { label: "Bearer Token (App Only) ou User Oauth", key: "access_token", masked: true, placeholder: "Cole seu Bearer Token" },
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
    { label: "URL do Site", key: "site_url_key", masked: true, placeholder: "https://seusite.com" },
  ],
  meta_ads: [
    { label: "System User Token", key: "access_token", masked: true },
    { label: "Ad Account ID", key: "ad_account_id", placeholder: "act_123456..." },
  ],
  google_cloud: [
    { label: "Google Maps API Key", key: "maps_api_key", masked: true },
    { label: "Google News API Key", key: "news_api_key", masked: true },
    { label: "YouTube API Key", key: "youtube_api_key", masked: true },
    { label: "Google Ads ID", key: "ads_id", masked: true },
    { label: "Google Analytics ID", key: "analytics_id", masked: true },
    { label: "Search Console ID", key: "search_console_id",  masked: true },
    { label: "Google Analytics Pixel ID (G-TAG)", key: "pixel_id", placeholder: "Ex: G-XXXXXXXXXX" },
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
  reddit: [
    { label: "Reddit Client ID", key: "client_id", placeholder: "Ex: _p98pqg..." },
    { label: "Reddit Client Secret", key: "client_secret", masked: true },
  ],
  truthsocial: [
    { label: "Truth Social Client ID", key: "client_id" },
    { label: "Truth Social Client Secret", key: "client_secret", masked: true },
  ],
  gettr: [
    { label: "Gettr API Key", key: "api_key", masked: true },
  ],
  newsapi: [
    { label: "NewsAPI.org API Key", key: "api_key", masked: true, placeholder: "Cole a sua key (ex: 3a5d8f...)" },
  ],
  resend: [
    { label: "Resend API Key (Email)", key: "api_key", masked: true, placeholder: "re_..." },
    { label: "Sender Domain/Address", key: "from_email", placeholder: "Ex: Portal <contato@seusite.com>" },
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
    } catch {
      // Silent - credentials just won't load
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
      let finalCreds = creds;
      
      // Multi-token support for Telegram
      if (platform === "telegram") {
        const existing = credentials["telegram"] || {};
        let tokens: string[] = [];
        
        if (Array.isArray(existing.tokens)) {
          tokens = [...existing.tokens];
        } else if (existing.bot_token) {
          tokens = [existing.bot_token];
        } else if (existing.token) {
          tokens = [existing.token];
        }
        
        // Add new token if provided and not already present
        if (creds.bot_token && creds.bot_token.trim() !== '') {
          if (!tokens.includes(creds.bot_token.trim())) {
            tokens.push(creds.bot_token.trim());
          }
        }
        
        // Prevent saving empty credentials if we have existing tokens
        if (tokens.length === 0) {
          // No tokens at all — check if we're just saving an empty form
          const hasAnyValue = Object.values(creds).some(v => typeof v === 'string' && v.trim() !== '');
          if (!hasAnyValue) {
            setSaving(null);
            return true; // Nothing to save, keep existing
          }
        }
        
        // Store bot_token (first token) alongside tokens array for backward compat
        finalCreds = {
          bot_token: tokens[0] || '',
          tokens,
        } as any;
      }

      const { error } = await supabase
        .from("api_credentials" as any)
        .upsert(
          { user_id: user.id, platform, credentials: finalCreds } as any,
          { onConflict: "user_id,platform" }
        );
      if (error) throw error;
      setCredentials(prev => ({ ...prev, [platform]: finalCreds }));
      toast({ title: "Credenciais salvas", description: `${platform} atualizado com sucesso.` });

      // Auto-sync Telegram after saving token
      if (platform === "telegram") {
        try {
          // Small delay to ensure DB consistency
          await new Promise(resolve => setTimeout(resolve, 1200));
          
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          
          if (!token) throw new Error("Sessão expirada");

          const baseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
          const anonKey = (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
          
          const response = await fetch(`${baseUrl}/functions/v1/sync-telegram-chats`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'X-Authorization': `Bearer ${token}`,
              'apikey': anonKey,
            },
            body: JSON.stringify({ platform: "telegram", userId: sessionData?.session?.user?.id })
          });

          const syncResult = await response.json().catch(() => ({}));

          if (!response.ok || syncResult.success === false) {
            throw new Error(syncResult.error || `Erro HTTP: ${response.status}`);
          }

          // Auto-sync succeeded silently
        } catch (syncErr: any) {
          toast({
            title: "Atenção: Sincronização Pendente",
            description: `Credenciais salvas! Para exibir os dados, clique em "Sincronizar" na aba Telegram.`,
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
    
    // Safely check if at least one value in the credentials object is truthy and non-empty
    return Object.values(creds as Record<string, unknown>).some((v: unknown) => {
      if (typeof v === 'string') return v.trim() !== "";
      if (Array.isArray(v)) return (v as unknown[]).length > 0;
      if (v && typeof v === 'object') return Object.keys(v as object).length > 0;
      return !!v;
    });
  };

  return { credentials, loading, saving, saveCredentials, deleteCredentials, hasCredentials, refetch: fetchCredentials };
}
