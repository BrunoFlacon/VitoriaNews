// Ported from supabase/functions/social-oauth-init (Deno) → Node/Express local runtime.
// Generates the provider OAuth URL and stores an oauth_state row.
import { getPlatformCreds, getVal, uuid, fnError, json } from "../lib/fnShared.js";

const NON_OAUTH = ['googlenews','giphy','site','telegram','kwai','rumble','gettr','truthsocial','medium','substack','resend'];

async function logOAuth(supabase, data) {
  try {
    await supabase.from("oauth_logs").insert(data);
  } catch (e) {
    console.warn("Falha ao gravar log de OAuth:", e);
  }
}

export default async function socialOauthInit({ body, user, supabase }) {
  const { platform, redirect_uri } = body;
  if (!platform || !redirect_uri) return fnError(platform || "unknown", "init", "platform and redirect_uri are required");

  if (NON_OAUTH.includes(platform.toLowerCase())) {
    return fnError(platform, "init", `A plataforma '${platform}' utiliza chaves de API ou identificadores manuais, não OAuth padrão. Configure as credenciais diretamente na aba de Configurações das APIs.`);
  }

  let creds = await getPlatformCreds(supabase, user.id, platform) || {};

  if (["instagram", "threads", "whatsapp"].includes(platform)) {
    const fb = await getPlatformCreds(supabase, user.id, "facebook") || {};
    const meta = await getPlatformCreds(supabase, user.id, "meta") || {};
    creds = { ...fb, ...meta, ...creds };
  } else if (platform === "youtube" || platform === "google") {
    const g = await getPlatformCreds(supabase, user.id, "google") || {};
    const y = await getPlatformCreds(supabase, user.id, "youtube") || {};
    const c = await getPlatformCreds(supabase, user.id, "google_cloud") || {};
    creds = { ...c, ...y, ...g, ...creds };
  }

  const formattedCreds = {
    client_id: getVal(creds, "client_id", "GOOGLE_CLIENT_ID") || getVal(creds, "youtube_id", "GOOGLE_CLIENT_ID"),
    client_secret: getVal(creds, "client_secret", "GOOGLE_CLIENT_SECRET"),
    app_id: getVal(creds, "app_id", "META_APP_ID") || getVal(creds, "client_id", "THREADS_CLIENT_ID"),
    app_secret: getVal(creds, "app_secret", "META_APP_SECRET") || getVal(creds, "client_secret", "THREADS_CLIENT_SECRET"),
  };

  if (["google", "youtube"].includes(platform) && (!formattedCreds.client_id || !formattedCreds.client_secret)) {
    return fnError(platform, "init", "Configuração Google/YouTube incompleta: client_id ou client_secret ausentes.");
  }
  if (["facebook", "instagram", "threads", "whatsapp", "meta"].includes(platform) && (!formattedCreds.app_id || !formattedCreds.app_secret)) {
    return fnError(platform, "init", `Configuração ${platform.toUpperCase()} incompleta: app_id ou app_secret ausentes.`);
  }

  const state = uuid().replace(/-/g, "");
  await supabase.from("oauth_states").insert({ user_id: user.id, platform, state, redirect_uri });

  let authUrl = "";

  if (platform === "google" || platform === "youtube") {
    const scopes = "openid profile email https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/business.manage";
    authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
      client_id: formattedCreds.client_id,
      redirect_uri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent select_account",
      state,
    });
  } else if (["facebook", "instagram", "whatsapp"].includes(platform)) {
    const scopes = platform === "instagram"
      ? "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement"
      : platform === "whatsapp"
        ? "whatsapp_business_management,whatsapp_business_messaging,business_management"
        : "pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata";
    authUrl = "https://www.facebook.com/v21.0/dialog/oauth?" + new URLSearchParams({
      client_id: formattedCreds.app_id,
      redirect_uri,
      scope: scopes,
      state,
      response_type: "code",
    });
  } else if (platform === "threads") {
    const threadsCreds = await getPlatformCreds(supabase, user.id, "threads") || {};
    const fb = await getPlatformCreds(supabase, user.id, "facebook") || {};
    const meta = await getPlatformCreds(supabase, user.id, "meta") || {};
    const merged = { ...fb, ...meta, ...threadsCreds };
    const threadsAppId = merged.app_id || merged.client_id || process.env.META_APP_ID || process.env.THREADS_CLIENT_ID || null;
    if (!threadsAppId) return fnError(platform, "init", "Threads App ID (app_id) não encontrado. Salve as credenciais do Threads ou configure META_APP_ID.");
    const finalAppId = threadsAppId.trim();
    const scope = "threads_basic,threads_content_publish";
    authUrl = `https://www.threads.net/oauth/authorize?client_id=${finalAppId}&app_id=${finalAppId}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&response_type=code`;
  } else if (platform === "spotify") {
    const id = formattedCreds.client_id || getVal(creds, "client_id", "SPOTIFY_CLIENT_ID");
    if (!id) return fnError(platform, "init", "Client ID do Spotify não configurado.");
    authUrl = "https://accounts.spotify.com/authorize?" + new URLSearchParams({
      client_id: id, redirect_uri, scope: "user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private", state, response_type: "code",
    });
  } else if (platform === "reddit") {
    const id = formattedCreds.client_id || getVal(creds, "client_id", "REDDIT_CLIENT_ID");
    if (!id) return fnError(platform, "init", "Client ID do Reddit não configurado.");
    authUrl = "https://www.reddit.com/api/v1/authorize?" + new URLSearchParams({
      client_id: id, redirect_uri, scope: "identity,submit,read", state, response_type: "code", duration: "permanent",
    });
  } else if (platform === "twitter") {
    const twitterKey = getVal(creds, "client_id", "TWITTER_CLIENT_ID");
    if (!twitterKey) return fnError(platform, "init", "Client ID do X (Twitter) não configurado.");
    const verifierChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let codeVerifier = "";
    for (let i = 0; i < 64; i++) codeVerifier += verifierChars.charAt(Math.floor(Math.random() * verifierChars.length));
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier));
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await supabase.from("oauth_states").update({ code_verifier: codeVerifier }).eq("state", state);
    authUrl = "https://twitter.com/i/oauth2/authorize?" + new URLSearchParams({
      response_type: "code", client_id: twitterKey, redirect_uri, scope: "tweet.read tweet.write users.read offline.access", state, code_challenge: challenge, code_challenge_method: "S256",
    });
  } else {
    const clientId = formattedCreds.app_id || formattedCreds.client_id || getVal(creds, "client_id", `${platform.toUpperCase()}_CLIENT_ID`);
    if (!clientId) return fnError(platform, "init", `Client ID para ${platform} não encontrado.`);
    const endpoints = {
      linkedin: "https://www.linkedin.com/oauth/v2/authorization",
      tiktok: "https://www.tiktok.com/v2/auth/authorize/",
      pinterest: "https://www.pinterest.com/oauth/",
      snapchat: "https://accounts.snapchat.com/login/oauth2/authorize",
    };
    if (!endpoints[platform]) return fnError(platform, "init", `Plataforma '${platform}' não suportada para OAuth.`);
    authUrl = `${endpoints[platform]}?` + new URLSearchParams({
      client_id: clientId, redirect_uri, state, response_type: "code",
      scope: platform === "linkedin" ? "openid profile email w_member_social" : "",
    });
  }

  await logOAuth(supabase, {
    user_id: user.id, provider: platform, stage: "init",
    request_payload: { platform, redirect_uri, state, debug_app_id: formattedCreds.app_id },
    response_payload: { authUrl },
  });

  return json({ authUrl, state });
}
