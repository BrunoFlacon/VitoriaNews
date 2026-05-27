import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { safeInvoke } from '@/utils/supabase-utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface SocialConnection {
  id: string;
  platform: string;
  is_connected: boolean;
  is_primary: boolean;
  page_name: string | null;
  platform_user_id: string | null;
  token_expires_at: string | null;
  page_id: string | null;
  profile_image_url?: string | null;
  profile_picture?: string | null;
  cover_photo?: string | null;
  followers_count?: number | null;
  posts_count?: number | null;
  username?: string | null;
  metadata?: Record<string, unknown> | null;
  isExpiringSoon?: boolean;
  daysUntilExpiry?: number | null;
}

const escapeHtml = (str: string): string => {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

const writeToPopupSafely = (win: Window | null, html: string) => {
  if (!win || win.closed) return;
  try {
    const doc = win.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      return;
    }
  } catch (e) {
  }
  try {
    win.close();
  } catch (_) {}
};

export function useSocialConnections(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading, refetch } = useQuery({
    queryKey: ['social_connections_all', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const results = await Promise.allSettled([
        supabase
          .from('social_connections')
          .select('id, platform, is_connected, is_primary, page_name, platform_user_id, token_expires_at, page_id, profile_image_url, profile_picture, followers_count, posts_count, username, metadata')
          .eq('user_id', user.id),
        supabase
          .from('social_accounts')
          .select('platform, platform_user_id, username, profile_picture, followers_count, followers, posts_count, page_name')
          .eq('user_id', user.id),
        supabase
          .from('api_credentials')
          .select('platform, credentials')
          .eq('user_id', user.id)
          .in('platform', ['telegram', 'whatsapp']),
      ]);

      const oauthRes    = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
      const accountsRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
      const credsRes    = results[2].status === 'fulfilled' ? results[2].value : { data: [] };

      const oauthConnections = (oauthRes.data || []) as unknown as SocialConnection[];
      const accounts         = (accountsRes.data || []) as Array<{
        platform: string;
        platform_user_id: string | null;
        username: string | null;
        profile_picture: string | null;
        followers_count: number | null;
        followers?: number | null;
        posts_count: number | null;
        page_name: string | null;
      }>;

      const findAccount = (conn: SocialConnection) => {
        if (conn.page_id) {
          const byPageId = accounts.find(a => a.platform === conn.platform && a.platform_user_id === conn.page_id);
          if (byPageId) return byPageId;
        }
        if (conn.platform_user_id) {
          const byUserId = accounts.find(a => a.platform === conn.platform && a.platform_user_id === conn.platform_user_id);
          if (byUserId) return byUserId;
        }
        return accounts.find(a => a.platform === conn.platform) || null;
      };

      const computeExpiry = (expiresAt: string | null): { isExpiringSoon: boolean; daysUntilExpiry: number } => {
        if (!expiresAt) return { isExpiringSoon: false, daysUntilExpiry: null };
        const diff = new Date(expiresAt).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return { isExpiringSoon: days <= 14, daysUntilExpiry: days };
      };

      const enrichedConnections: SocialConnection[] = oauthConnections.map(conn => {
        const acc = findAccount(conn);
        if (!acc) return { ...conn, ...computeExpiry(conn.token_expires_at) };
        const cachedPic         = acc.profile_picture || null;
        const enrichedFollowers = acc.followers_count || (acc as { followers?: number | null }).followers || conn.followers_count;
        const enrichedPosts     = acc.posts_count || conn.posts_count;
        const enrichedPageName  = conn.page_name || acc.page_name || acc.username || null;
        return {
          ...conn,
          ...computeExpiry(conn.token_expires_at),
          profile_image_url: cachedPic || conn.profile_image_url || null,
          profile_picture:   cachedPic || conn.profile_picture   || null,
          followers_count:   enrichedFollowers || conn.followers_count,
          posts_count:       enrichedPosts     || conn.posts_count,
          page_name:         enrichedPageName,
        };
      });

      const credentials = (credsRes.data || []) as Array<{ platform: string; credentials: Record<string, unknown> }>;
      const tgCreds = credentials.find(r => r.platform === 'telegram')?.credentials;
      const waCreds = credentials.find(r => r.platform === 'whatsapp')?.credentials;

      const hasTGToken = tgCreds && (
        (typeof tgCreds.bot_token === 'string' && tgCreds.bot_token.trim()) || 
        (typeof tgCreds.token === 'string' && tgCreds.token.trim()) || 
        (Array.isArray(tgCreds.tokens) && tgCreds.tokens.length > 0)
      );
      const hasWAToken = waCreds && (
        (typeof waCreds.app_id === 'string' && waCreds.app_id.trim()) || 
        (typeof waCreds.access_token === 'string' && waCreds.access_token.trim())
      );

      const alreadyHasTelegramBot = enrichedConnections.some(c => 
        c.platform === 'telegram' && c.is_connected && c.platform_user_id != null
      );
      const alreadyHasWhatsAppConn = enrichedConnections.some(c => 
        c.platform === 'whatsapp' && c.is_connected
      );

      const finalConnections = [...enrichedConnections];

      if (hasTGToken && !alreadyHasTelegramBot) {
        const platformAccounts = accounts.filter(a => a.platform === 'telegram');
        const firstAcc = platformAccounts.find(a =>
          (a.page_name?.toLowerCase().includes('newsbot') || a.username?.toLowerCase().includes('newsbot'))
          && Number(a.platform_user_id || 0) > 0
        ) || platformAccounts.find(a => Number(a.platform_user_id || 0) > 0) || platformAccounts[0];
        // Telegram: usa APENAS o registro principal do bot (que contém a soma
        // de seguidores dos canais, não grupos). Não somar todos os registros
        // (grupos/canais) senão duplica o valor.
        const totalFollowers = Number(firstAcc?.followers_count) || Number((firstAcc as any)?.followers) || 0;
        const totalPosts     = platformAccounts.reduce((sum, a) => sum + (Number(a.posts_count) || 0), 0);
        const botToken = Array.isArray(tgCreds?.tokens) ? tgCreds.tokens[0] : (tgCreds?.bot_token || tgCreds?.token || '');
        finalConnections.push({
          id: `telegram-api-${user.id}`,
          platform: 'telegram',
          is_connected: true,
          is_primary: false,
          page_name: firstAcc?.username ? `@${firstAcc.username}` : 'Bot Telegram',
          platform_user_id: firstAcc?.platform_user_id || null,
          token_expires_at: null,
          page_id: null,
          profile_image_url: firstAcc?.profile_picture || null,
          profile_picture:   firstAcc?.profile_picture || null,
          followers_count: totalFollowers,
          posts_count:     totalPosts,
          username: firstAcc?.username || null,
          metadata: { from_api_credentials: true, bot_token_preview: botToken ? botToken.slice(0, 8) + '...' : '' },
        });
      }

      if (hasWAToken && !alreadyHasWhatsAppConn) {
        const platformAccounts = accounts.filter(a => a.platform === 'whatsapp');
        const totalFollowers   = platformAccounts.reduce((sum, a) => sum + (Number(a.followers_count) || 0), 0);
        const totalPosts       = platformAccounts.reduce((sum, a) => sum + (Number(a.posts_count) || 0), 0);
        const firstAcc = platformAccounts[0];
        finalConnections.push({
          id: `whatsapp-api-${user.id}`,
          platform: 'whatsapp',
          is_connected: true,
          is_primary: false,
          page_name: firstAcc?.username || firstAcc?.page_name || 'WhatsApp Business',
          platform_user_id: firstAcc?.platform_user_id || null,
          token_expires_at: null,
          page_id: null,
          profile_image_url: firstAcc?.profile_picture || null,
          profile_picture:   firstAcc?.profile_picture || null,
          followers_count: totalFollowers,
          posts_count:     totalPosts,
          username: firstAcc?.username || null,
          metadata: { from_api_credentials: true },
        });
      }

      // ── Deduplicação: agrupa conexões que representam o mesmo perfil ─────────
      // Útil para plataformas pessoais (ex: Threads) onde podem existir registros
      // duplicados com platform_user_id diferente devido a falhas anteriores.
      {
        const groups = new Map<string, SocialConnection[]>();
        for (const c of finalConnections) {
          const arr = groups.get(c.platform) || [];
          arr.push(c);
          groups.set(c.platform, arr);
        }

        const deduped: SocialConnection[] = [];
        for (const [, conns] of groups) {
          if (conns.length === 1) {
            deduped.push(conns[0]);
            continue;
          }

          // Se há múltiplas conexões na mesma plataforma, tenta encontrar a
          // "principal" (aquela com username preenchido e nome não genérico)
          const primary = conns.find(c =>
            c.username && !/user|profile/i.test(c.page_name || "")
          );
          const rest = conns.filter(c => c !== primary);

          if (primary && rest.length > 0) {
            const merged = { ...primary };
            for (const r of rest) {
              merged.posts_count = (merged.posts_count || 0) + (r.posts_count || 0);
              merged.followers_count = Math.max(
                merged.followers_count || 0,
                r.followers_count || 0
              );
              if (!merged.profile_image_url && r.profile_image_url) {
                merged.profile_image_url = r.profile_image_url;
              }
            }
            deduped.push(merged);
          } else {
            deduped.push(...conns);
          }
        }

        finalConnections.length = 0;
        finalConnections.push(...deduped);
      }

      finalConnections.sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return 0;
      });

      return finalConnections;
    },
    enabled: !!user && (options.enabled !== false),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!user || options.enabled === false) return;
    const connectionsChannel = supabase
      .channel('connections-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_connections' }, () =>
        queryClient.invalidateQueries({ queryKey: ['social_connections_all', user.id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_credentials' }, () =>
        queryClient.invalidateQueries({ queryKey: ['social_connections_all', user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(connectionsChannel); };
  }, [user, queryClient, options.enabled]);

  // ---------------------------------------------------------------------------
  // Busca o app_id Meta percorrendo múltiplas plataformas no banco.
  // Ordem para Threads: 'threads' → 'facebook' → 'meta'
  // ---------------------------------------------------------------------------
  const fetchMetaAppId = async (platform: string) => {
    const lookupOrder: Record<string, string[]> = {
      threads:   ['threads', 'facebook', 'meta'],
      instagram: ['instagram', 'facebook', 'meta'],
      facebook:  ['facebook', 'meta'],
      whatsapp:  ['whatsapp', 'facebook', 'meta'],
    };

    const platforms = lookupOrder[platform] ?? [platform];

    for (const p of platforms) {
      const { data: row, error } = await supabase
        .from('api_credentials')
        .select('credentials')
        .eq('user_id', user!.id)
        .eq('platform', p)
        .maybeSingle();

      if (error) {
        continue;
      }

      interface CredentialsRow {
        credentials?: Record<string, string | undefined>;
      }
      const creds     = (row as CredentialsRow | null)?.credentials;
      const appId     = creds?.app_id?.trim()     || creds?.client_id?.trim()     || null;
      const appSecret = creds?.app_secret?.trim() || creds?.client_secret?.trim() || null;

      if (appId) {
        return { appId, appSecret, source: p };
      }
    }

    return { appId: null, appSecret: null, source: 'not_found' };
  };

  const initiateOAuth = async (platform: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
        return;
      }

      localStorage.setItem("oauth_platform", platform);

      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      let origin = window.location.origin;
      const port = window.location.port ? `:${window.location.port}` : "";

      // Ponte de Conexão via Edge Function (para plataformas que exigem HTTPS)
      // Usa a própria URL da Supabase Edge Function como callback, já que é HTTPS e sempre disponível.
      const SUPABASE_FUNCTIONS_URL = 'https://ghtkdkauseesambzqfrd.supabase.co/functions/v1';
      if (['threads', 'tiktok', 'facebook', 'instagram', 'whatsapp', 'linkedin'].includes(platform) && isLocal) {
        origin = SUPABASE_FUNCTIONS_URL;
      } else if (isLocal) {
        let localHostname = window.location.hostname;
        if (['twitter'].includes(platform)) localHostname = "127.0.0.1";
        else if (['facebook', 'instagram', 'whatsapp', 'threads', 'google', 'youtube', 'tiktok', 'linkedin'].includes(platform)) localHostname = "localhost";
        origin = `http://${localHostname}${port}`;
      }

      const isBridgePlatform = ['threads', 'tiktok', 'facebook', 'instagram', 'whatsapp', 'linkedin'].includes(platform) && isLocal;
      const redirectUri = isBridgePlatform
        ? `${origin}/social-oauth-callback/${platform}`
        : `${origin}/oauth/callback/${platform}/`;

      const width  = 600;
      const height = 700;
      const left   = window.screenX + (window.outerWidth  - width)  / 2;
      const top    = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        "about:blank",
        `oauth_${platform}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        toast({ title: "Popup bloqueado", description: "Permita popups para este site e tente novamente.", variant: "destructive" });
        return;
      }

      const safePlatform = escapeHtml(platform);
      popup.document.write(
        `<html><head><title>Conectando ${safePlatform}...</title>` +
        `<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;` +
        `height:100vh;margin:0;background:#0f172a;color:white;text-align:center;}` +
        `.loader{border:4px solid #1e293b;border-top:4px solid #3b82f6;border-radius:50%;` +
        `width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 20px;}` +
        `@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}` +
        `h1{font-size:18px;margin:0;}</style></head>` +
        `<body><div><div class="loader"></div><h1>Conectando ao ${safePlatform}...</h1>` +
        `<p>Iniciando autenticação segura...</p></div></body></html>`
      );

      try {
        const META_PLATFORMS = ['threads', 'facebook', 'instagram', 'whatsapp'];
        let extraBody: Record<string, unknown> = {};

        if (META_PLATFORMS.includes(platform)) {
          const { appId, appSecret, source } = await fetchMetaAppId(platform);

          if (!appId) {
            popup.close();
            toast({
              title: "App ID do Threads não configurado",
              description:
                "Para o Threads, você DEVE usar o 'Threads App ID' específico. " +
                "No painel da Meta, vá em: Casos de Uso -> Threads API -> Configurações. " +
                "Não use o ID que aparece no topo da página.",
              variant: "destructive",
            });
            console.error("[THREADS] Erro: Threads App ID ausente. Guia: https://developers.facebook.com/docs/threads/getting-started");
            return;
          }

          extraBody = { client_id: appId, client_secret: appSecret };
        } else if (platform === 'tiktok') {
          // TikTok usa "client_key" — buscamos do banco antes de chamar a Edge Function
          let tikTokCreds = null;
          try {
            const { data } = await supabase
              .from('api_credentials')
              .select('credentials')
              .eq('user_id', user!.id)
              .eq('platform', 'tiktok')
              .maybeSingle();
            tikTokCreds = data?.credentials as Record<string, string | undefined> | undefined;
          } catch (e) {
          }

          const clientKey = tikTokCreds?.client_key?.trim() || tikTokCreds?.client_id?.trim();
          const clientSecret = tikTokCreds?.client_secret?.trim();

          if (!clientKey) {
            popup.close();
            toast({
              title: "TikTok Client Key não configurado",
              description: "Vá em Configurações → APIs → TikTok e salve o 'TikTok Client Key' antes de conectar.",
              variant: "destructive",
            });
            return;
          }

          extraBody = {
            client_key: clientKey,
            client_id: clientKey,     // fallback compat
            client_secret: clientSecret,
          };
        }

        const { data, error: aErr } = await safeInvoke('social-oauth-init', {
          body: { platform, redirect_uri: redirectUri, ...extraBody },
          timeoutMs: 20000,
        });

        if (aErr) {
          const safePlatform = escapeHtml(platform);
          const safeMessage = escapeHtml(aErr.message || 'Verifique se as credenciais estão salvas nas Configurações de API.');
          writeToPopupSafely(
            popup,
            `<html><head><title>Erro - ${safePlatform}</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:white;text-align:center;padding:20px;box-sizing:border-box;}h1{font-size:20px;margin:0 0 10px;}p{color:#94a3b8;margin:10px 0 20px;font-size:14px;}button{background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;}</style></head><body><div><div style="color:#ef4444;font-size:48px;margin-bottom:16px;">⚠️</div><h1>Erro ao conectar ${safePlatform}</h1><p>${safeMessage}</p><button onclick="window.close()">Fechar Janela</button></div></body></html>`
          );
          toast({
            title: "Configuração pendente",
            description: aErr.message || "Verifique se as APIs estão configuradas corretamente.",
            variant: "destructive",
          });
          return;
        }

        if (!data?.authUrl) {
          popup.close();
          toast({ title: "Erro", description: "URL de autenticação não recebida.", variant: "destructive" });
          return;
        }

        let finalUrl = data.authUrl;
        
        // CORREÇÃO CRÍTICA: threads.com é uma empresa diferente. O Threads da Meta usa .net
        if (platform === 'threads' && finalUrl.includes('threads.com')) {
          finalUrl = finalUrl.replace('threads.com', 'www.threads.net');
        }

        popup.location.href = finalUrl;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        writeToPopupSafely(
          popup,
          `<html><head><title>Falha de Conexão</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:white;text-align:center;padding:20px;box-sizing:border-box;}h1{font-size:20px;margin:0 0 10px;}p{color:#94a3b8;margin:10px 0 20px;font-size:14px;}button{background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;}</style></head><body><div><div style="font-size:48px;margin-bottom:16px;">🌐</div><h1>Falha de Conexão</h1><p>${escapeHtml(errorMessage)}</p><button onclick="window.close()">Fechar Janela</button></div></body></html>`
        );
        toast({ title: "Erro de rede", description: errorMessage, variant: "destructive" });
        return;
      }

      let isFinalized = false;

      const localOrigin = window.location.origin;
      const isLocalDev = localOrigin.startsWith('http://localhost:') || localOrigin.startsWith('http://127.0.0.1:');

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== localOrigin && !(isLocalDev && (event.origin === 'https://ghtkdkauseesambzqfrd.supabase.co' || event.origin === 'https://webradiovitoria.com.br'))) return;
        if (!event.data || typeof event.data !== 'object') return;
        if (event.data?.type !== 'oauth-complete' && event.data?.type !== 'oauth-callback') return;
        
        try {
          clearInterval(pollInterval);

          if (event.data?.type === "oauth-complete") {
            isFinalized = true;
            window.removeEventListener("message", handleMessage);
            clearInterval(pollInterval);
            await finalize(true);
            toast({ title: "Conta conectada!", description: `${platform} foi conectado com sucesso.` });
            return;
          }

          if (event.data?.type === "oauth-callback" && event.data?.url) {
            isFinalized = true;
            window.removeEventListener("message", handleMessage);
            clearInterval(pollInterval);
            
            try {
              const url = new URL(event.data.url);
              const code = url.searchParams.get("code");
              const state = url.searchParams.get("state");
              
              if (!code) {
                console.error("[OAUTH CALLBACK] Código não encontrado na URL:", event.data.url);
                throw new Error("Código de autorização não encontrado na URL de retorno.");
              }

              toast({ title: "Finalizando conexão...", description: "Trocando código por token de acesso." });

              const { data: cbData, error: cbErr } = await supabase.functions.invoke('social-oauth-callback', {
                body: { code, state, platform, redirect_uri: redirectUri }
              });

              if (cbErr) {
                let errorMsg = cbErr.message;
                try {
                  if (cbErr instanceof Error && 'context' in cbErr) {
                    interface ErrorContext { context?: { json?: () => Promise<{ error?: string }> } }
                    const context = (cbErr as Error & ErrorContext).context;
                    if (context && typeof context.json === 'function') {
                      const body = await context.json();
                      errorMsg = body.error || errorMsg;
                    }
                  }
                } catch (e) {
                }

                // If the state was already processed by the callback page's direct call, treat as success
                if (errorMsg.includes("Invalid or expired OAuth state")) {
                  await finalize(true);
                  toast({ title: "Sucesso!", description: `${platform} conectado com sucesso.` });
                  return;
                }

                console.error("[OAUTH CALLBACK ERROR] Erro detalhado:", errorMsg);
                throw new Error(errorMsg);
              }
              
              await finalize(true);
              toast({ title: "Sucesso!", description: `${platform} conectado com sucesso.` });
            } catch (err: unknown) {
              console.error("[OAUTH CALLBACK CRITICAL ERROR]", err);
              toast({ 
                title: "Erro na finalização", 
                description: (err instanceof Error ? err.message : undefined) || "Não foi possível completar a troca de tokens.",
                variant: "destructive" 
              });
              await finalize(false);
            }
          }
        } catch (err: unknown) {
          console.error("[OAUTH MESSAGE HANDLER ERROR]", err);
        }
      };

      window.addEventListener("message", handleMessage);

      const showToastForPlatform = () => {
        const savedPlatform = localStorage.getItem("oauth_platform");
        if (savedPlatform) {
          toast({ title: "Sucesso!", description: `${savedPlatform} conectado com sucesso.` });
          localStorage.removeItem("oauth_platform");
        }
      };

      const finalize = async (fromMessage = false) => {
        if (!fromMessage && isFinalized) return;
        isFinalized = true;
        clearInterval(pollInterval);
        window.removeEventListener("message", handleMessage);
        await refetch();
        if (!fromMessage) showToastForPlatform();
      };

      const pollInterval = setInterval(async () => {
        try {
          if (popup && popup.closed) { clearInterval(pollInterval); await finalize(); }
        } catch (e) { clearInterval(pollInterval); await finalize(); }
      }, 2000);

      setTimeout(() => finalize(), 300000);

    } catch (error) {
      toast({
        title: "Erro ao conectar",
        description: error instanceof Error ? error.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  const setPrimary = async (connectionId: string) => {
    if (!user) return;
    try {
      const conn = connections.find(c => c.id === connectionId);
      if (!conn) return;

      // Unset previous primary for this platform
      await supabase
        .from('social_connections')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('platform', conn.platform)
        .eq('is_primary', true);

      // Conexão sintética (Telegram/WhatsApp via API, sem row em social_connections)
      // → upsert um registro real para armazenar is_primary
      if (connectionId.startsWith('telegram-api-') || connectionId.startsWith('whatsapp-api-')) {
        const { error } = await supabase
          .from('social_connections')
          .upsert({
            user_id: user.id,
            platform: conn.platform,
            platform_user_id: conn.platform_user_id,
            page_name: conn.page_name || conn.platform,
            username: conn.username,
            is_connected: true,
            is_primary: true,
            followers_count: conn.followers_count,
            posts_count: conn.posts_count,
            profile_image_url: conn.profile_image_url || conn.profile_picture,
          }, { onConflict: 'user_id,platform' });

        if (error) throw error;
      } else {
        // Conexão real → update pelo ID (UUID)
        const { error } = await supabase
          .from('social_connections')
          .update({ is_primary: true })
          .eq('user_id', user.id)
          .eq('id', connectionId);

        if (error) throw error;
      }

      toast({ title: "Perfil principal definido", description: `${conn.page_name || conn.platform} será usado como padrão para publicações.` });
      await refetch();
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível definir o perfil principal.", variant: "destructive" });
    }
  };

  const disconnect = async (platformOrKey: string) => {
    if (!user) return;
    try {
      const parts        = platformOrKey.split('|');
      const platform     = parts[0];
      const connectionId = parts[1];

      if (platform === 'telegram' && (!connectionId || connectionId.startsWith('telegram-api-'))) {
        await Promise.all([
          supabase.from('api_credentials').delete().eq('user_id', user.id).eq('platform', 'telegram'),
          supabase.from('social_connections').delete().eq('user_id', user.id).eq('platform', 'telegram'),
        ]);
        await refetch();
        toast({ title: "Telegram desconectado", description: "Bot Token removido com sucesso." });
        return;
      }

      let query = supabase
        .from('social_connections')
        .update({
          is_connected:  false,
          is_primary:    false,
          access_token:  null,
          refresh_token: null,
          updated_at:    new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('platform', platform);

      if (connectionId) query = query.eq('id', connectionId) as typeof query;

      const { error } = await query;
      if (error) throw error;

      await refetch();
      toast({ title: "Conta desconectada", description: `${platform} foi desconectado com sucesso.` });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível desconectar.", variant: "destructive" });
    }
  };

  return { connections, loading: isLoading, initiateOAuth, disconnect, setPrimary, refetch };
}
