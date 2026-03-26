export function getThreadsOAuthUrl() {
  const clientId = import.meta.env.VITE_META_APP_ID;

  if (!clientId) {
    throw new Error("META_APP_ID não configurado");
  }

  const redirectUri = `${window.location.origin}/oauth/callback/threads`;

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "threads_basic");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", crypto.randomUUID());

  console.log("THREADS OAUTH URL:", url.toString());

  return url.toString();
}

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { platform: pathPlatform } = useParams<{ platform: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState("Processando autenticação...");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const isPopup = window.opener !== null;

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      // Platform can come from URL path (/oauth/callback/twitter), query (?platform=twitter), or localStorage
      const platform = pathPlatform || searchParams.get("platform") || localStorage.getItem("oauth_platform") || "";

      if (!code || !state) {
        setStatus("Parâmetros OAuth inválidos.");
        setError(true);
        if (!isPopup) {
          toast({ title: "Erro de autenticação", description: "Parâmetros OAuth inválidos.", variant: "destructive" });
          setTimeout(() => navigate("/dashboard"), 2000);
        }
        return;
      }

      try {
        setStatus("Trocando código por token...");

        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }

        const response = await fetch(
`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-oauth-callback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({ code, state, platform }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Falha na autenticação");
        }

        localStorage.removeItem("oauth_platform");

        setStatus(`${data.pageName || platform} conectado com sucesso!`);
        setDone(true);

        toast({
          title: "Conta conectada!",
          description: `${data.pageName || platform} foi conectado com sucesso.`,
        });

        // If opened as popup, notify parent and close
        if (isPopup) {
          try {
            // Send to parent. We use "*" to support localhost/127.0.0.1 origin mismatch common in Twitter OAuth
            window.opener?.postMessage({ type: "oauth-complete", platform }, "*");
          } catch (e) {
            // Error handling window postMessage
          }
          setTimeout(() => window.close(), 1500);
          return;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setStatus(msg);
        setError(true);

        toast({
          title: "Erro ao conectar",
          description: msg,
          variant: "destructive",
        });

        if (isPopup) {
          setTimeout(() => window.close(), 3000);
          return;
        }
      }

      if (!isPopup) {
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm mx-auto p-8">
        {done ? (
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        ) : error ? (
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        ) : (
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        )}
        <p className="text-lg font-medium">{status}</p>
        <p className="text-sm text-muted-foreground">
          {isPopup
            ? done ? "Esta janela será fechada automaticamente..." : error ? "Feche esta janela e tente novamente." : "Aguarde..."
            : "Redirecionando para o dashboard..."}
        </p>
        {isPopup && (error || done) && (
          <button onClick={() => window.close()} className="text-primary underline text-sm">
            Fechar janela
          </button>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;