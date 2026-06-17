import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

      // Deduplicate connections by platform + platform_user_id (keep the most complete one)
      const seenConns = new Map<string, SocialConnection>();
      for (const conn of oauthConnections) {
        const key = conn.platform_user_id
          ? `${conn.platform}-${conn.platform_user_id}`
          : conn.page_id
            ? `${conn.platform}-${conn.page_id}`
            : `${conn.platform}-${conn.id}`;
        const existing = seenConns.get(key);
        if (!existing || (!existing.profile_image_url && conn.profile_image_url) || (!existing.is_connected && conn.is_connected)) {
          seenConns.set(key, conn);
        }
      }
      const dedupedOAuth = Array.from(seenConns.values());

      const enrichedConnections: SocialConnection[] = dedupedOAuth.map(conn => {
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
        const totalFollowers = platformAccounts.reduce((sum, a) => sum + (Number(a.followers_count) || Number((a as { followers?: unknown }).followers) || 0), 0);
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

  const [realtimeError, setRealtimeError] = useState(false);
  useEffect(() => {
    if (!user || options.enabled === false) return;
    setRealtimeError(false);
    
    // Generate unique channel ID to avoid collisions
    const channelId = Math.random().toString(36).substring(7);
    const channelName = `connections-realtime-${channelId}`;
    
    const connectionsChannel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_connections' }, () =>
        queryClient.invalidateQueries({ queryKey: ['social_connections_all', user.id] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_credentials' }, () =>
        queryClient.invalidateQueries({ queryKey: ['social_connections_all', user.id] }));
    
    let hasReportedError = false;
    connectionsChannel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        if (!hasReportedError) {
          console.debug('Realtime unavailable (falling back to polling):', channelName);
        }
        hasReportedError = true;
        setRealtimeError(true);
      } else if (status === 'SUBSCRIBED') {
        hasReportedError = false;
        setRealtimeError(false);
      }
    });
    // Trigger a cache refetch on mount so data loads immediately
    queryClient.invalidateQueries({ queryKey: ['social_connections_all', user.id] });

    return () => { 
      supabase.removeChannel(connectionsChannel).catch(() => {}); 
    };
  }, [user, queryClient, options.enabled]);

  // Polling fallback when Realtime is unavailable
  useEffect(() => {
    if (!user || options.enabled === false) return;
    if (!realtimeError) return;
    let isRunning = false;
    const interval = setInterval(async () => {
      if (isRunning || !navigator.onLine) return;
      isRunning = true;
      try {
        await queryClient.invalidateQueries({ queryKey: ['social_connections_all', user.id] });
      } finally {
        isRunning = false;
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, queryClient, options.enabled, realtimeError]);

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

      // Plataformas que usam webradiovitoria.com.br como ponte por restrição de localhost nos apps.
      if (['linkedin', 'tiktok', 'threads', 'facebook', 'instagram', 'whatsapp', 'twitter', 'google', 'youtube'].includes(platform) && isLocal) {
        origin = "https://webradiovitoria.com.br";
        toast({
          title: "Ponte de Conexão Ativada",
          description: `Usando webradiovitoria.com.br para contornar a restrição de localhost do ${platform}.`,
        });
      } else if (isLocal) {
        let localHostname = window.location.hostname;
        if (['facebook', 'instagram', 'whatsapp', 'threads', 'google', 'youtube', 'tiktok', 'linkedin'].includes(platform)) localHostname = "localhost";
        origin = `http://${localHostname}${port}`;
      }

      const isWebRadioBridge = ['linkedin', 'tiktok', 'threads', 'facebook', 'instagram', 'whatsapp', 'twitter', 'google', 'youtube'].includes(platform) && isLocal;
      const redirectUri = `${origin}/oauth/callback/${platform}`;

      const width  = 600;
      const height = 700;
      const left   = window.screenX + (window.outerWidth  - width)  / 2;
      const top    = window.screenY + (window.outerHeight - height) / 2;

      const safePlatform = escapeHtml(platform);

      // Abre popup IMEDIATAMENTE (síncrono com o clique do usuário) p/ evitar bloqueio
      const LOADING_HTML = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;background:#f5f5f5"><p>Aguardando autoriza&ccedil;&atilde;o...</p></body></html>';
      let popup: Window | null = null;
      try {
        popup = window.open('about:blank', `oauth_${platform}`, `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
      } catch (e) {
        console.warn("[OAuth] Popup open failed:", e);
      }
      if (!popup) {
        toast({ title: "Popup bloqueado", description: "Permita popups para este site e tente novamente.", variant: "destructive" });
        return;
      }
      writeToPopupSafely(popup, LOADING_HTML);

      try {
        const META_PLATFORMS = ['threads', 'facebook', 'instagram', 'whatsapp'];
        let extraBody: Record<string, unknown> = {};

        if (META_PLATFORMS.includes(platform)) {
          const { appId, appSecret, source } = await fetchMetaAppId(platform);

          if (!appId) {
            toast({
              title: "App ID do Threads não configurado",
              description:
                "Para o Threads, você DEVE usar o 'Threads App ID' específico. " +
                "No painel da Meta, vá em: Casos de Uso -> Threads API -> Configurações. " +
                "Não use o ID que aparece no topo da página.",
              variant: "destructive",
            });
            console.error("[THREADS] Erro: Threads App ID ausente. Guia: https://developers.facebook.com/docs/threads/getting-started");
            popup.close();
            return;
          }

          extraBody = { client_id: appId, client_secret: appSecret };
        } else if (platform === 'tiktok') {
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
            toast({
              title: "TikTok Client Key não configurado",
              description: "Vá em Configurações → APIs → TikTok e salve o 'TikTok Client Key' antes de conectar.",
              variant: "destructive",
            });
            popup.close();
            return;
          }

          extraBody = {
            client_key: clientKey,
            client_id: clientKey,
            client_secret: clientSecret,
          };
        }

        const { data, error: aErr } = await safeInvoke('social-oauth-init', {
          body: { platform, redirect_uri: redirectUri, callback_domain: origin, ...extraBody },
          timeoutMs: 20000,
        });

        if (aErr) {
          const safeMessage = escapeHtml(aErr.message || 'Verifique se as credenciais estão salvas nas Configurações de API.');
          toast({
            title: "Configuração pendente",
            description: aErr.message || "Verifique se as APIs estão configuradas corretamente.",
            variant: "destructive",
          });
          popup.close();
          return;
        }

        if (!data?.authUrl) {
          toast({ title: "Erro", description: "URL de autenticação não recebida.", variant: "destructive" });
          popup.close();
          return;
        }

        let finalUrl = data.authUrl;
        
        // CORREÇÃO CRÍTICA: threads.com é uma empresa diferente. O Threads da Meta usa .net
        if (platform === 'threads' && finalUrl.includes('threads.com')) {
          finalUrl = finalUrl.replace('threads.com', 'www.threads.net');
        }

        // Navega popup para URL de autorização (about:blank → x.com é permitido)
        try {
          if (!popup.closed) {
            popup.location.href = finalUrl;
          } else {
            popup = window.open(finalUrl, `oauth_${platform}`, `width=${width},height=${height},left=${left},top=${top}`);
            if (!popup) {
              window.open(finalUrl, '_blank');
            }
          }
        } catch (navErr) {
          console.warn("[OAuth] Popup navigation failed, reopening:", navErr);
          popup = window.open(finalUrl, '_blank', `width=${width},height=${height},left=${left},top=${top}`);
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        toast({ title: "Erro de rede", description: errorMessage, variant: "destructive" });
        return;
      }

      let isFinalized = false;

      const localOrigin = window.location.origin;
      const isLocalDev = localOrigin.startsWith('http://localhost:') || localOrigin.startsWith('http://127.0.0.1:');

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== localOrigin && !(isLocalDev && (event.origin === 'https://webradiovitoria.com.br' || event.origin === 'https://ghtkdkauseesambzqfrd.supabase.co'))) return;
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

      let coopBlocked = false;
      const pollInterval = setInterval(async () => {
        if (coopBlocked) { clearInterval(pollInterval); return; }
        let isClosed = false;
        try {
          isClosed = popup ? popup.closed : true;
        } catch {
          coopBlocked = true;
          clearInterval(pollInterval);
          return;
        }
        if (isClosed) { clearInterval(pollInterval); await finalize(); }
      }, 4000);

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
      await (supabase as any)
        .from('social_connections')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('platform', conn.platform)
        .eq('is_primary', true);

      // Conexão sintética (Telegram/WhatsApp via API, sem row em social_connections)
      if (connectionId.startsWith('telegram-api-') || connectionId.startsWith('whatsapp-api-')) {
        const { error } = await ((supabase as any)
        .from("social_connections")
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
        }, { onConflict: 'user_id,platform,platform_user_id' }) as any);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('social_connections')
          .update({ is_primary: true } as any)
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
