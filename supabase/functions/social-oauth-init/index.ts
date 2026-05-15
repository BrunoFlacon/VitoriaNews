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

// Gera PKCE code_verifier + code_challenge (S256)
async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  // Removido '~' para não conflitar com o delimitador do state composto
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
  let codeVerifier = '';
  for (let i = 0; i < 64; i++) codeVerifier += chars.charAt(Math.floor(Math.random() * chars.length));
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { codeVerifier, codeChallenge };
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

    // =========================================================================
    // LEITURA DO BODY
    // Lemos client_id e client_secret que o front-end envia quando encontra
    // o app_id salvo nas Configurações de API. Isso resolve o erro 4476002
    // ("Nenhuma identificação do app foi enviada") causado pelo client_id vazio.
    // =========================================================================
    const body = await req.json();
    const platform     = body.platform     as string | undefined;
    const redirect_uri = body.redirect_uri as string | undefined;
    // client_id/client_secret enviados pelo front-end (prioridade máxima)
    const bodyClientId     = (body.client_id     as string | undefined)?.trim() || null;
    const bodyClientSecret = (body.client_secret as string | undefined)?.trim() || null;

    console.log(`[OAUTH INIT] Body recebido — platform: ${platform}, body_client_id: ${bodyClientId ? bodyClientId.substring(0, 5) + '...' : 'NULL'}`);

    if (!platform || !redirect_uri) {
      return oauthError(platform || "unknown", "init", "platform e redirect_uri são obrigatórios");
    }

    // Plataformas que NÃO usam OAuth padrão
    if (['googlenews', 'giphy', 'spotify', 'site', 'telegram', 'kwai', 'rumble', 'gettr', 'truthsocial']
        .includes(platform.toLowerCase())) {
      return oauthError(
        platform, "init",
        `A plataforma '${platform}' utiliza chaves de API ou identificadores manuais, não OAuth padrão. ` +
        `Configure as credenciais diretamente na aba de Configurações das APIs.`
      );
    }

    // Busca credenciais salvas pelo usuário no banco
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

    // Fallbacks entre plataformas relacionadas
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

    // Lê valor do banco com fallback para variável de ambiente
    const getVal = (userKey: string, envKey: string): string | null => {
      const raw = creds?.[userKey] || Deno.env.get(envKey);
      if (typeof raw === "string") {
        const t = raw.trim();
        if (!t || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return null;
        return t;
      }
      return raw || null;
    };

    // Credenciais formatadas (usadas para Google, Facebook, Instagram, WhatsApp)
    const formattedCreds: any = {
      client_id:     getVal("client_id", "GOOGLE_CLIENT_ID") || getVal("youtube_id", "GOOGLE_CLIENT_ID"),
      client_secret: getVal("client_secret", "GOOGLE_CLIENT_SECRET"),
      app_id:        getVal("app_id", "META_APP_ID") || getVal("client_id", "THREADS_CLIENT_ID"),
      app_secret:    getVal("app_secret", "META_APP_SECRET") || getVal("client_secret", "THREADS_CLIENT_SECRET"),
    };

    // -------------------------------------------------------------------------
    // STATE: para plataformas com PKCE (TikTok, Twitter), usamos state composto
    // no formato "stateId~codeVerifier" para evitar dependência de coluna extra
    // no banco de dados. O OAuth provider devolve o state intacto no callback.
    // -------------------------------------------------------------------------
    const stateId = crypto.randomUUID().replace(/-/g, "");
    let pkce: { codeVerifier: string; codeChallenge: string } | null = null;

    if (platform === "tiktok" || platform === "twitter") {
      pkce = await generatePKCE();
    }

    // State armazenado no DB e enviado ao provider
    const state = pkce ? `${stateId}~${pkce.codeVerifier}` : stateId;
    await supabase.from("oauth_states").insert({ user_id: user.id, platform, state, redirect_uri });

    let authUrl = "";

    // =========================================================================
    if (platform === "google" || platform === "youtube") {
    // =========================================================================
      validateOAuthConfig(platform, formattedCreds);

      const scopes = [
        "openid", "profile", "email",
        "https://www.googleapis.com/auth/contacts",
        "https://www.googleapis.com/auth/youtube",
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
        "https://www.googleapis.com/auth/analytics.readonly",
        "https://www.googleapis.com/auth/business.manage",
        "https://www.googleapis.com/auth/webmasters.readonly",
      ].join(" ");

      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id:     formattedCreds.client_id,
        redirect_uri,
        response_type: "code",
        scope:         scopes,
        access_type:   "offline",
        prompt:        "consent select_account",
        state,
      });

    // =========================================================================
    } else if (["facebook", "instagram", "whatsapp"].includes(platform)) {
    // =========================================================================
      validateOAuthConfig(platform, formattedCreds);

      const scopes = platform === "instagram"
        ? "instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement"
        : platform === "whatsapp"
          ? "whatsapp_business_management,whatsapp_business_messaging,business_management"
          : "pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata,read_insights,ads_read";

      authUrl = `https://www.facebook.com/v21.0/dialog/oauth?` + new URLSearchParams({
        client_id:     formattedCreds.app_id,
        redirect_uri,
        scope:         scopes,
        state,
        response_type: "code",
      });

    // =========================================================================
    } else if (platform === "threads") {
    // =========================================================================

      const threadsAppId = (bodyClientId || creds.app_id || creds.client_id || Deno.env.get("META_APP_ID") || Deno.env.get("THREADS_CLIENT_ID") || "").trim();

      // Log detalhado para diagnóstico
      console.log(`[THREADS INIT] ──────────────────────────────────`);
      console.log(`[THREADS INIT] platform        : ${platform}`);
      console.log(`[THREADS INIT] threadsAppId    : ${threadsAppId ? threadsAppId.substring(0, 5) + '...' : 'NULL'}`);
      console.log(`[THREADS INIT] bodyClientId    : ${bodyClientId ? bodyClientId.substring(0, 5) + '...' : 'NULL'}`);
      console.log(`[THREADS INIT] redirect_uri    : ${redirect_uri}`);
      console.log(`[THREADS INIT] ──────────────────────────────────`);

      if (!threadsAppId) {
        return oauthError(platform, "init", "Threads App ID não encontrado. Salve-o nas Configurações de API.");
      }

      // Usando URLSearchParams para garantir codificação robusta
      const params = new URLSearchParams({
        client_id:     threadsAppId,
        app_id:        threadsAppId, // Fallback para alguns endpoints da Meta
        redirect_uri:  redirect_uri,
        scope:         "threads_basic,threads_content_publish",
        response_type: "code",
        state:         state,
      });

      // Endpoint oficial (threads.net). O redirecionamento para threads.com ocorre quando há erro de parâmetro.
      authUrl = `https://threads.net/oauth/authorize?${params.toString()}`;
      
      console.log(`[THREADS INIT] URL final gerada: ${authUrl.split("?")[0]}?...`);

    // =========================================================================
    } else if (platform === "tiktok") {
    // =========================================================================
      // TikTok usa "client_key" (não "client_id") e exige PKCE obrigatório.
      const tikCreds = await getPlatformCreds("tiktok") || {};
      const clientKey = (bodyClientId as string | undefined)?.trim()
        || tikCreds.client_key?.trim()
        || tikCreds.client_id?.trim()
        || Deno.env.get("TIKTOK_CLIENT_KEY")
        || null;

      if (!clientKey) {
        throw new Error(
          "TikTok Client Key não encontrado. Salve o 'TikTok Client Key' nas " +
          "Configurações de API antes de conectar."
        );
      }

      console.log(`[TIKTOK] client_key fonte: ${
        bodyClientId ? "FRONT-END (body)" : tikCreds.client_key ? "BANCO" : "ENV"
      } | PKCE challenge gerado: ${!!pkce}`);

      authUrl = `https://www.tiktok.com/v2/auth/authorize/?` + new URLSearchParams({
        client_key:            clientKey,
        response_type:         "code",
        scope:                 "user.info.basic,user.info.profile,user.info.stats,video.list,video.upload,video.publish",
        redirect_uri,
        state,
        code_challenge:        pkce!.codeChallenge,
        code_challenge_method: "S256",
      });

    // =========================================================================
    } else if (platform === "twitter") {
    // =========================================================================
      const twitterKey = getVal("client_id", "TWITTER_CLIENT_ID");
      if (!twitterKey) throw new Error("Client ID do X (Twitter) não configurado.");

      authUrl = `https://twitter.com/i/oauth2/authorize?` + new URLSearchParams({
        response_type:         "code",
        client_id:             twitterKey,
        redirect_uri,
        scope:                 "tweet.read tweet.write users.read offline.access dm.read dm.write",
        state,
        code_challenge:        pkce!.codeChallenge,
        code_challenge_method: "S256",
      });

    // =========================================================================
    } else if (platform === "reddit") {
    // =========================================================================
      const clientId = getVal("client_id", "REDDIT_CLIENT_ID");
      if (!clientId) throw new Error("Client ID do Reddit não configurado.");

      authUrl = `https://www.reddit.com/api/v1/authorize?` + new URLSearchParams({
        client_id:     clientId,
        response_type: "code",
        state,
        redirect_uri,
        duration:      "permanent",
        scope:         "identity,read,submit,mysubreddits",
      });

    // =========================================================================
    } else {
    // =========================================================================
      const clientId =
        formattedCreds.app_id ||
        formattedCreds.client_id ||
        getVal("client_id", `${platform.toUpperCase()}_CLIENT_ID`);
      if (!clientId) throw new Error(`Client ID para ${platform} não encontrado.`);

      const endpoints: Record<string, string> = {
        linkedin:  "https://www.linkedin.com/oauth/v2/authorization",
        pinterest: "https://www.pinterest.com/oauth/",
        snapchat:  "https://accounts.snapchat.com/login/oauth2/authorize",
      };

      if (!endpoints[platform]) throw new Error(`Plataforma '${platform}' não suportada para OAuth`);

      authUrl = `${endpoints[platform]}?` + new URLSearchParams({
        client_id:     clientId,
        redirect_uri,
        state,
        response_type: "code",
        scope:         platform === "linkedin" ? "openid profile email w_member_social" : "",
      });
    }

    // Log geral (sem expor segredos)
    console.log(`[OAUTH INIT] Plataforma: ${platform} | Chaves no banco: ${JSON.stringify(Object.keys(creds))}`);
    console.log(`[OAUTH INIT] app_id: ${formattedCreds.app_id ? '***' + formattedCreds.app_id.slice(-4) : 'NULL'} | body_client_id: ${bodyClientId ? '***' + bodyClientId.slice(-4) : 'NULL'}`);
    console.log(`[OAUTH INIT] Auth URL gerada:`, authUrl.substring(0, 80) + '...');

    await logOAuth(supabase, {
      user_id:          user.id,
      provider:         platform,
      stage:            "init",
      request_payload:  { platform, redirect_uri, state, body_client_id_present: !!bodyClientId },
      response_payload: { authUrl },
    });

    return new Response(JSON.stringify({
      authUrl,
      state,
      debug: {
        app_id:                 formattedCreds.app_id ? '***' + formattedCreds.app_id.slice(-4) : null,
        body_client_id_present: !!bodyClientId,
        db_keys:                Object.keys(creds),
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro em social-oauth-init:", error);
    return oauthError("unknown", "init", error);
  }
});
