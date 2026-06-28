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
    { label: "NewsAPI.org API Key", key: "api_key", masked: true, placeholder: "Cole sua chave de API do newsapi.org" },
  ],
  resend: [
    { label: "Resend API Key (Email)", key: "api_key", masked: true, placeholder: "re_..." },
    { label: "Sender Domain/Address", key: "from_email", placeholder: "Ex: Portal <contato@seusite.com>" },
  ],
  ai_config: [
    { label: "Provedor de IA (openrouter, openai, google, anthropic, lovable)", key: "provider", placeholder: "Ex: openrouter" },
    { label: "API Key Principal (OpenAI / Lovable / Anthropic)", key: "api_key", masked: true, placeholder: "Cole sua chave de API" },
    { label: "OpenRouter API Key (recomendado)", key: "openrouter_api_key", masked: true, placeholder: "sk-or-v1-..." },
    { label: "Modelo OpenRouter (texto)", key: "openrouter_model", placeholder: "Ex: google/gemini-2.0-flash-001" },
    { label: "Modelo de Texto (legado)", key: "text_model", placeholder: "Ex: gpt-4o-mini" },
    { label: "Modelo de Imagem (DALL-E)", key: "image_model", placeholder: "Ex: dall-e-3" },
    { label: "ElevenLabs API Key (Texto-para-Áudio)", key: "audio_api_key", masked: true },
    { label: "Base URL Customizada (Opcional)", key: "base_url", placeholder: "https://openrouter.ai/api/v1" },

  ]
};

import { sanitizeHtml } from "@/lib/utils";

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
    
    // IMPORTANT: Do NOT use sanitizeHtml on API keys — it can corrupt them by
    // matching patterns like on\w+= or javascript: inside token strings.
    // Only trim whitespace safely.
    const sanitizedCreds: Record<string, string> = {};
    Object.entries(creds).forEach(([key, val]) => {
      sanitizedCreds[key] = typeof val === 'string' ? val.trim() : val;
    });

    try {
      let finalCreds = sanitizedCreds;
      
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
      } else if (platform === "ai_config") {
        // Ensure api_key is populated from openrouter_api_key for backward compatibility 
        // with the current live Edge Function that only checks 'api_key'
        if (!sanitizedCreds.api_key && sanitizedCreds.openrouter_api_key) {
          sanitizedCreds.api_key = sanitizedCreds.openrouter_api_key;
        }
        
        // Auto-fix: If provider is openrouter and base_url is missing, set it correctly
        // This prevents the legacy Edge Function from sending OpenRouter keys to OpenAI endpoint
        if (sanitizedCreds.provider === 'openrouter' && !sanitizedCreds.base_url) {
          sanitizedCreds.base_url = 'https://openrouter.ai/api/v1';
        }
        
        // Ensure provider is set if openrouter_api_key is present
        if (!sanitizedCreds.provider && sanitizedCreds.openrouter_api_key) {
          sanitizedCreds.provider = 'openrouter';
        }

        // Ensure a default model is set for OpenRouter to avoid legacy function fallbacks
        if (sanitizedCreds.provider === 'openrouter' && !sanitizedCreds.openrouter_model) {
          sanitizedCreds.openrouter_model = 'google/gemini-2.0-flash-001';
          sanitizedCreds.text_model = 'google/gemini-2.0-flash-001';
        }
        
        finalCreds = sanitizedCreds;
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

      // Trigger sync for special platforms
      if (platform === "telegram") {
        try {
          const session = (await supabase.auth.getSession()).data.session;
          const anonKey = (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
          const baseUrl = (supabase as any).functionsUrl || import.meta.env.VITE_SUPABASE_URL + '/functions/v1';

          const doFetch = async (useAuth: boolean) => {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'apikey': anonKey
            };
            if (useAuth && session?.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`;
            }
            return await fetch(`${baseUrl}/sync-telegram-info`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ platform: "telegram", token: creds.bot_token, userId: session?.user?.id || user.id })
            });
          };

          let response = await doFetch(true);
          
          if (response.status === 401) {
            response = await doFetch(false);
          }
          
          if (response.ok) {
            const result = await response.json();
            if (result?.success) {
              await fetchCredentials();
              window.dispatchEvent(new Event("social-connections-updated"));
              window.dispatchEvent(new Event("messaging-channels-updated"));
              const data = result.data;
              const chatCount = data?.discovered_chats?.length || 0;
              const totalMembers = data?.total_members || 0;
              if (chatCount > 0) {
                toast({
                  title: "✅ Telegram conectado!",
                  description: `${chatCount} grupo(s)/canal(is) encontrado(s) · ${totalMembers.toLocaleString('pt-BR')} membro(s) no total.`,
                });
              }
            } else {
              toast({ title: "Aviso do Telegram", description: result?.error || "Bot não sincronizado. Verifique se o Bot Token está totalmente correto e se ele pertence ao seu Bot no @BotFather.", variant: "destructive" });
            }
          }
        } catch (syncErr: any) {
          console.log("[Telegram] Sync skip.");
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
    return Object.values(creds).some(v => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'string') return v.trim() !== "";
      if (Array.isArray(v)) return v.length > 0;
      return !!v;
    });
  };

  return { credentials, loading, saving, saveCredentials, deleteCredentials, hasCredentials, refetch: fetchCredentials };
}
