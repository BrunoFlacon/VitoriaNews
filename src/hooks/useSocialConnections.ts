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
}

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
          .select('id, platform, is_connected, page_name, platform_user_id, token_expires_at, page_id, profile_image_url, profile_picture, followers_count, posts_count, username, metadata')
          .eq('user_id', user.id),
        (supabase as any)
          .from('social_accounts')
          .select('platform, platform_user_id, username, profile_picture, followers_count, followers, posts_count, page_name')
          .eq('user_id', user.id),
        supabase
          .from('api_credentials' as any)
          .select('platform, credentials')
          .eq('user_id', user.id)
          .in('platform', ['telegram', 'whatsapp']),
      ]);

      const oauthRes    = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
      const accountsRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
      const credsRes    = results[2].status === 'fulfilled' ? results[2].value : { data: [] };

      const oauthConnections = (oauthRes.data || []) as unknown as SocialConnection[];
      const accounts         = (accountsRes.data || []) as any[];

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

      let enrichedConnections: SocialConnection[] = oauthConnections.map(conn => {
        const acc = findAccount(conn);
        if (!acc) return conn;
        const cachedPic         = acc.profile_picture || null;
        const enrichedFollowers = acc.followers_count || (acc as any).followers || conn.followers_count;
        const enrichedPosts     = acc.posts_count || conn.posts_count;
        const enrichedPageName  = conn.page_name || acc.page_name || acc.username || null;
        return {
          ...conn,
          profile_image_url: cachedPic || conn.profile_image_url || null,
          profile_picture:   cachedPic || conn.profile_picture   || null,
          followers_count:   enrichedFollowers || conn.followers_count,
          posts_count:       enrichedPosts     || conn.posts_count,
          page_name:         enrichedPageName,
        };
      });

      const tgCreds: any = (credsRes.data || []).find((r: any) => r.platform === 'telegram')?.credentials;
      const waCreds: any = (credsRes.data || []).find((r: any) => r.platform === 'whatsapp')?.credentials;

      const hasTGToken = tgCreds && (tgCreds.bot_token?.trim() || tgCreds.token?.trim() || tgCreds.tokens?.length);
      const hasWAToken = waCreds && (waCreds.app_id?.trim() || waCreds.access_token?.trim());

      const alreadyHasTelegramBot  = enrichedConnections.some(c => c.platform === 'telegram'  && c.is_connected && Number(c.platform_user_id || 0) > 0);
      const alreadyHasWhatsAppConn = enrichedConnections.some(c => c.platform === 'whatsapp' && c.is_connected);

      let finalConnections = [...enrichedConnections];

      if (hasTGToken && !alreadyHasTelegramBot) {
        const platformAccounts = accounts.filter(a => a.platform === 'telegram');
        const firstAcc = platformAccounts.find(a =>
          (a.page_name?.toLowerCase().includes('newsbot') || a.username?.toLowerCase().includes('newsbot'))
          && Number(a.platform_user_id || 0) > 0
        ) || platformAccounts.find(a => Number(a.platform_user_id || 0) > 0) || platformAccounts[0];
        const totalFollowers = platformAccounts.reduce((sum, a) => sum + (Number(a.followers_count) || Number((a as any).followers) || 0), 0);
        const totalPosts     = platformAccounts.reduce((sum, a) => sum + (Number(a.posts_count) || 0), 0);
        const botToken = Array.isArray(tgCreds?.tokens) ? tgCreds.tokens[0] : (tgCreds?.bot_token || tgCreds?.token || '');
        finalConnections.push({
          id: `telegram-api-${user.id}`,
          platform: 'telegram',
          is_connected: true,
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
  }, [user, queryClient]);

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
        .from('api_credentials' as any)
        .select('credentials')
        .eq('user_id', user!.id)
        .eq('platform', p)
        .maybeSingle();

      if (error) {
        console.warn(`[META CREDS] Erro ao buscar '${p}':`, error.message);
        continue;
      }

      const creds     = (row as any)?.credentials;
      const appId     = creds?.app_id?.trim()     || creds?.client_id?.trim()     || null;
      const appSecret = creds?.app_secret?.trim() || creds?.client_secret?.trim() || null;

      if (appId) {
        console.log(`[META CREDS] app_id encontrado em '${p}': ${appId.substring(0, 5)}...`);
        return { appId, appSecret, source: p };
      }
    }

    console.warn(`[META CREDS] app_id NÃO encontrado. Verificados:`, platforms);
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

      // Threads + Ponte de Conexão (webradiovitoria.com.br)
      // O Threads não aceita localhost. Se estivermos em local, usamos o domínio de produção como ponte.
      if (platform === 'threads' && isLocal) {
        console.log("[THREADS] Ativando ponte de conexão via webradiovitoria.com.br");
        origin = "https://webradiovitoria.com.br";
        toast({
          title: "Ponte de Conexão Ativada",
          description: "Usando webradiovitoria.com.br para contornar a restrição de localhost do Threads.",
        });
      } else if (isLocal) {
        let localHostname = window.location.hostname;
        if (['twitter'].includes(platform)) localHostname = "127.0.0.1";
        else if (['facebook', 'instagram', 'whatsapp', 'threads', 'google', 'youtube'].includes(platform)) localHostname = "localhost";
        origin = `http://${localHostname}${port}`;
      }

      const redirectUri = `${origin}/oauth/callback/${platform}.html`;

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

      popup.document.write(
        `<html><head><title>Conectando ${platform}...</title>` +
        `<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;` +
        `height:100vh;margin:0;background:#0f172a;color:white;text-align:center;}` +
        `.loader{border:4px solid #1e293b;border-top:4px solid #3b82f6;border-radius:50%;` +
        `width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 20px;}` +
        `@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}` +
        `h1{font-size:18px;margin:0;}</style></head>` +
        `<body><div><div class="loader"></div><h1>Conectando ao ${platform}...</h1>` +
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

          console.log(`[OAUTH INIT] Plataforma: ${platform} | Fonte: ${source} | app_id: ${appId.substring(0, 5)}...`);
          console.warn("[THREADS] Se receber o erro 4476002, certifique-se de que está usando o ID da seção 'Threads API', não o ID geral do Meta.");
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
            console.warn('Failed to fetch TikTok credentials', e);
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
          try {
            popup.document.open();
            popup.document.write(`<html><head><title>Erro - ${platform}</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:white;text-align:center;padding:20px;box-sizing:border-box;}h1{font-size:20px;margin:0 0 10px;}p{color:#94a3b8;margin:10px 0 20px;font-size:14px;}button{background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;}</style></head><body><div><div style="color:#ef4444;font-size:48px;margin-bottom:16px;">⚠️</div><h1>Erro ao conectar ${platform}</h1><p>${(aErr.message || 'Verifique se as credenciais estão salvas nas Configurações de API.').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p><button onclick="window.close()">Fechar Janela</button></div></body></html>`);
            popup.document.close();
          } catch (writeErr) {
            try { popup.close(); } catch (_) {}
          }
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
          console.warn("[OAUTH] Corrigindo domínio threads.com para threads.net automaticamente.");
          finalUrl = finalUrl.replace('threads.com', 'www.threads.net');
        }

        popup.location.href = finalUrl;

      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        if (popup && !popup.closed) {
          try {
            popup.document.open();
            popup.document.write(`<html><head><title>Falha de Conexão</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:white;text-align:center;padding:20px;box-sizing:border-box;}h1{font-size:20px;margin:0 0 10px;}p{color:#94a3b8;margin:10px 0 20px;font-size:14px;}button{background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:bold;}</style></head><body><div><div style="font-size:48px;margin-bottom:16px;">🌐</div><h1>Falha de Conexão</h1><p>${errorMessage.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p><button onclick="window.close()">Fechar Janela</button></div></body></html>`);
            popup.document.close();
          } catch (_) {
            try { popup.close(); } catch (__) {}
          }
        }
        toast({ title: "Erro de rede", description: errorMessage, variant: "destructive" });
        return;
      }

      let isFinalized = false;

      const handleMessage = async (event: MessageEvent) => {
        // Padrão antigo: popup já finalizou tudo ou é outra origem
        if (event.data?.type === "oauth-complete") {
          isFinalized = true;
          window.removeEventListener("message", handleMessage);
          clearInterval(pollInterval);
          await finalize(true);
          toast({ title: "Conta conectada!", description: `${platform} foi conectado com sucesso.` });
          return;
        }

        // NOVO: Ponte de callback (GitHub Pages / webradiovitoria.com.br)
        if (event.data?.type === "oauth-callback" && event.data?.url) {
          isFinalized = true;
          window.removeEventListener("message", handleMessage);
          clearInterval(pollInterval);
          
          try {
            console.log(`[OAUTH CALLBACK] Processando retorno da ponte para: ${platform}`);
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
              console.error("[OAUTH CALLBACK ERROR] Erro na Edge Function:", cbErr);
              throw cbErr;
            }
            
            console.log("[OAUTH CALLBACK SUCCESS] Conexão finalizada com sucesso:", cbData);
            await finalize(true);
            toast({ title: "Sucesso!", description: `${platform} conectado com sucesso.` });
          } catch (err: any) {
            console.error("[OAUTH CALLBACK CRITICAL ERROR]", err);
            toast({ 
              title: "Erro na finalização", 
              description: err.message || "Não foi possível completar a troca de tokens.", 
              variant: "destructive" 
            });
            // Mesmo com erro, finalizamos o polling
            await finalize(false);
          }
        }
      };

      window.addEventListener("message", handleMessage);

      const finalize = async (fromMessage = false) => {
        if (!fromMessage && isFinalized) return;
        isFinalized = true;
        clearInterval(pollInterval);
        window.removeEventListener("message", handleMessage);
        await refetch();
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

  const disconnect = async (platformOrKey: string) => {
    if (!user) return;
    try {
      const parts        = platformOrKey.split('|');
      const platform     = parts[0];
      const connectionId = parts[1];

      if (platform === 'telegram' && (!connectionId || connectionId.startsWith('telegram-api-'))) {
        await supabase.from('api_credentials' as any).delete().eq('user_id', user.id).eq('platform', 'telegram');
        await refetch();
        toast({ title: "Telegram desconectado", description: "Bot Token removido com sucesso." });
        return;
      }

      let query = supabase
        .from('social_connections')
        .update({
          is_connected:  false,
          access_token:  null,
          refresh_token: null,
          updated_at:    new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('platform', platform);

      if (connectionId) query = query.eq('id', connectionId) as any;

      const { error } = await query;
      if (error) throw error;

      await refetch();
      toast({ title: "Conta desconectada", description: `${platform} foi desconectado com sucesso.` });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível desconectar.", variant: "destructive" });
    }
  };

  return { connections, loading: isLoading, initiateOAuth, disconnect, refetch };
}
