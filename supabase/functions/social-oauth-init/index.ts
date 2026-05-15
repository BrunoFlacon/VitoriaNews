// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- HELPERS ---
function validateOAuthConfig(provider: string, creds: any) {
  if (provider === "google" || provider === "youtube") {
    if (!creds.client_id || !creds.client_secret) {
      throw new Error("Configuração Google/YouTube incompleta: client_id ou client_secret ausentes.");
    }
  }
  if (["facebook", "instagram", "threads", "whatsapp", "meta"].includes(provider)) {
    if (!creds.app_id || !creds.app_secret) {
      throw new Error(`Configuração ${provider.toUpperCase()} incompleta: app_id ou app_secret ausentes.`);
    }
  }
}

async function logOAuth(supabase: any, data: {
  user_id: string;
  provider: string;
  stage: string;
  request_payload?: any;
  response_payload?: any;
}) {
  try {
    await supabase.from("oauth_logs").insert(data);
  } catch (e) {
    console.warn("Falha ao gravar log de OAuth:", e);
  }
}

function oauthError(provider: string, stage: string, error: any) {
  return new Response(JSON.stringify({
    success: false,
    provider,
    stage,
    error: error.message || error,
  }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Gerador de PKCE (RFC 7636)
async function generatePKCE() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let verifier = "";
  for (let i = 0; i < 64; i++) {
    verifier += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
    
  return { verifier, challenge };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return oauthError("unknown", "auth", "Authorization required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return oauthError("unknown", "auth", "Invalid authentication");

    const body = await req.json();
    const platform     = body.platform     as string | undefined;
    const redirect_uri = body.redirect_uri as string | undefined;
    const bodyClientId     = (body.client_id     as string | undefined)?.trim() || null;
    const bodyClientSecret = (body.client_secret as string | undefined)?.trim() || null;

    if (!platform || !redirect_uri) {
      return oauthError(platform || "unknown", "init", "platform e redirect_uri são obrigatórios");
    }

    // Busca credenciais salvas no banco
    const getPlatformCreds = async (p: string) => {
      const { data } = await supabase
        .from("api_credentials")
        .select("credentials")
        .eq("user_id", user.id)
        .eq("platform", p)
        .maybeSingle();
      return data?.credentials as Record<string, string> | null;
    };

    let creds: any = await getPlatformCreds(platform) || {};

    // Fallbacks
    if (["instagram", "threads", "whatsapp"].includes(platform)) {
      const fbCreds   = await getPlatformCreds("facebook") || {};
      const metaCreds = await getPlatformCreds("meta")     || {};
      creds = { ...fbCreds, ...metaCreds, ...creds };
    } else if (platform === "youtube" || platform === "google") {
      const gCreds     = await getPlatformCreds("google")       || {};
      const yCreds     = await getPlatformCreds("youtube")      || {};
      const cloudCreds = await getPlatformCreds("google_cloud") || {};
      creds = { ...cloudCreds, ...yCreds, ...gCreds, ...creds };
    }

    const getVal = (userKey: string, envKey: string): string | null => {
      const raw = creds?.[userKey] || Deno.env.get(envKey);
      if (typeof raw === "string") {
        const t = raw.trim();
        if (!t || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return null;
        return t;
      }
      return raw || null;
    };

    const formattedCreds: any = {
      client_id:     getVal("client_id", "GOOGLE_CLIENT_ID") || getVal("youtube_id", "GOOGLE_CLIENT_ID"),
      client_secret: getVal("client_secret", "GOOGLE_CLIENT_SECRET"),
      app_id:        getVal("app_id", "META_APP_ID") || getVal("client_id", "THREADS_CLIENT_ID"),
      app_secret:    getVal("app_secret", "META_APP_SECRET") || getVal("client_secret", "THREADS_CLIENT_SECRET"),
    };

    // --- PKCE ---
    let pkce: { verifier: string; challenge: string } | null = null;
    if (platform === "tiktok" || platform === "twitter") {
      pkce = await generatePKCE();
    }

    const stateId = crypto.randomUUID().replace(/-/g, "");
    // Enviamos o verifier no state para máxima segurança (state~verifier)
    const state = pkce ? `${stateId}~${pkce.verifier}` : stateId;

    // Salva no banco (ID simples)
    await supabase.from("oauth_states").insert({ 
      user_id: user.id, 
      platform, 
      state: stateId, 
      redirect_uri,
      code_verifier: pkce?.verifier || null
    });

    let authUrl = "";

    // =========================================================================
    if (platform === "google" || platform === "youtube") {
    // =========================================================================
      validateOAuthConfig(platform, formattedCreds);
      const scopes = ["openid", "profile", "email", "https://www.googleapis.com/auth/youtube"].join(" ");
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: formattedCreds.client_id,
        redirect_uri,
        response_type: "code",
        scope: scopes,
        access_type: "offline",
        prompt: "consent",
        state,
      });

    // =========================================================================
    } else if (["facebook", "instagram", "whatsapp"].includes(platform)) {
    // =========================================================================
      validateOAuthConfig(platform, formattedCreds);
      authUrl = `https://www.facebook.com/v21.0/dialog/oauth?` + new URLSearchParams({
        client_id: formattedCreds.app_id,
        redirect_uri,
        scope: platform === "instagram" ? "instagram_basic,instagram_content_publish" : "pages_show_list,pages_read_engagement",
        state,
        response_type: "code",
      });

    // =========================================================================
    } else if (platform === "threads") {
    // =========================================================================
      const threadsAppId = bodyClientId || formattedCreds.app_id;
      if (!threadsAppId) throw new Error("Threads App ID não configurado.");
      authUrl = `https://www.threads.net/oauth/authorize?` + new URLSearchParams({
        client_id: threadsAppId,
        redirect_uri,
        scope: "threads_basic,threads_content_publish",
        state,
        response_type: "code",
      });

    // =========================================================================
    } else if (platform === "twitter") {
    // =========================================================================
      const twitterKey = getVal("client_id", "TWITTER_CLIENT_ID");
      if (!twitterKey) throw new Error("Client ID do X (Twitter) não configurado.");
      authUrl = `https://twitter.com/i/oauth2/authorize?` + new URLSearchParams({
        response_type: "code",
        client_id: twitterKey,
        redirect_uri,
        scope: "tweet.read tweet.write users.read offline.access",
        state,
        code_challenge: pkce!.challenge,
        code_challenge_method: "S256",
      });

    // =========================================================================
    } else if (platform === "tiktok") {
    // =========================================================================
      // O TikTok v2 EXIGE client_key (não client_id)
      const tiktokClientKey = getVal("client_key", "TIKTOK_CLIENT_KEY") || getVal("client_id", "TIKTOK_CLIENT_KEY");
      if (!tiktokClientKey) throw new Error("TikTok Client Key não configurado.");

      authUrl = `https://www.tiktok.com/v2/auth/authorize/?` + new URLSearchParams({
        client_key: tiktokClientKey,
        response_type: "code",
        scope: "user.info.basic,video.list,video.publish",
        redirect_uri,
        state,
        code_challenge: pkce!.challenge,
        code_challenge_method: "S256",
      });

    // =========================================================================
    } else if (platform === "linkedin") {
    // =========================================================================
      const clientId = getVal("client_id", "LINKEDIN_CLIENT_ID");
      authUrl = `https://www.linkedin.com/oauth/v2/authorization?` + new URLSearchParams({
        client_id: clientId!,
        redirect_uri,
        state,
        response_type: "code",
        scope: "openid profile email w_member_social",
      });

    // =========================================================================
    } else if (platform === "reddit") {
    // =========================================================================
      const clientId = getVal("client_id", "REDDIT_CLIENT_ID");
      authUrl = `https://www.reddit.com/api/v1/authorize?` + new URLSearchParams({
        client_id: clientId!,
        response_type: "code",
        state,
        redirect_uri,
        duration: "permanent",
        scope: "identity,read,submit",
      });
    }

    return new Response(JSON.stringify({ authUrl, state }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro em social-oauth-init:", error);
    return oauthError("unknown", "init", error);
  }
});
