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
      throw new Error("Configuração Google/YouTube incompleta: client_id ou client_secret ausentes nas configurações.");
    }
  }
  if (["facebook", "instagram", "threads", "whatsapp", "meta"].includes(provider)) {
    if (!creds.app_id || !creds.app_secret) {
      throw new Error(`Configuração ${provider.toUpperCase()} incompleta: app_id ou app_secret ausentes nas configurações.`);
    }
  }
}

async function logOAuth(supabase: any, data: { user_id: string; provider: string; stage: string; request_payload?: any; response_payload?: any }) {
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
  }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return oauthError("unknown", "auth", "Authorization required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return oauthError("unknown", "auth", "Invalid authentication");

    const { platform, redirect_uri } = await req.json();
    if (!platform || !redirect_uri) return oauthError(platform || "unknown", "init", "platform and redirect_uri are required");

    // Fetch user credentials
    const getPlatformCreds = async (p: string) => {
      const { data } = await supabase.from("api_credentials").select("credentials").eq("user_id", user.id).eq("platform", p).maybeSingle();
      return data?.credentials as Record<string, string> | null;
    };

    let creds: any = await getPlatformCreds(platform) || {};

    // Smart lookup with fallbacks
    if (["instagram", "threads", "whatsapp"].includes(platform)) {
      const fbCreds = await getPlatformCreds("facebook") || {};
      const metaCreds = await getPlatformCreds("meta") || {};
      creds = { ...fbCreds, ...metaCreds, ...creds };
    } else if (platform === "youtube" || platform === "google") {
      const gCreds = await getPlatformCreds("google") || {};
      const yCreds = await getPlatformCreds("youtube") || {};
      const cloudCreds = await getPlatformCreds("google_cloud") || {};
      creds = { ...cloudCreds, ...yCreds, ...gCreds, ...creds };
    }

    // Helper to get raw value with environment fallback
    const getVal = (userKey: string, envKey: string) => {
      const raw = creds?.[userKey] || Deno.env.get(envKey);
      if (typeof raw === 'string') {
        const t = raw.trim();
        if (!t || t.toLowerCase() === 'undefined' || t.toLowerCase() === 'null') return null;
        return t;
      }
      return raw || null;
    };

    // Format credentials for validation
    const formattedCreds: any = {
      client_id: getVal("client_id", "GOOGLE_CLIENT_ID") || getVal("youtube_id", "GOOGLE_CLIENT_ID"),
      client_secret: getVal("client_secret", "GOOGLE_CLIENT_SECRET"),
      app_id: getVal("app_id", "META_APP_ID") || getVal("client_id", "THREADS_CLIENT_ID"),
      app_secret: getVal("app_secret", "META_APP_SECRET") || getVal("client_secret", "THREADS_CLIENT_SECRET"),
    };

    validateOAuthConfig(platform, formattedCreds);

    // Crypto state
    const state = crypto.randomUUID().replace(/-/g, "");
    await supabase.from("oauth_states").insert({ user_id: user.id, platform, state, redirect_uri });

    let authUrl = "";

    if (platform === "google" || platform === "youtube") {
      // Unifica os escopos do YouTube e do Google Business (Maps, etc) para pedir tudo numa única vez
      const scopes = "openid profile email https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/business.manage";

      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: formattedCreds.client_id,
        redirect_uri: redirect_uri,
        response_type: "code",
        scope: scopes,
        access_type: "offline",
        prompt: "consent select_account",
        state: state
      });
    } else if (["facebook", "instagram", "whatsapp"].includes(platform)) {
      const scopes = platform === "instagram"
        ? "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement"
        : platform === "whatsapp" 
          ? "whatsapp_business_management,whatsapp_business_messaging,business_management"
          : "pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata";
      
      authUrl = `https://www.facebook.com/v21.0/dialog/oauth?` + new URLSearchParams({
        client_id: formattedCreds.app_id,
        redirect_uri: redirect_uri,
        scope: scopes,
        state: state,
        response_type: "code"
      });
    } else if (platform === "threads") {
      // Re-read threads creds directly to ensure app_id is not lost in merge
      const threadsCreds = await getPlatformCreds("threads") || {};
      const fbCreds = await getPlatformCreds("facebook") || {};
      const metaCreds = await getPlatformCreds("meta") || {};
      const mergedThreads = { ...fbCreds, ...metaCreds, ...threadsCreds };

      // Use a robust lookup with fallbacks to ENV
      const dbAppId = mergedThreads.app_id || mergedThreads.client_id;
      const envAppId = Deno.env.get("META_APP_ID") || Deno.env.get("THREADS_CLIENT_ID");
      const threadsAppId = dbAppId || envAppId || null;

      console.log(`[THREADS INIT] Source: ${dbAppId ? "DATABASE" : (envAppId ? "ENVIRONMENT" : "NONE")}`);
      console.log(`[THREADS INIT] Threads App ID Prefix: ${threadsAppId ? threadsAppId.substring(0, 5) + "..." : "NULL"}`);

      if (!threadsAppId) {
        throw new Error("Threads App ID (app_id) não encontrado. Salve as credenciais do Threads na aba de APIs ou configure META_APP_ID nos Secrets.");
      }

      // Manual construction to be 100% sure of the format
      const finalAppId = threadsAppId.trim();
      const encodedRedirect = encodeURIComponent(redirect_uri);
      const encodedState = encodeURIComponent(state);
      
      // Simplest possible scope first: threads_basic
      const scope = "threads_basic,threads_content_publish";
      const encodedScope = encodeURIComponent(scope);

      // Sending both client_id and app_id as some Meta endpoints are inconsistent
      authUrl = `https://www.threads.net/oauth/authorize?client_id=${finalAppId}&app_id=${finalAppId}&redirect_uri=${encodedRedirect}&scope=${encodedScope}&state=${encodedState}&response_type=code`;
      
      console.log(`[THREADS INIT] Generated URL (Manual): ${authUrl.split('?')[0]}?client_id=${finalAppId.substring(0, 5)}...`);

    } else if (platform === "twitter") {
      const twitterKey = getVal("client_id", "TWITTER_CONSUMER_KEY");
      if (!twitterKey) throw new Error("Client ID do X (Twitter) não configurado.");
      
      const verifierChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let codeVerifier = '';
      for (let i = 0; i < 64; i++) codeVerifier += verifierChars.charAt(Math.floor(Math.random() * verifierChars.length));

      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const hash = await crypto.subtle.digest("SHA-256", data);
      const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

      await supabase.from("oauth_states").update({ code_verifier: codeVerifier }).eq("state", state);
      
      const scopes = "tweet.read tweet.write users.read offline.access dm.read dm.write"; 
      authUrl = `https://twitter.com/i/oauth2/authorize?` + new URLSearchParams({
        response_type: "code",
        client_id: twitterKey,
        redirect_uri: redirect_uri,
        scope: scopes,
        state: state,
        code_challenge: challenge,
        code_challenge_method: "S256"
      });
    } else {
      // Fallback para as outras (LinkedIn, TikTok, etc - mantendo a lógica anterior simplificada)
      const clientId = formattedCreds.app_id || formattedCreds.client_id || getVal("client_id", `${platform.toUpperCase()}_CLIENT_ID`);
      if (!clientId) throw new Error(`Client ID para ${platform} não encontrado.`);
      
      const endpoints: any = {
        linkedin: "https://www.linkedin.com/oauth/v2/authorization",
        tiktok: "https://www.tiktok.com/v2/auth/authorize/",
        pinterest: "https://www.pinterest.com/oauth/",
        snapchat: "https://accounts.snapchat.com/login/oauth2/authorize"
      };
      
      if (!endpoints[platform]) throw new Error(`Plataforma '${platform}' não suportada para OAuth`);
      
      authUrl = `${endpoints[platform]}?` + new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirect_uri,
        state: state,
        response_type: "code",
        scope: platform === "linkedin" ? "openid profile email w_member_social" : ""
      });
    }

    console.log(`[OAUTH INIT] Platform: ${platform}`);
    console.log(`[OAUTH INIT] Raw Creds keys:`, Object.keys(creds));
    console.log(`[OAUTH INIT] Formatted Creds:`, {
       client_id: formattedCreds.client_id ? "***" + formattedCreds.client_id.slice(-4) : null,
       app_id: formattedCreds.app_id,
       has_secret: !!formattedCreds.app_secret
    });

    await logOAuth(supabase, {
      user_id: user.id,
      provider: platform,
      stage: "init",
      request_payload: { platform, redirect_uri, state, debug_app_id: formattedCreds.app_id },
      response_payload: { authUrl }
    });

    console.log(`[OAUTH INIT] Generated Auth URL:`, authUrl);

    return new Response(JSON.stringify({ 
      authUrl, 
      state,
      debug: {
        app_id: formattedCreds.app_id,
        keys: Object.keys(creds)
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in social-oauth-init:", error);
    return oauthError("unknown", "init", error);
  }
});
