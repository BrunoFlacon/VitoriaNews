// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

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
function validateOAuthConfig(provider: string, creds: any) {
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
  if (saved !== incoming) {
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
  // Log security: removed sensitive payload logging
  await logOAuth(supabase, { user_id: userId, provider: "google", stage: "exchange" });

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
  // Log security: removed sensitive payload logging
  await logOAuth(supabase, { user_id: userId, provider: "meta", stage: "exchange" });

  if (data.error) throw new Error(data.error.message);

  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 5184000;

  const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${accessToken}&fields=id,name,picture.width(200).height(200)`);
  const meData = await meRes.json();
  const defaultProfileImageUrl = meData.picture?.data?.url || "";

  const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture.width(200).height(200)&access_token=${accessToken}`);
  const pagesData = await pagesRes.json();
  const pages = pagesData.data || [];

  const results: TokenResult[] = [];

  if (platform === "instagram") {
    for (const page of pages) {
      const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
      const igData = await igRes.json();
      if (igData.instagram_business_account?.id) {
        const platformUserId = igData.instagram_business_account.id;
        const pagePic = page.picture?.data?.url || defaultProfileImageUrl;
        let profileImageUrl = pagePic;
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
      const waRes = await fetch(`https://graph.facebook.com/v21.0/me/businesses?access_token=${accessToken}`);
      const waData = await waRes.json();
      if (waData.data) {
        for (const biz of waData.data) {
          let profileImageUrl = "";
          let bizName = biz.name;
          let wabaId = biz.id;
          let resolvedPhoneId = "";
          // Resolve real WABA ID from Business Manager
          try {
            const wabaRes = await fetch(`https://graph.facebook.com/v21.0/${biz.id}/owned_whatsapp_business_accounts?access_token=${accessToken}`);
            const wabaData = await wabaRes.json();
            if (wabaData.data && wabaData.data.length > 0) {
              wabaId = wabaData.data[0].id;
              // Get phone numbers with profile_photo_url from the real WABA
              const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id,display_phone_number,profile_photo_url,verified_name&access_token=${accessToken}`);
              const phoneData = await phoneRes.json();
              if (phoneData.data && phoneData.data.length > 0) {
                const phone = phoneData.data[0];
                resolvedPhoneId = phone.id || "";
                if (phone.profile_photo_url) profileImageUrl = phone.profile_photo_url;
                if (phone.verified_name) bizName = phone.verified_name;
              }
              console.log(`[OAUTH] WhatsApp: resolved WABA=${wabaId}, phones=${phoneData?.data?.length || 0}, photo=${profileImageUrl ? "YES" : "NO"}`);
            }
          } catch (e) {
            console.error(`Error resolving WABA for WhatsApp:`, e);
          }
          results.push({ accessToken, refreshToken: "", expiresIn, platformUserId: wabaId, pageName: bizName, pageId: "", profileImageUrl });
          // Store resolved phone_number_id for downstream update
          if (resolvedPhoneId) {
            (results[results.length - 1] as any)._phoneNumberId = resolvedPhoneId;
          }
        }
      }
    } catch (e) { console.error("Error fetching WhatsApp businesses:", e); }
  } else {
    for (const page of pages) {
      const pagePic = `https://graph.facebook.com/v21.0/${page.id}/picture?type=large`;
      results.push({ accessToken: page.access_token, refreshToken: "", expiresIn, platformUserId: page.id, pageName: page.name, pageId: page.id, profileImageUrl: pagePic });
    }
  }

  if (results.length === 0) {
    if (platform === "whatsapp") {
      // WhatsApp sem WABA — não usar foto do Facebook pessoal
      return results;
    }
    const personalPic = `https://graph.facebook.com/v21.0/${meData.id}/picture?type=large`;
    results.push({ accessToken, refreshToken: "", expiresIn, platformUserId: meData.id, pageName: meData.name, pageId: "", profileImageUrl: personalPic });
  }

  return results;
}

async function exchangeThreads(code: string, redirectUri: string, creds: any, supabase: any, userId: string): Promise<TokenResult[]> {
  validateOAuthConfig("meta", creds);

  const payload = {
    client_id: creds.app_id,
    client_secret: creds.app_secret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code
  };

  const res = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload)
  });

  const data = await res.json();
  // Log security: removed sensitive payload logging
  await logOAuth(supabase, { user_id: userId, provider: "threads", stage: "exchange" });

  if (data.error) throw new Error(data.error.message || "Erro Threads OAuth");

  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 5184000;

  const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`);
  const meData = await meRes.json();

  return [{
    accessToken,
    refreshToken: "",
    expiresIn,
    platformUserId: meData.id || "",
    pageName: meData.username || "",
    pageId: "",
    profileImageUrl: meData.threads_profile_picture_url || ""
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
  // Log security: removed sensitive payload logging
  await logOAuth(supabase, { user_id: userId, provider: "twitter", stage: "exchange" });

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


async function exchangeLinkedIn(code: string, redirectUri: string, creds: any, supabase: any, userId: string): Promise<TokenResult[]> {
  const clientId = creds.app_id || creds.client_id || Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = creds.app_secret || creds.client_secret || Deno.env.get("LINKEDIN_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Configuração LinkedIn incompleta.");

  const payload = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  };

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload)
  });

  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "linkedin", stage: "exchange" });
  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 5184000;

  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const meData = await meRes.json();

  return [{
    accessToken,
    refreshToken: data.refresh_token || "",
    expiresIn,
    platformUserId: meData.sub,
    pageName: meData.name || meData.given_name || "",
    pageId: "",
    profileImageUrl: meData.picture || ""
  }];
}

async function exchangeTikTok(code: string, redirectUri: string, creds: any, supabase: any, userId: string): Promise<TokenResult[]> {
  const clientKey = creds.app_id || creds.client_id || Deno.env.get("TIKTOK_CLIENT_KEY");
  const clientSecret = creds.app_secret || creds.client_secret || Deno.env.get("TIKTOK_CLIENT_SECRET");
  if (!clientKey || !clientSecret) throw new Error("Configuração TikTok incompleta.");

  const payload = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_key: clientKey,
    client_secret: clientSecret
  };

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload)
  });

  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "tiktok", stage: "exchange" });
  if (data.error) throw new Error(data.error_description || data.error?.message || "Erro TikTok OAuth");

  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 86400;

  const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,avatar_url_100,display_name", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const userData = await userRes.json();
  const user = userData?.data?.user || {};

  return [{
    accessToken,
    refreshToken: data.refresh_token || "",
    expiresIn,
    platformUserId: user.open_id || user.union_id || "",
    pageName: user.display_name || "",
    pageId: "",
    profileImageUrl: user.avatar_url_100 || user.avatar_url || ""
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

    const { code, state, platform, redirect_uri: incomingRedirectUri } = await req.json();
    if (!code || !state || !platform) return oauthError(platform || "unknown", "callback", "code, state, and platform are required");

    // Fetch state from DB
    const { data: oauthState, error: stateError } = await supabase.from("oauth_states").select("*").eq("state", state).eq("user_id", user.id).eq("platform", platform).single();
    if (stateError || !oauthState) return oauthError(platform, "callback", "Invalid or expired OAuth state");

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

    const formattedCreds: any = {};
    
    if (platform === "twitter") {
      formattedCreds.client_id = raw.client_id || Deno.env.get("TWITTER_CLIENT_ID");
      formattedCreds.client_secret = raw.client_secret || Deno.env.get("TWITTER_CLIENT_SECRET");
    } else if (platform === "reddit") {
      formattedCreds.client_id = raw.client_id || Deno.env.get("REDDIT_CLIENT_ID");
      formattedCreds.client_secret = raw.client_secret || Deno.env.get("REDDIT_CLIENT_SECRET");
    } else if (platform === "google" || platform === "youtube") {
      formattedCreds.client_id = raw.client_id || raw.youtube_id || Deno.env.get("GOOGLE_CLIENT_ID");
      formattedCreds.client_secret = raw.client_secret || Deno.env.get("GOOGLE_CLIENT_SECRET");
    } else {
      formattedCreds.app_id = raw.app_id || raw.client_id || raw.threads_client_id || Deno.env.get("META_APP_ID") || Deno.env.get("THREADS_CLIENT_ID");
      formattedCreds.app_secret = raw.app_secret || raw.client_secret || raw.threads_client_secret || Deno.env.get("META_APP_SECRET") || Deno.env.get("THREADS_CLIENT_SECRET");
    }


    let results: TokenResult[];

    switch (platform) {
      case "google":
      case "youtube": results = await exchangeGoogle(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
      case "facebook":
      case "instagram":
      case "whatsapp": results = await exchangeMeta(code, oauthState.redirect_uri, platform, formattedCreds, supabase, user.id); break;
      case "threads": results = await exchangeThreads(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
      case "twitter": results = await exchangeTwitter(code, oauthState.redirect_uri, oauthState.code_verifier || "", formattedCreds, supabase, user.id); break;
      case "reddit": results = await exchangeReddit(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
      case "linkedin": results = await exchangeLinkedIn(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
      case "tiktok": results = await exchangeTikTok(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
      default:
        throw new Error(`Troca de token para plataforma '${platform}' não implementada.`);
    }

    // Upsert connections
    for (const result of results) {
       const expiresAt = new Date(Date.now() + result.expiresIn * 1000).toISOString();
       const phoneNumberId = (result as any)._phoneNumberId || "";
       const upsertData: any = {
         user_id: user.id, platform, access_token: result.accessToken, refresh_token: result.refreshToken || null,
         token_expires_at: expiresAt, platform_user_id: result.platformUserId, page_name: result.pageName,
         page_id: platform === "whatsapp" ? null : (result.pageId || null),
         profile_image_url: result.profileImageUrl || null, is_connected: true, updated_at: new Date().toISOString(),
       };
       if (phoneNumberId) upsertData.phone_number_id = phoneNumberId;
       if (result.platformUserId) upsertData.waba_id = result.platformUserId;
       await supabase.from("social_connections").upsert(upsertData, { onConflict: "user_id,platform,platform_user_id" });

       await supabase.from("social_accounts").upsert({
         user_id: user.id, platform, platform_user_id: result.platformUserId, username: result.username || result.pageName,
         page_name: result.pageName, profile_picture: result.profileImageUrl, is_connected: true, updated_at: new Date().toISOString(),
       }, { onConflict: "user_id,platform,platform_user_id" });

       // Sync WhatsApp tokens to api_credentials for downstream functions
        if (platform === "whatsapp" && result.accessToken && result.platformUserId) {
          const { data: existing } = await supabase
            .from("api_credentials")
            .select("credentials")
            .eq("user_id", user.id)
            .eq("platform", "whatsapp")
            .maybeSingle();
          const existingCreds = (existing?.credentials as Record<string, any>) || {};
          await supabase.from("api_credentials").upsert({
            user_id: user.id,
            platform: "whatsapp",
            credentials: {
              app_id: formattedCreds.app_id || existingCreds.app_id || "",
              access_token: result.accessToken,
              phone_number_id: phoneNumberId || existingCreds.phone_number_id || "",
              waba_id: result.platformUserId,
              profile_image_url: result.profileImageUrl || existingCreds.profile_image_url || "",
            },
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,platform" });
        }
    }

    await supabase.from("oauth_states").delete().eq("id", oauthState.id);
    
    return new Response(JSON.stringify({ success: true, platform, count: results.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error in social-oauth-callback:", error);
    return oauthError("unknown", "callback", error);
  }
});
