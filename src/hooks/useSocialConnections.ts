import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  metadata?: Record<string, any> | null;
}

export function useSocialConnections() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const lastFetchRef = useRef<number>(0);
  const fetchConnections = useCallback(async () => {
    if (!user) return;
    
    // Simple debounce: don't fetch more than once every 2 seconds unless forced
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) return;
    lastFetchRef.current = now;

    try {
      setLoading(true);
      // 1. Fetch OAuth-based connections
      const { data, error } = await supabase
        .from('social_connections')
        .select('id, platform, is_connected, page_name, platform_user_id, token_expires_at, page_id, profile_image_url, profile_picture, followers_count, posts_count, username, metadata')
        .eq('user_id', user.id);

      if (error) throw error;

      const oauthConnections = (data || []) as unknown as SocialConnection[];

      // 2. Fetch ALL social_accounts to enrich connections with cached data
      // social_accounts has non-expiring Supabase Storage URLs + real follower counts
      const { data: allAccounts } = await supabase
        .from('social_accounts')
        .select('platform, platform_user_id, username, profile_picture, followers_count, followers, posts_count, page_name')
        .eq('user_id', user.id);

      const accounts = allAccounts || [];

      // Helper: find best matching social_account for a connection (match by page_id or platform_user_id)
      const findAccount = (conn: SocialConnection) => {
        // First try exact match by page_id (Facebook pages)
        if (conn.page_id) {
          const byPageId = accounts.find(a => a.platform === conn.platform && a.platform_user_id === conn.page_id);
          if (byPageId) return byPageId;
        }
        // Then try by platform_user_id
        if (conn.platform_user_id) {
          const byUserId = accounts.find(a => a.platform === conn.platform && a.platform_user_id === conn.platform_user_id);
          if (byUserId) return byUserId;
        }
        // Fallback: first account for this platform
        return accounts.find(a => a.platform === conn.platform) || null;
      };

      // 3. Enrich each OAuth connection with cached data from social_accounts
      let enrichedConnections: SocialConnection[] = oauthConnections.map(conn => {
        const acc = findAccount(conn);
        if (!acc) return conn;

        const cachedPic = acc.profile_picture || null;
        const enrichedFollowers = acc.followers_count ?? (acc as any).followers ?? conn.followers_count;
        const enrichedPosts = acc.posts_count ?? conn.posts_count;
        const enrichedPageName = conn.page_name || acc.page_name || acc.username || null;

        return {
          ...conn,
          // Use cached (Supabase Storage) URL if available, otherwise keep existing
          profile_image_url: cachedPic || conn.profile_image_url || null,
          profile_picture: cachedPic || conn.profile_picture || null,
          followers_count: enrichedFollowers ?? conn.followers_count,
          posts_count: enrichedPosts ?? conn.posts_count,
          page_name: enrichedPageName,
        };
      });

      const { data: credsData } = await supabase
        .from('api_credentials' as any)
        .select('platform, credentials')
        .eq('user_id', user.id)
        .in('platform', ['telegram', 'whatsapp']) as { data: any[] | null };

      const tgCreds: any = credsData?.find(r => r.platform === 'telegram')?.credentials;
      const waCreds: any = credsData?.find(r => r.platform === 'whatsapp')?.credentials;

      const hasTGToken = tgCreds &&
        (typeof tgCreds.bot_token === 'string' && tgCreds.bot_token.trim() !== '' ||
         typeof tgCreds.token === 'string' && tgCreds.token.trim() !== '' ||
         (Array.isArray(tgCreds.tokens) && tgCreds.tokens.length > 0));

      const hasWAToken = waCreds &&
        (typeof waCreds.app_id === 'string' && waCreds.app_id.trim() !== '' ||
         typeof waCreds.access_token === 'string' && waCreds.access_token.trim() !== '');

      // 5. Inject synthetic connections if missing
      const alreadyHasTelegramBot = enrichedConnections.some(c => 
        c.platform === 'telegram' && 
        c.is_connected && 
        Number(c.platform_user_id || 0) > 0
      );
      const alreadyHasWhatsAppConn = enrichedConnections.some(c => c.platform === 'whatsapp' && c.is_connected);

      let finalConnections = [...enrichedConnections];

      if ((hasTGToken && !alreadyHasTelegramBot) || (hasWAToken && !alreadyHasWhatsAppConn)) {
        // Use already-fetched accounts (filtered by platform below)

        if (hasTGToken && !alreadyHasTelegramBot) {
          const platformAccounts = accounts.filter(a => a.platform === 'telegram');
          // Prioritize WebRadioVitoria_Newsbot specifically if available
          const firstAcc = platformAccounts.find(a => 
            (a.page_name?.toLowerCase().includes('newsbot') || a.username?.toLowerCase().includes('newsbot')) && 
            Number(a.platform_user_id || 0) > 0
          ) || platformAccounts.find(a => Number(a.platform_user_id || 0) > 0) || platformAccounts[0];
          
          const totalFollowers = platformAccounts.reduce((sum, a) => sum + (Number(a.followers_count) || Number((a as any).followers) || 0), 0);
          const totalPosts = platformAccounts.reduce((sum, a) => sum + (Number(a.posts_count) || 0), 0);
          const botToken: string = Array.isArray(tgCreds?.tokens) ? tgCreds.tokens[0] : (tgCreds?.bot_token || tgCreds?.token || '');
          
          finalConnections.push({
            id: `telegram-api-${user.id}`,
            platform: 'telegram',
            is_connected: true,
            page_name: firstAcc?.username ? `@${firstAcc.username}` : 'Bot Telegram',
            platform_user_id: firstAcc?.platform_user_id || null,
            token_expires_at: null,
            page_id: null,
            profile_image_url: firstAcc?.profile_picture || null,
            profile_picture: firstAcc?.profile_picture || null,
            followers_count: totalFollowers,
            posts_count: totalPosts,
            username: firstAcc?.username || null,
            metadata: { from_api_credentials: true, bot_token_preview: botToken ? botToken.slice(0,8) + '...' : '' },
          });
        }

        if (hasWAToken && !alreadyHasWhatsAppConn) {
          const platformAccounts = accounts.filter(a => a.platform === 'whatsapp');
          const totalFollowers = platformAccounts.reduce((sum, a) => sum + (Number(a.followers_count) || 0), 0);
          const totalPosts = platformAccounts.reduce((sum, a) => sum + (Number(a.posts_count) || 0), 0);
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
            profile_picture: firstAcc?.profile_picture || null,
            followers_count: totalFollowers,
            posts_count: totalPosts,
            username: firstAcc?.username || null,
            metadata: { from_api_credentials: true },
          });
        }
      }
      
      setConnections(finalConnections);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnections();

    // Listen for changes in both tables to keep UI in sync across different component instances
    const connectionsChannel = supabase
      .channel('connections-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'social_connections' },
        () => fetchConnections()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'api_credentials' },
        () => fetchConnections()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(connectionsChannel);
    };
  }, [user, fetchConnections]);

  const initiateOAuth = async (platform: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem("oauth_platform", platform);

      // Use current origin for OAuth callback to avoid "Connection Refused" if port 8081 is not used
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      // X/Twitter strictly wants 127.0.0.1, others prefer localhost or are fine with it
      let localHostname = window.location.hostname;
      if (['twitter'].includes(platform)) {
        localHostname = "127.0.0.1";
      } else if (['facebook', 'instagram', 'whatsapp', 'threads', 'google', 'youtube'].includes(platform)) {
        localHostname = "localhost";
      }

      // Origin with current port (unless it's default 80/443)
      const port = window.location.port ? `:${window.location.port}` : "";
      const origin = isLocal
        ? `http://${localHostname}${port}`
        : window.location.origin;
        
      const redirectUri = `${origin}/oauth/callback/${platform}`;
      
      // Open OAuth in popup window immediately to prevent browser blocking
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        "about:blank",
        `oauth_${platform}`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        toast({
          title: "Popup bloqueado",
          description: "Permita popups para este site e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Show loading in popup
      popup.document.write(`
        <html>
          <head>
            <title>Conectando ${platform}...</title>
            <style>
              body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; text-align: center; }
              .loader { border: 4px solid #1e293b; border-top: 4px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              h1 { font-size: 18px; margin: 0; }
            </style>
          </head>
          <body>
            <div>
              <div class="loader"></div>
              <h1>Conectando ao ${platform}...</h1>
              <p>Iniciando autenticação segura...</p>
            </div>
          </body>
        </html>
      `);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ghtkdkauseesambzqfrd.supabase.co';
        const response = await fetch(
          `${baseUrl}/functions/v1/social-oauth-init`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({ platform, redirect_uri: redirectUri }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);
        const data = await response.json().catch(() => ({ error: "Resposta inválida do servidor" }));

        if (!response.ok) {
          console.error(`Oauth Init Error (${response.status}):`, data);
          
          popup.document.body.innerHTML = `
            <div style="font-family: sans-serif; padding: 20px; text-align: center; background: #0f172a; color: white; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <div style="color: #ef4444; font-size: 48px; margin-bottom: 20px;">⚠️</div>
              <h1 style="font-size: 20px;">Erro ao conectar ${platform}</h1>
              <p style="color: #94a3b8; margin: 10px 0 20px;">${data.error || `Erro HTTP ${response.status}`}</p>
              <button onclick="window.close()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">Fechar Janela</button>
            </div>
          `;

          if (data.requiresToken || response.status === 400) {
            toast({ 
              title: "Configuração pendente", 
              description: data.error || "Verifique se as APIs estão configuradas corretamente nas Configurações.",
              variant: "destructive"
            });
            return;
          }
          
          toast({
            title: "Erro de inicialização",
            description: data.error || "Erro ao iniciar conexão.",
            variant: "destructive",
          });
          return;
        }

        if (!data.authUrl) {
          popup.close();
          toast({ title: "Erro", description: "URL de autenticação não recebida.", variant: "destructive" });
          return;
        }

        popup.location.href = data.authUrl;

      } catch (error: any) {
        clearTimeout(timeoutId);
        const errorMsg = error.name === 'AbortError' 
          ? "A requisição demorou muito para responder."
          : "Erro de rede ao conectar com as Edge Functions.";

        try {
          if (popup && !popup.closed) {
            popup.document.body.innerHTML = `
              <div style="font-family: sans-serif; padding: 20px; text-align: center; background: #0f172a; color: white; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="color: #ef4444; font-size: 48px; margin-bottom: 20px;">🌐</div>
                <h1 style="font-size: 20px;">Falha de Conexão</h1>
                <p style="color: #94a3b8; margin: 10px 0 20px;">${errorMsg}</p>
                <button onclick="window.close()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">Fechar Janela</button>
              </div>
            `;
          }
        } catch (e) {}

        toast({ title: "Erro de rede", description: errorMsg, variant: "destructive" });
        return;
      }

      let isFinalized = false;

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "oauth-complete") {
          // Send signal and return immediately
          isFinalized = true;
          window.removeEventListener("message", handleMessage);
          clearInterval(pollInterval);
          
          // Execute finalize in a background-like task
          (async () => {
            await finalize(true);
            toast({ title: "Conta conectada!", description: `${platform} foi conectado com sucesso.` });
          })();
        }
      };
      window.addEventListener("message", handleMessage);

      // Finalize should take a 'triggered' flag to avoid double recursion
      const finalize = async (fromMessage = false) => {
        if (!fromMessage && isFinalized) return;
        isFinalized = true;
        clearInterval(pollInterval);
        window.removeEventListener("message", handleMessage);
        await fetchConnections();
      };

      const pollInterval = setInterval(async () => {
        try {
          if (popup && popup.closed) {
            clearInterval(pollInterval);
            await finalize();
          }
        } catch (e) {
          // If we can't access popup (cross-origin), just wait for it to close
          clearInterval(pollInterval);
          await finalize();
        }
      }, 2000); // Increased interval to 2s to reduce overhead

      setTimeout(() => {
        finalize();
      }, 300000);

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
      // Support both 'platform' and 'platform|connectionId' formats
      const parts = platformOrKey.split('|');
      const platform = parts[0];
      const connectionId = parts[1]; // may be undefined

      // Telegram uses api_credentials (not social_connections) for its "connection"
      const isTelegramSynthetic = platform === 'telegram' &&
        (!connectionId || connectionId.startsWith('telegram-api-'));

      if (isTelegramSynthetic) {
        await supabase
          .from('api_credentials' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('platform', 'telegram');
        await fetchConnections();
        toast({ title: "Telegram desconectado", description: "Bot Token removido com sucesso." });
        return;
      }

      let query = supabase
        .from('social_connections')
        .update({ 
          is_connected: false, 
          access_token: null, 
          refresh_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('platform', platform);
      
      if (connectionId) {
        query = query.eq('id', connectionId) as any;
      }

      const { error } = await query;

      if (error) throw error;
      await fetchConnections();
      toast({ title: "Conta desconectada", description: `${platform} foi desconectado com sucesso.` });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível desconectar.", variant: "destructive" });
    }
  };

  return {
    connections,
    loading,
    initiateOAuth,
    disconnect,
    refetch: fetchConnections,
  };
}
