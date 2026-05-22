// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheProfileImage } from "../_shared/media.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  platformUserId: string;
  pageName: string;
  pageId: string;
  profileImageUrl: string;
  followers?: number;
  postsCount?: number;
  views?: number;
  likes?: number;
  shares?: number;
  username?: string;
}

// --- HELPERS ---
function validateOAuthConfig(provider: string, creds: Record<string, string | undefined>) {
  if (provider === "google" || provider === "youtube") {
    if (!creds.client_id || !creds.client_secret) {
      throw new Error("Configuração Google/YouTube incompleta para troca de token.");
    }
  }
  if (["facebook", "instagram", "threads", "whatsapp", "meta"].includes(provider)) {
    if (!creds.app_id || !creds.app_secret) {
      throw new Error(`Configuração ${provider.toUpperCase()} incompleta para troca de token.`);
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

function assertRedirectUriMatch(saved: string, incoming: string) {
  const normalize = (url: string) => url.replace(/\/$/, "");
  if (normalize(saved) !== normalize(incoming)) {
    throw new Error(`Divergência de Redirect URI: esperado ${saved}, recebido ${incoming}`);
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

// --- EXCHANGE FUNCTIONS ---

async function exchangeGoogle(code: string, redirectUri: string, creds: any, supabase: any, userId: string): Promise<TokenResult[]> {
  validateOAuthConfig("google", creds);
  
  const payload = {
    code,
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  };

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload)
  });

  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "google", stage: "exchange", request_payload: payload, response_payload: data });

  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || "";
  const expiresIn = data.expires_in || 3600;

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
  const userData = await userRes.json();

  const channelRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${accessToken}` } });
  const channelData = await channelRes.json();
  
  if (channelData.items && channelData.items.length > 0) {
    return channelData.items.map((ch: any) => ({
      accessToken, refreshToken, expiresIn,
      platformUserId: ch.id,
      pageName: ch.snippet.title,
      pageId: "",
      profileImageUrl: ch.snippet.thumbnails?.default?.url || userData.picture || ""
    }));
  }

  return [{ accessToken, refreshToken, expiresIn, platformUserId: userData.id, pageName: userData.name || userData.email, pageId: "", profileImageUrl: userData.picture || "" }];
}

async function exchangeMeta(code: string, redirectUri: string, platform: string, creds: any, supabase: any, userId: string): Promise<TokenResult[]> {
  validateOAuthConfig("meta", creds);

  const url = `https://graph.facebook.com/v21.0/oauth/access_token?` + new URLSearchParams({
    client_id: creds.app_id,
    client_secret: creds.app_secret,
    redirect_uri: redirectUri,
    code
  });

  const res = await fetch(url);
  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "meta", stage: "exchange", request_payload: { url }, response_payload: data });

  if (data.error) throw new Error(data.error.message);

  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 5184000;

  const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${accessToken}&fields=id,name,picture.width(200).height(200)`);
  const meData = await meRes.json();
  const defaultProfileImageUrl = meData.picture?.data?.url || "";

  const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}&fields=id,name,access_token,picture.type(large)`);
  const pagesData = await pagesRes.json();
  const pages = pagesData.data || [];

  const results: TokenResult[] = [];

  if (platform === "instagram") {
    for (const page of pages) {
      const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
      const igData = await igRes.json();
      if (igData.instagram_business_account?.id) {
        const platformUserId = igData.instagram_business_account.id;
        let profileImageUrl = defaultProfileImageUrl;
        let pageName = "";
        try {
          const igProfileRes = await fetch(`https://graph.facebook.com/v21.0/${platformUserId}?fields=profile_picture_url,username&access_token=${accessToken}`);
          const igProfile = await igProfileRes.json();
          profileImageUrl = igProfile.profile_picture_url || profileImageUrl;
          pageName = igProfile.username || page.name;
        } catch { pageName = page.name; }
        results.push({ accessToken, refreshToken: "", expiresIn, platformUserId, pageName, pageId: page.id, profileImageUrl });
      }
    }
  } else if (platform === "whatsapp") {
    try {
      const waRes = await fetch(`https://graph.facebook.com/v21.0/me/whatsapp_business_accounts?access_token=${accessToken}`);
      const waData = await waRes.json();
      
      if (waData.data) {
        for (const biz of waData.data) {
          // Buscar os Phone Numbers individuais dentro de cada WABA
          try {
            const phonesRes = await fetch(`https://graph.facebook.com/v21.0/${biz.id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&access_token=${accessToken}`);
            const phonesData = await phonesRes.json();
            
            if (phonesData.data && phonesData.data.length > 0) {
              for (const phone of phonesData.data) {
                // Busca a foto do perfil comercial específico deste número
                let profilePic = defaultProfileImageUrl;
                try {
                  const bizProfileRes = await fetch(`https://graph.facebook.com/v21.0/${phone.id}/whatsapp_business_profile?fields=profile_picture_url&access_token=${accessToken}`);
                  const bizProfile = await bizProfileRes.json();
                  if (bizProfile.data?.[0]?.profile_picture_url) {
                    profilePic = bizProfile.data[0].profile_picture_url;
                  }
                } catch (e) {
                  console.warn(`[WA] Falha ao buscar foto do phone ${phone.id}:`, e);
                }

                results.push({ 
                  accessToken, 
                  refreshToken: "", 
                  expiresIn, 
                  platformUserId: phone.id,  // Phone Number ID (individual)
                  pageName: phone.verified_name || phone.display_phone_number || biz.name, 
                  pageId: biz.id,  // WABA ID como referência
                  profileImageUrl: profilePic 
                });
              }
            } else {
              // Fallback: se não conseguiu listar phones, usa o WABA genérico
              results.push({ 
                accessToken, refreshToken: "", expiresIn, 
                platformUserId: biz.id, pageName: biz.name, 
                pageId: "", profileImageUrl: defaultProfileImageUrl 
              });
            }
          } catch (phoneErr) {
            console.warn(`[WA] Falha ao buscar phones da WABA ${biz.id}:`, phoneErr);
            results.push({ 
              accessToken, refreshToken: "", expiresIn, 
              platformUserId: biz.id, pageName: biz.name, 
              pageId: "", profileImageUrl: defaultProfileImageUrl 
            });
          }
        }
      }
    } catch (e) {
      console.warn("[WA] Falha na extração de contas business:", e);
      results.push({ accessToken, refreshToken: "", expiresIn, platformUserId: meData.id, pageName: meData.name, pageId: "", profileImageUrl: defaultProfileImageUrl });
    }
  } else {
    for (const page of pages) {
      const pagePhoto = page.picture?.data?.url || defaultProfileImageUrl;

      // ★ Buscar total de posts publicados pela página
      let postsCount = 0;
      try {
        const pubPostsRes = await fetch(
          `https://graph.facebook.com/v21.0/${page.id}/published_posts?summary=total_count&limit=0&access_token=${page.access_token}`
        );
        if (pubPostsRes.ok) {
          const pubPostsData = await pubPostsRes.json();
          postsCount = pubPostsData?.summary?.total_count || 0;
        }
      } catch (e) { console.warn(`[META] Falha ao buscar posts_count da página ${page.id}:`, e); }

      // ★ Buscar seguidores da página
      let followers = 0;
      try {
        const pageInfoRes = await fetch(
          `https://graph.facebook.com/v21.0/${page.id}?fields=followers_count,fan_count&access_token=${page.access_token}`
        );
        if (pageInfoRes.ok) {
          const pageInfo = await pageInfoRes.json();
          followers = Math.max(pageInfo.followers_count || 0, pageInfo.fan_count || 0);
        }
      } catch (e) { console.warn(`[META] Falha ao buscar followers da página ${page.id}:`, e); }

      results.push({
        accessToken: page.access_token, refreshToken: "", expiresIn,
        platformUserId: page.id, pageName: page.name, pageId: page.id,
        profileImageUrl: pagePhoto, postsCount, followers,
      });
    }
  }

  if (results.length === 0) {
    results.push({ accessToken, refreshToken: "", expiresIn, platformUserId: meData.id, pageName: meData.name, pageId: "", profileImageUrl: defaultProfileImageUrl });
  }

  return results;
}

async function exchangeThreads(code: string, redirectUri: string, creds: any, supabase: any, userId: string): Promise<TokenResult[]> {
  validateOAuthConfig("meta", creds);

  // PASSO 1 — Trocar code por token de curta duração
  const shortPayload = {
    client_id:     creds.app_id,
    client_secret: creds.app_secret,
    grant_type:    "authorization_code",
    redirect_uri:  redirectUri,
    code,
  };

  const shortRes = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(shortPayload)
  });
  const shortData = await shortRes.json();
  await logOAuth(supabase, { user_id: userId, provider: "threads", stage: "exchange_short", request_payload: shortPayload, response_payload: shortData });

  if (shortData.error) throw new Error(shortData.error.message || shortData.error_message || "Erro Threads OAuth");

  const shortToken = shortData.access_token as string;

  // PASSO 2 — Trocar por token de longa duração (60 dias)
  let accessToken = shortToken;
  let expiresIn   = shortData.expires_in || 5184000;

  try {
    const longRes = await fetch(
      `https://graph.threads.net/access_token?` + new URLSearchParams({
        grant_type:    "th_exchange_token",
        client_secret: creds.app_secret,
        access_token:  shortToken,
      })
    );
    const longData = await longRes.json();
    if (longData.access_token) {
      accessToken = longData.access_token;
      expiresIn   = longData.expires_in || 5184000;
      console.log(`[THREADS] Token de longa duração obtido (expira em ${expiresIn}s)`);
    }
  } catch (e) {
    console.warn("[THREADS] Falha ao trocar por token longo, usando token curto:", e);
  }

  // PASSO 3 — Buscar perfil completo com foto e métricas
  // Campos corretos da API do Threads v1.0:
  //   id, username, name, threads_profile_picture_url,
  //   threads_biography, followers_count, threads_count
  const profileRes = await fetch(
    `https://graph.threads.net/v1.0/me?` + new URLSearchParams({
      fields:       "id,username,name,threads_profile_picture_url,threads_biography,followers_count,threads_count",
      access_token: accessToken,
    })
  );
  const profileData = await profileRes.json();
  await logOAuth(supabase, { user_id: userId, provider: "threads", stage: "profile_fetch", response_payload: profileData });

  console.log("[THREADS] Dados do perfil:", JSON.stringify({
    id:              profileData.id,
    username:        profileData.username,
    has_photo:       !!profileData.threads_profile_picture_url,
    followers_count: profileData.followers_count,
    threads_count:   profileData.threads_count,
  }));

  if (profileData.error) {
    console.error("[THREADS] Erro ao buscar perfil:", profileData.error);
  }

  const platformUserId  = profileData.id       || shortData.user_id || "";
  const username        = profileData.username  || "";
  const displayName     = profileData.name      || username         || "Threads User";
  const profileImageUrl = profileData.threads_profile_picture_url || "";
  const followersCount  = Number(profileData.followers_count) || 0;
  const postsCount      = Number(profileData.threads_count)   || 0;

  return [{
    accessToken,
    refreshToken: "",
    expiresIn,
    platformUserId,
    pageName:        displayName,
    pageId:          "",
    profileImageUrl,
    username,
    followers:       followersCount,
    postsCount,
  }];
}

async function exchangeReddit(code: string, redirectUri: string, creds: any, supabase: any, userId: string): Promise<TokenResult[]> {
  const clientId = creds.client_id || Deno.env.get("REDDIT_CLIENT_ID");
  const clientSecret = creds.client_secret || Deno.env.get("REDDIT_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) throw new Error("Configuração Reddit incompleta.");

  const auth = btoa(`${clientId}:${clientSecret}`);
  const payload = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  };

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: { 
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "SocialCanvasHub/1.0"
    },
    body: new URLSearchParams(payload)
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || "";
  const expiresIn = data.expires_in || 3600;

  const userRes = await fetch("https://oauth.reddit.com/api/v1/me", {
    headers: { "Authorization": `Bearer ${accessToken}`, "User-Agent": "SocialCanvasHub/1.0" }
  });
  const userData = await userRes.json();

  return [{
    accessToken,
    refreshToken,
    expiresIn,
    platformUserId: userData.id,
    pageName: userData.name,
    pageId: "",
    profileImageUrl: userData.icon_img?.split('?')[0] || "",
    username: userData.name
  }];
}

async function exchangeTwitter(code: string, redirectUri: string, codeVerifier: string, creds: any, supabase: any, userId: string): Promise<TokenResult[]> {
  const clientId = creds.client_id || Deno.env.get("TWITTER_CLIENT_ID");
  const clientSecret = creds.client_secret || Deno.env.get("TWITTER_CLIENT_SECRET");
  
  if (!clientId) throw new Error("Client ID do Twitter não configurado.");

  const payload = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Se houver secret, usa Basic Auth
  if (clientSecret) {
    headers["Authorization"] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  }

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers,
    body: new URLSearchParams(payload)
  });

  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "twitter", stage: "exchange", request_payload: payload, response_payload: data });

  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || "";
  const expiresIn = data.expires_in || 7200;

  const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const userData = await userRes.json();
  const user = userData.data;

  return [{
    accessToken,
    refreshToken,
    expiresIn,
    platformUserId: user.id,
    pageName: user.name,
    pageId: "",
    profileImageUrl: user.profile_image_url?.replace("_normal", "") || "",
    username: user.username,
    followers: user.public_metrics?.followers_count || 0,
    postsCount: user.public_metrics?.tweet_count || 0
  }];
}

async function exchangeTikTok(code: string, redirectUri: string, codeVerifier: string, creds: any, supabase: any, userId: string): Promise<TokenResult[]> {
  const clientKey = creds.client_key || creds.client_id;
  const clientSecret = creds.client_secret;

  if (!clientKey || !clientSecret) {
    throw new Error("TikTok Client Key e Client Secret são obrigatórios. Configure-os na aba de APIs.");
  }

  const payload = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code: code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,  // PKCE obrigatório
  });

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
  });

  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "tiktok", stage: "exchange", request_payload: { client_key: clientKey, redirect_uri: redirectUri }, response_payload: data });

  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || "";
  const expiresIn = data.expires_in || 86400; // 24h
  const openId = data.open_id || "";

  // Buscar informações básicas do perfil do usuário
  let pageName = "TikTok User";
  let profileImageUrl = "";
  let username = "";
  let followers = 0;
  let postsCount = 0;
  let likes = 0;

  try {
    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count,video_count,likes_count",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const userData = await userRes.json();
    const userInfo = userData?.data?.user;
    if (userInfo) {
      pageName = userInfo.display_name || pageName;
      username = userInfo.username || "";
      profileImageUrl = userInfo.avatar_url || "";
      followers = userInfo.follower_count || 0;
      postsCount = userInfo.video_count || 0;
      likes = userInfo.likes_count || 0;
    }
  } catch (e) {
    console.warn("[TikTok] Falha ao buscar perfil:", e);
  }

  // Também atualizar api_credentials com os tokens gerados
  try {
    await supabase.from("api_credentials").upsert({
      user_id: userId,
      platform: "tiktok",
      credentials: {
        client_key: clientKey,
        client_secret: clientSecret,
        access_token: accessToken,
        refresh_token: refreshToken,
        open_id: openId,
      }
    }, { onConflict: "user_id,platform" });
  } catch (e) {
    console.warn("[TikTok] Falha ao salvar tokens em api_credentials:", e);
  }

  return [{
    accessToken,
    refreshToken,
    expiresIn,
    platformUserId: openId,
    pageName,
    pageId: "",
    profileImageUrl,
    username,
    followers,
    postsCount,
    likes
  }];
}

async function exchangeLinkedIn(code: string, redirectUri: string, creds: any, supabase: any, userId: string): Promise<TokenResult[]> {
  const clientId = creds.client_id;
  const clientSecret = creds.client_secret;

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn Client ID e Client Secret são obrigatórios.");
  }

  const payload = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString()
  });

  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "linkedin", stage: "exchange", request_payload: { client_id: clientId, redirect_uri: redirectUri }, response_payload: data });

  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || "";
  const expiresIn = data.expires_in || 5184000; // padrão do LinkedIn é 60 dias

  // Buscar perfil básico do LinkedIn via Userinfo (OIDC)
  const userinfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const userinfoData = await userinfoRes.json();
  
  if (!userinfoData.sub) {
    throw new Error("Não foi possível obter dados do perfil do LinkedIn via OIDC.");
  }

  const platformUserId = userinfoData.sub;
  const pageName = userinfoData.name || userinfoData.email || "LinkedIn User";
  const profileImageUrl = userinfoData.picture || "";
  const username = userinfoData.email || "";

  // Retornar dados estruturados
  return [{
    accessToken,
    refreshToken,
    expiresIn,
    platformUserId,
    pageName,
    pageId: "",
    profileImageUrl,
    username
  }];
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

    const { code, state: incomingState, platform, redirect_uri: incomingRedirectUri, manual_token } = await req.json();

    // -------------------------------------------------------------------------
    // NOVO: SUPORTE A TOKEN MANUAL (THREADS)
    // -------------------------------------------------------------------------
    if (manual_token && platform === 'threads') {
      console.log(`[OAUTH CALLBACK] Ativando Threads via token manual para o usuário: ${user.id}`);
      const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,followers_count,threads_count&access_token=${manual_token}`);
      const meData = await meRes.json();

      if (meData.error) throw new Error(meData.error.message || "Token manual inválido");

      // 1. Cachear foto de perfil no Supabase Storage de forma definitiva para evitar expiração de token de imagem da Meta
      let cachedProfilePic = meData.threads_profile_picture_url || "";
      if (cachedProfilePic) {
        try {
          const uploadedUrl = await cacheProfileImage(
            supabase, user.id, platform, cachedProfilePic, meData.id || ""
          );
          if (uploadedUrl) {
            cachedProfilePic = uploadedUrl;
            console.log(`[OAUTH CALLBACK] Threads manual profile pic cached successfully: ${cachedProfilePic}`);
          }
        } catch (cacheErr: any) {
          console.warn(`[OAUTH CALLBACK] Failed to cache manual Threads profile pic:`, cacheErr.message);
        }
      }

      // 2. Buscar contagem inicial de posts do threads_count
      let initialPostsCount = Number(meData.threads_count) || 0;
      if (!initialPostsCount) {
        try {
          const postsResp = await fetch(`https://graph.threads.net/v1.0/me/threads?fields=id&limit=100&access_token=${manual_token}`);
          if (postsResp.ok) {
            const postsData = await postsResp.json();
            initialPostsCount = postsData.data?.length || 0;
            console.log(`[OAUTH CALLBACK] Threads manual posts count initialized from list: ${initialPostsCount}`);
          }
        } catch (postsErr: any) {
          console.warn(`[OAUTH CALLBACK] Failed to fetch initial posts for manual connection:`, postsErr.message);
        }
      }

      const results: TokenResult[] = [{
        accessToken: manual_token,
        refreshToken: "",
        expiresIn: 5184000,
        platformUserId: meData.id || "",
        pageName: meData.username || "",
        pageId: "",
        profileImageUrl: cachedProfilePic || null,
        username: meData.username,
        followers: Number(meData.followers_count) || 0,
        postsCount: initialPostsCount
      }];

      // Salvar conexão
      for (const res of results) {
        await supabase.from("social_connections").upsert({
          user_id: user.id,
          platform,
          is_connected: true,
          access_token: res.accessToken,
          refresh_token: res.refreshToken,
          token_expires_at: new Date(Date.now() + res.expiresIn * 1000).toISOString(),
          platform_user_id: res.platformUserId,
          page_name: res.pageName,
          page_id: res.pageId,
          profile_image_url: res.profileImageUrl,
          metadata: { username: res.username, followers: res.followers, manual: true }
        }, { onConflict: "user_id,platform,platform_user_id" });

        await supabase.from("social_accounts").upsert({
          user_id: user.id,
          platform,
          platform_user_id: res.platformUserId,
          username: res.username || res.pageName,
          page_name: res.pageName,
          profile_picture: res.profileImageUrl,
          is_active: true,
          followers: res.followers || 0,
          followers_count: res.followers || 0,
          subscribers_count: res.followers || 0,
          posts_count: res.postsCount || 0,
          metadata: { username: res.username, followers: res.followers, posts_count: res.postsCount, profile_image_url: res.profileImageUrl }
        }, { onConflict: "user_id,platform,platform_user_id" });
      }

      return new Response(JSON.stringify({ success: true, pageName: meData.username }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!code || !incomingState || !platform) return oauthError(platform || "unknown", "callback", "code, state, and platform are required");

    // Busca state diretamente (state é sempre um UUID simples agora)
    const { data: oauthState, error: stateError } = await supabase
      .from("oauth_states")
      .select("*")
      .eq("state", incomingState)
      .eq("user_id", user.id)
      .eq("platform", platform)
      .single();
      
    if (stateError || !oauthState) return oauthError(platform, "callback", "Invalid or expired OAuth state");

    // code_verifier vem exclusivamente da coluna do banco
    const finalVerifier = oauthState.code_verifier || "";
    
    console.log(`[OAUTH CALLBACK] platform=${platform} | has_verifier=${!!oauthState.code_verifier}`);

    // Validar Redirect URI
    if (incomingRedirectUri) assertRedirectUriMatch(oauthState.redirect_uri, incomingRedirectUri);

    const getCreds = async (p: string) => {
      const { data } = await supabase.from("api_credentials").select("credentials").eq("user_id", user.id).eq("platform", p).maybeSingle();
      return (data?.credentials as Record<string, string>) || {};
    };

    let raw: any = {};
    if (platform === "youtube" || platform === "google") {
      const g = await getCreds("google");
      const y = await getCreds("youtube");
      const c = await getCreds("google_cloud");
      raw = { ...c, ...y, ...g };
    } else if (["threads", "instagram", "facebook", "whatsapp"].includes(platform)) {
      const fb = await getCreds("facebook");
      const meta = await getCreds("meta");
      const own = await getCreds(platform);
      raw = { ...fb, ...meta, ...own };
    } else {
      raw = await getCreds(platform);
    }

    const getVal = (userKey: string, envKey: string) => {
      const val = raw[userKey] || Deno.env.get(envKey);
      return val?.trim() || null;
    };

    const formattedCreds: any = {};
    
    if (platform === "twitter") {
      formattedCreds.client_id = getVal("client_id", "TWITTER_CLIENT_ID");
      formattedCreds.client_secret = getVal("client_secret", "TWITTER_CLIENT_SECRET");
    } else if (platform === "linkedin") {
      formattedCreds.client_id = getVal("client_id", "LINKEDIN_CLIENT_ID");
      formattedCreds.client_secret = getVal("client_secret", "LINKEDIN_CLIENT_SECRET");
    } else if (platform === "reddit") {
      formattedCreds.client_id = getVal("client_id", "REDDIT_CLIENT_ID");
      formattedCreds.client_secret = getVal("client_secret", "REDDIT_CLIENT_SECRET");
    } else if (platform === "google" || platform === "youtube") {
      formattedCreds.client_id = raw.client_id || raw.youtube_id || Deno.env.get("GOOGLE_CLIENT_ID");
      formattedCreds.client_secret = raw.client_secret || Deno.env.get("GOOGLE_CLIENT_SECRET");
    } else if (platform === "tiktok") {
      // TikTok usa client_key (não client_id)
      formattedCreds.client_key = raw.client_key || raw.client_id || Deno.env.get("TIKTOK_CLIENT_KEY");
      formattedCreds.client_secret = raw.client_secret || Deno.env.get("TIKTOK_CLIENT_SECRET");
    } else if (platform === "threads") {
      // Threads exige o Client ID da App, que no nosso sistema é mapeado como app_id (Meta App ID)
      // Evitamos usar raw.client_id aqui se ele parecer um ID de usuário (longo e numérico sem ser o da App)
      formattedCreds.app_id = raw.app_id || Deno.env.get("META_APP_ID") || raw.client_id || Deno.env.get("THREADS_CLIENT_ID");
      formattedCreds.app_secret = raw.app_secret || raw.client_secret || Deno.env.get("META_APP_SECRET") || Deno.env.get("THREADS_CLIENT_SECRET");
    } else {
      formattedCreds.app_id = raw.app_id || raw.client_id || Deno.env.get("META_APP_ID") || Deno.env.get("THREADS_CLIENT_ID");
      formattedCreds.app_secret = raw.app_secret || raw.client_secret || Deno.env.get("META_APP_SECRET") || Deno.env.get("THREADS_CLIENT_SECRET");
    }

    let results: TokenResult[];

    switch (platform) {
      case "google":
      case "youtube": results = await exchangeGoogle(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
      case "facebook":
      case "instagram":
      case "whatsapp": results = await exchangeMeta(code, oauthState.redirect_uri, platform, formattedCreds, supabase, user.id); break;
      case "threads": results = await exchangeThreads(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
      case "linkedin": results = await exchangeLinkedIn(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
      case "reddit": results = await exchangeReddit(code, oauthState.redirect_uri, { 
        client_id: raw.client_id, 
        client_secret: raw.client_secret 
      }, supabase, user.id); break;
      case "twitter": results = await exchangeTwitter(code, oauthState.redirect_uri, finalVerifier, formattedCreds, supabase, user.id); break;
      case "tiktok": results = await exchangeTikTok(code, oauthState.redirect_uri, finalVerifier, formattedCreds, supabase, user.id); break;
      default:
        throw new Error(`Troca de token para plataforma '${platform}' não implementada.`);
    }

    // Upsert connections with cached non-expiring profile pictures
    for (const result of results) {
        let cachedProfilePic = result.profileImageUrl;
        if (result.profileImageUrl) {
          try {
            cachedProfilePic = await cacheProfileImage(
              supabase, user.id, platform, result.profileImageUrl, result.platformUserId
            ) || result.profileImageUrl;
          } catch (cacheErr: any) {
            console.warn(`[OAUTH] Failed to cache profile image on initial connection:`, cacheErr.message);
          }
        }

        const expiresAt = new Date(Date.now() + result.expiresIn * 1000).toISOString();
        await supabase.from("social_connections").upsert({
          user_id: user.id, platform, access_token: result.accessToken, refresh_token: result.refreshToken || null,
          token_expires_at: expiresAt, platform_user_id: result.platformUserId, page_name: result.pageName,
          page_id: result.pageId || null, profile_image_url: cachedProfilePic || null,
          username: result.username || null, is_connected: true, updated_at: new Date().toISOString(),
          // CORREÇÃO: salva métricas em social_connections para exibição imediata no painel
          followers_count: result.followers  ?? null,
          posts_count:     result.postsCount ?? null,
        }, { onConflict: "user_id,platform,platform_user_id" });

        await supabase.from("social_accounts").upsert({
          user_id: user.id, 
          platform, 
          platform_user_id: result.platformUserId, 
          username: result.username || result.pageName,
          page_name: result.pageName, 
          profile_picture: cachedProfilePic || null, 
          is_connected: true, 
          followers: Number(result.followers || 0),
          followers_count: Number(result.followers || 0),
          subscribers_count: Number(result.followers || 0),
          posts_count: Number(result.postsCount || 0),
          updated_at: new Date().toISOString(),
          metadata: { 
            username: result.username, 
            followers: result.followers, 
            posts_count: result.postsCount,
            profile_image_url: cachedProfilePic 
          }
        }, { onConflict: "user_id,platform,platform_user_id" });
    }

    await supabase.from("oauth_states").delete().eq("id", oauthState.id);
    
    return new Response(JSON.stringify({ success: true, platform, count: results.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error in social-oauth-callback:", error);
    return oauthError("unknown", "callback", error);
  }
});
