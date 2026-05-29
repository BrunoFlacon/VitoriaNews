// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getAuthUrl as getGoogleAuthUrl } from "../_shared/oauth/providers/google.ts";
import { getAuthUrl as getMetaAuthUrl } from "../_shared/oauth/providers/meta.ts";
import { getAuthUrl as getTwitterAuthUrl } from "../_shared/oauth/providers/twitter.ts";
import { getAuthUrl as getTiktokAuthUrl } from "../_shared/oauth/providers/tiktok.ts";
import { getAuthUrl as getLinkedinAuthUrl } from "../_shared/oauth/providers/linkedin.ts";
import { getAuthUrl as getRedditAuthUrl } from "../_shared/oauth/providers/reddit.ts";
import { getAuthUrl as getSpotifyAuthUrl } from "../_shared/oauth/providers/spotify.ts";
import { getAuthUrl as getKwaiAuthUrl } from "../_shared/oauth/providers/kwai.ts";
import { getAuthUrl as getTruthSocialAuthUrl } from "../_shared/oauth/providers/truth_social.ts";
import { resolveCorsOrigin } from "../_shared/cors.ts";

declare const Deno: any;

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
});

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

function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== "object") return payload;
  const sensitive = ["access_token", "refresh_token", "code", "client_secret", "app_secret", "token", "accessToken", "refreshToken", "authorization_code"];
  const sanitized: any = Array.isArray(payload) ? [] : {};
  for (const [key, value] of Object.entries(payload)) {
    if (sensitive.includes(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

async function logOAuth(supabase: any, data: {
  user_id: string;
  provider: string;
  stage: string;
  request_payload?: any;
  response_payload?: any;
}) {
  try {
    await supabase.from("oauth_logs").insert({
      ...data,
      request_payload: sanitizePayload(data.request_payload),
      response_payload: sanitizePayload(data.response_payload),
    });
  } catch (e) {
    console.warn("Falha ao gravar log de OAuth:", e);
  }
}

function oauthError(provider: string, stage: string, error: any, req) {
  return new Response(JSON.stringify({
    success: false,
    provider,
    stage,
    error: error.message || error,
  }), {
    status: 400,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return oauthError("unknown", "auth", "Authorization required", req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase    = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return oauthError("unknown", "auth", "Invalid authentication", req);

    const body = await req.json();
    const platform     = body.platform     as string | undefined;
    const redirect_uri = body.redirect_uri as string | undefined;
    const callback_domain = (body.callback_domain as string | undefined) || null;
    const bodyClientId     = (body.client_id     as string | undefined)?.trim() || null;
    const bodyClientSecret = (body.client_secret as string | undefined)?.trim() || null;

    if (!platform || !redirect_uri) {
      return oauthError(platform || "unknown", "init", "platform e redirect_uri são obrigatórios", req);
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
      client_key:    getVal("client_key", "TIKTOK_CLIENT_KEY"),
    };

    // --- PKCE ---
    let pkce: { verifier: string; challenge: string } | null = null;
    if (platform === "tiktok" || platform === "twitter") {
      pkce = await generatePKCE();
    }

    const state = crypto.randomUUID().replace(/-/g, "");

    // Salva no banco com code_verifier atômico (PKCE via DB, não via state composto)
    await supabase.from("oauth_states").insert({ 
      user_id: user.id, 
      platform, 
      state,
      redirect_uri,
      callback_domain,
      code_verifier: pkce?.verifier || null
    });

    let authUrl = "";

    const providerMap: Record<string, Function> = {
      google: () => getGoogleAuthUrl(redirect_uri, state, formattedCreds),
      youtube: () => getGoogleAuthUrl(redirect_uri, state, formattedCreds),
      facebook: () => getMetaAuthUrl(platform, redirect_uri, state, formattedCreds),
      instagram: () => getMetaAuthUrl(platform, redirect_uri, state, formattedCreds),
      whatsapp: () => getMetaAuthUrl(platform, redirect_uri, state, formattedCreds),
      threads: () => getMetaAuthUrl(platform, redirect_uri, state, formattedCreds, bodyClientId),
      twitter: () => getTwitterAuthUrl(redirect_uri, state, formattedCreds, pkce),
      tiktok: () => getTiktokAuthUrl(redirect_uri, state, formattedCreds),
      linkedin: () => getLinkedinAuthUrl(redirect_uri, state, formattedCreds),
      reddit: () => getRedditAuthUrl(redirect_uri, state, formattedCreds),
      spotify: () => getSpotifyAuthUrl(redirect_uri, state, formattedCreds, pkce),
      kwai: () => getKwaiAuthUrl(redirect_uri, state, formattedCreds),
      truth_social: () => getTruthSocialAuthUrl(redirect_uri, state, formattedCreds),
    };

    if (providerMap[platform]) {
      authUrl = providerMap[platform]();
    } else {
      // Platforms that don't use OAuth URLs (Gettr, Rumble, Giphy, Website)
      return new Response(JSON.stringify({ success: true, message: "Plataforma usa token manual ou API Key, sem necessidade de OAuth Auth URL." }), {
        headers: { ...corsHeaders(req), "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ authUrl, state }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro em social-oauth-init:", error);
    return oauthError("unknown", "init", error, req);
  }
});

