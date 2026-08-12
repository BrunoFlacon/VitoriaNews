// Ported from supabase/functions/refresh-social-token (Deno) → Node/Express.
// Refreshes an expired access token for a social connection.
import { getPlatformCreds, getVal, fnError, json } from "../lib/fnShared.js";

async function refreshGoogle(conn, creds, userId) {
  const clientId = getVal(creds, "client_id", "GOOGLE_CLIENT_ID");
  const clientSecret = getVal(creds, "client_secret", "GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Credenciais Google ausentes.");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: conn.refresh_token, grant_type: "refresh_token" }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return { accessToken: data.access_token, expiresIn: data.expires_in || 3600 };
}

async function refreshTwitter(conn, creds) {
  const clientId = getVal(creds, "client_id", "TWITTER_CLIENT_ID");
  const clientSecret = getVal(creds, "client_secret", "TWITTER_CLIENT_SECRET");
  if (!clientId) throw new Error("Client ID do Twitter ausente.");
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (clientSecret) headers["Authorization"] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  const res = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST", headers,
    body: new URLSearchParams({ refresh_token: conn.refresh_token, grant_type: "refresh_token" }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return { accessToken: data.access_token, expiresIn: data.expires_in || 7200, refreshToken: data.refresh_token || conn.refresh_token };
}

async function refreshMeta(conn, creds) {
  const appId = getVal(creds, "app_id", "META_APP_ID") || getVal(creds, "client_id", "THREADS_CLIENT_ID");
  const appSecret = getVal(creds, "app_secret", "META_APP_SECRET") || getVal(creds, "client_secret", "THREADS_CLIENT_SECRET");
  if (!appId || !appSecret) throw new Error("Credenciais Meta ausentes.");
  const res = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: appId, client_secret: appSecret, grant_type: "refresh_token", refresh_token: conn.refresh_token }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error?.message || "Erro Meta refresh");
  return { accessToken: data.access_token, expiresIn: data.expires_in || 5184000 };
}

async function refreshLinkedIn(conn, creds) {
  const clientId = getVal(creds, "app_id", "LINKEDIN_CLIENT_ID") || getVal(creds, "client_id", "LINKEDIN_CLIENT_ID");
  const clientSecret = getVal(creds, "app_secret", "LINKEDIN_CLIENT_SECRET") || getVal(creds, "client_secret", "LINKEDIN_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Credenciais LinkedIn ausentes.");
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refresh_token, client_id: clientId, client_secret: clientSecret }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return { accessToken: data.access_token, expiresIn: data.expires_in || 5184000, refreshToken: data.refresh_token || conn.refresh_token };
}

async function refreshTikTok(conn, creds) {
  const clientKey = getVal(creds, "client_key", "TIKTOK_CLIENT_KEY") || getVal(creds, "app_id", "TIKTOK_CLIENT_KEY") || getVal(creds, "client_id", "TIKTOK_CLIENT_KEY");
  const clientSecret = getVal(creds, "client_secret", "TIKTOK_CLIENT_SECRET") || getVal(creds, "client_secret", "TIKTOK_CLIENT_SECRET");
  if (!clientKey || !clientSecret) throw new Error("Credenciais TikTok ausentes.");
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refresh_token, client_key: clientKey, client_secret: clientSecret }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error?.message || "Erro TikTok refresh");
  return { accessToken: data.access_token, expiresIn: data.expires_in || 86400, refreshToken: data.refresh_token || conn.refresh_token };
}

async function refreshBasic(conn, creds, platform) {
  const clientId = getVal(creds, "client_id", `${platform.toUpperCase()}_CLIENT_ID`);
  const clientSecret = getVal(creds, "client_secret", `${platform.toUpperCase()}_CLIENT_SECRET`);
  if (!clientId || !clientSecret) throw new Error(`Credenciais ${platform} ausentes.`);
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (clientSecret) headers["Authorization"] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  const endpoint = platform === "reddit" ? "https://www.reddit.com/api/v1/access_token" : "https://accounts.spotify.com/api/token";
  const res = await fetch(endpoint, {
    method: "POST", headers,
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refresh_token }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return { accessToken: data.access_token, expiresIn: data.expires_in || 3600, refreshToken: data.refresh_token || conn.refresh_token };
}

export default async function refreshSocialToken({ body, user, supabase }) {
  const { platform } = body;
  if (!platform) return fnError("unknown", "refresh", "platform is required");

  const { data: connection, error: connError } = await supabase
    .from("social_connections").select("*").eq("user_id", user.id).eq("platform", platform).single();
  if (connError || !connection) return fnError(platform, "refresh", `No connection found for ${platform}`, 404);
  if (!connection.refresh_token) {
    // Token não tem refresh (ex: Meta de longa duração). Mantém o atual.
    return json({ success: true, skipped: true, reason: "no_refresh_token", expiresAt: connection.token_expires_at });
  }

  let creds = {};
  if (["instagram", "threads", "facebook", "whatsapp"].includes(platform)) {
    creds = { ...(await getPlatformCreds(supabase, user.id, "facebook")), ...(await getPlatformCreds(supabase, user.id, "meta")), ...(await getPlatformCreds(supabase, user.id, platform)) };
  } else {
    creds = await getPlatformCreds(supabase, user.id, platform);
  }

  let result;
  switch (platform) {
    case "google":
    case "youtube": result = await refreshGoogle(connection, creds, user.id); break;
    case "twitter": result = await refreshTwitter(connection, creds); break;
    case "facebook":
    case "instagram":
    case "threads": result = await refreshMeta(connection, creds); break;
    case "linkedin": result = await refreshLinkedIn(connection, creds); break;
    case "tiktok": result = await refreshTikTok(connection, creds); break;
    case "reddit":
    case "spotify": result = await refreshBasic(connection, creds, platform); break;
    default: return fnError(platform, "refresh", `Token refresh not supported for ${platform}`, 400);
  }

  const newExpiresAt = new Date(Date.now() + result.expiresIn * 1000).toISOString();
  await supabase.from("social_connections").update({
    access_token: result.accessToken,
    refresh_token: result.refreshToken || connection.refresh_token,
    token_expires_at: newExpiresAt,
    last_refresh_attempt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", user.id).eq("platform", platform);

  return json({ success: true, expiresAt: newExpiresAt });
}
