import { useState, useEffect } from 'react';
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
  followers_count?: number | null;
}

export function useSocialConnections() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchConnections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('social_connections')
        .select('id, platform, is_connected, page_name, platform_user_id, token_expires_at, page_id, profile_image_url, followers_count')
        .eq('user_id', user.id);

      if (error) throw error;
      setConnections((data || []) as unknown as SocialConnection[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

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
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-oauth-init`,
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
      const finalize = async () => {
        if (isFinalized) return;
        isFinalized = true;
        clearInterval(pollInterval);
        window.removeEventListener("message", handleMessage);
        await fetchConnections();
      };

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === "oauth-complete") {
          await finalize();
          toast({ title: "Conta conectada!", description: `${platform} foi conectado com sucesso.` });
        }
      };
      window.addEventListener("message", handleMessage);

      const pollInterval = setInterval(async () => {
        try {
          if (popup.closed) {
            await finalize();
          }
        } catch {}
      }, 1000);

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
