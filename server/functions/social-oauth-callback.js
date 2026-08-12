// Ported from supabase/functions/social-oauth-callback (Deno) → Node/Express local runtime.
import { getPlatformCreds, getVal, fnError, json } from "../lib/fnShared.js";

async function logOAuth(supabase, data) {
  try { await supabase.from("oauth_logs").insert(data); } catch (e) { console.warn("logOAuth:", e); }
}

async function exchangeGoogle(code, redirectUri, creds, supabase, userId) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: creds.client_id, client_secret: creds.client_secret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const data = await res.json();
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
    return channelData.items.map((ch) => ({
      accessToken, refreshToken, expiresIn,
      platformUserId: ch.id, pageName: ch.snippet.title, pageId: "",
      profileImageUrl: ch.snippet.thumbnails?.default?.url || userData.picture || "",
    }));
  }
  return [{ accessToken, refreshToken, expiresIn, platformUserId: userData.id, pageName: userData.name || userData.email, pageId: "", profileImageUrl: userData.picture || "" }];
}

async function exchangeMeta(code, redirectUri, platform, creds, supabase, userId) {
  const url = "https://graph.facebook.com/v21.0/oauth/access_token?" + new URLSearchParams({
    client_id: creds.app_id, client_secret: creds.app_secret, redirect_uri: redirectUri, code,
  });
  const res = await fetch(url);
  const data = await res.json();
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

  const results = [];
  if (platform === "instagram") {
    for (const page of pages) {
      const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
      const igData = await igRes.json();
      if (igData.instagram_business_account?.id) {
        const platformUserId = igData.instagram_business_account.id;
        const pagePic = page.picture?.data?.url || defaultProfileImageUrl;
        let profileImageUrl = pagePic, pageName = "";
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
          let profileImageUrl = "", bizName = biz.name, wabaId = biz.id, resolvedPhoneId = "";
          try {
            const wabaRes = await fetch(`https://graph.facebook.com/v21.0/${biz.id}/owned_whatsapp_business_accounts?access_token=${accessToken}`);
            const wabaData = await wabaRes.json();
            if (wabaData.data && wabaData.data.length > 0) {
              wabaId = wabaData.data[0].id;
              const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id,display_phone_number,profile_photo_url,verified_name&access_token=${accessToken}`);
              const phoneData = await phoneRes.json();
              if (phoneData.data && phoneData.data.length > 0) {
                const phone = phoneData.data[0];
                resolvedPhoneId = phone.id || "";
                if (phone.profile_photo_url) profileImageUrl = phone.profile_photo_url;
                if (phone.verified_name) bizName = phone.verified_name;
              }
            }
          } catch (e) { console.error("WhatsApp WABA resolve:", e); }
          const r = { accessToken, refreshToken: "", expiresIn, platformUserId: wabaId, pageName: bizName, pageId: "", profileImageUrl };
          if (resolvedPhoneId) r._phoneNumberId = resolvedPhoneId;
          results.push(r);
        }
      }
    } catch (e) { console.error("WhatsApp businesses:", e); }
  } else {
    for (const page of pages) {
      const pagePic = `https://graph.facebook.com/v21.0/${page.id}/picture?type=large`;
      results.push({ accessToken: page.access_token, refreshToken: "", expiresIn, platformUserId: page.id, pageName: page.name, pageId: page.id, profileImageUrl: pagePic });
    }
  }
  if (results.length === 0 && platform !== "whatsapp") {
    const personalPic = `https://graph.facebook.com/v21.0/${meData.id}/picture?type=large`;
    results.push({ accessToken, refreshToken: "", expiresIn, platformUserId: meData.id, pageName: meData.name, pageId: "", profileImageUrl: personalPic });
  }
  return results;
}

async function exchangeThreads(code, redirectUri, creds, supabase, userId) {
  const res = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: creds.app_id, client_secret: creds.app_secret, grant_type: "authorization_code", redirect_uri: redirectUri, code }),
  });
  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "threads", stage: "exchange" });
  if (data.error) throw new Error(data.error.message || "Erro Threads OAuth");
  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 5184000;
  const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,followers_count,threads_count,biography&access_token=${accessToken}`);
  const meData = await meRes.json();
  return [{ accessToken, refreshToken: "", expiresIn, platformUserId: meData.id || "", pageName: meData.username || "", pageId: "", profileImageUrl: meData.threads_profile_picture_url || "", followersCount: meData.followers_count || 0, postsCount: meData.threads_count || 0, username: meData.username || "", biography: meData.biography || "" }];
}

async function exchangeTwitter(code, redirectUri, codeVerifier, creds) {
  const clientId = creds.client_id || process.env.TWITTER_CLIENT_ID;
  const clientSecret = creds.client_secret || process.env.TWITTER_CLIENT_SECRET;
  if (!clientId) throw new Error("Client ID do Twitter não configurado.");
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (clientSecret) headers["Authorization"] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST", headers,
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: codeVerifier, client_id: clientId }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  const accessToken = data.access_token, refreshToken = data.refresh_token || "", expiresIn = data.expires_in || 7200;
  const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics", { headers: { Authorization: `Bearer ${accessToken}` } });
  const userData = await userRes.json();
  const user = userData.data;
  return [{ accessToken, refreshToken, expiresIn, platformUserId: user.id, pageName: user.name, pageId: "", profileImageUrl: user.profile_image_url?.replace("_normal", "") || "", username: user.username, followers: user.public_metrics?.followers_count || 0, postsCount: user.public_metrics?.tweet_count || 0 }];
}

async function exchangeLinkedIn(code, redirectUri, creds, supabase, userId) {
  const clientId = creds.app_id || creds.client_id || process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = creds.app_secret || creds.client_secret || process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Configuração LinkedIn incompleta.");

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
  });
  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "linkedin", stage: "exchange" });
  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 5184000;
  const meRes = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
  const meData = await meRes.json();
  return [{ accessToken, refreshToken: data.refresh_token || "", expiresIn, platformUserId: meData.sub, pageName: meData.name || meData.given_name || "", pageId: "", profileImageUrl: meData.picture || "" }];
}

async function exchangeTikTok(code, redirectUri, creds, supabase, userId) {
  const clientKey = creds.app_id || creds.client_id || process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = creds.app_secret || creds.client_secret || process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) throw new Error("Configuração TikTok incompleta.");

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, client_key: clientKey, client_secret: clientSecret }),
  });
  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "tiktok", stage: "exchange" });
  if (data.error) throw new Error(data.error_description || data.error?.message || "Erro TikTok OAuth");

  const accessToken = data.access_token;
  const expiresIn = data.expires_in || 86400;
  const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,avatar_url_100,display_name", { headers: { Authorization: `Bearer ${accessToken}` } });
  const userData = await userRes.json();
  const user = userData?.data?.user || {};
  return [{ accessToken, refreshToken: data.refresh_token || "", expiresIn, platformUserId: user.open_id || user.union_id || "", pageName: user.display_name || "", pageId: "", profileImageUrl: user.avatar_url_100 || user.avatar_url || "" }];
}

async function exchangeReddit(code, redirectUri, creds, supabase, userId) {
  const clientId = creds.client_id || process.env.REDDIT_CLIENT_ID;
  const clientSecret = creds.client_secret || process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Configuração Reddit incompleta.");

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "SocialCanvasHub/1.0" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || "";
  const expiresIn = data.expires_in || 3600;
  const userRes = await fetch("https://oauth.reddit.com/api/v1/me", { headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "SocialCanvasHub/1.0" } });
  const userData = await userRes.json();
  return [{ accessToken, refreshToken, expiresIn, platformUserId: userData.id, pageName: userData.name, pageId: "", profileImageUrl: userData.icon_img?.split("?")[0] || "", username: userData.name }];
}

async function exchangeSpotify(code, redirectUri, pkceVerifier, creds, supabase, userId) {
  const clientId = creds.client_id;
  const clientSecret = creds.client_secret;
  if (!clientId || !clientSecret) throw new Error("Configuração Spotify incompleta.");

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${auth}` },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri, code_verifier: pkceVerifier }),
  });
  const data = await res.json();
  await logOAuth(supabase, { user_id: userId, provider: "spotify", stage: "exchange" });
  if (data.error) throw new Error(data.error_description || data.error);

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || "";
  const expiresIn = data.expires_in || 3600;
  const userRes = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${accessToken}` } });
  const userData = await userRes.json();
  return [{ accessToken, refreshToken, expiresIn, platformUserId: userData.id, pageName: userData.display_name || userData.id, pageId: "", profileImageUrl: userData.images?.[0]?.url || "", username: userData.id, followers: userData.followers?.total || 0, postsCount: 0 }];
}

export default async function socialOauthCallback({ body, user, supabase }) {
  const { code, state, platform, redirect_uri: incomingRedirectUri } = body;
  if (!code || !state || !platform) return fnError(platform || "unknown", "callback", "code, state, and platform are required");

  const { data: oauthState, error: stateError } = await supabase
    .from("oauth_states").select("*").eq("state", state).eq("user_id", user.id).eq("platform", platform).single();
  if (stateError || !oauthState) return fnError(platform, "callback", "Invalid or expired OAuth state");
  if (incomingRedirectUri && oauthState.redirect_uri !== incomingRedirectUri) {
    return fnError(platform, "callback", `Divergência de Redirect URI: esperado ${oauthState.redirect_uri}, recebido ${incomingRedirectUri}`);
  }

  const getCreds = async (p) => getPlatformCreds(supabase, user.id, p);
  let raw = {};
  if (platform === "youtube" || platform === "google") {
    raw = { ...(await getCreds("google_cloud")), ...(await getCreds("youtube")), ...(await getCreds("google")) };
  } else if (["threads", "instagram", "facebook", "whatsapp"].includes(platform)) {
    raw = { ...(await getCreds("facebook")), ...(await getCreds("meta")), ...(await getCreds(platform)) };
  } else {
    raw = await getCreds(platform);
  }

  const formattedCreds = {};
  if (platform === "twitter") {
    formattedCreds.client_id = raw.client_id || process.env.TWITTER_CLIENT_ID;
    formattedCreds.client_secret = raw.client_secret || process.env.TWITTER_CLIENT_SECRET;
  } else if (platform === "spotify") {
    formattedCreds.client_id = raw.client_id; formattedCreds.client_secret = raw.client_secret;
  } else if (platform === "reddit") {
    formattedCreds.client_id = raw.client_id || process.env.REDDIT_CLIENT_ID;
    formattedCreds.client_secret = raw.client_secret || process.env.REDDIT_CLIENT_SECRET;
  } else if (platform === "google" || platform === "youtube") {
    formattedCreds.client_id = raw.client_id || raw.youtube_id || process.env.GOOGLE_CLIENT_ID;
    formattedCreds.client_secret = raw.client_secret || process.env.GOOGLE_CLIENT_SECRET;
  } else {
    formattedCreds.app_id = raw.app_id || raw.client_id || raw.threads_client_id || process.env.META_APP_ID || process.env.THREADS_CLIENT_ID;
    formattedCreds.app_secret = raw.app_secret || raw.client_secret || raw.threads_client_secret || process.env.META_APP_SECRET || process.env.THREADS_CLIENT_SECRET;
  }

  let results;
  switch (platform) {
    case "google":
    case "youtube": results = await exchangeGoogle(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
    case "facebook":
    case "instagram":
    case "whatsapp": results = await exchangeMeta(code, oauthState.redirect_uri, platform, formattedCreds, supabase, user.id); break;
    case "threads": results = await exchangeThreads(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
    case "twitter": results = await exchangeTwitter(code, oauthState.redirect_uri, oauthState.code_verifier || "", formattedCreds); break;
    case "linkedin": results = await exchangeLinkedIn(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
    case "tiktok": results = await exchangeTikTok(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
    case "reddit": results = await exchangeReddit(code, oauthState.redirect_uri, formattedCreds, supabase, user.id); break;
    case "spotify": results = await exchangeSpotify(code, oauthState.redirect_uri, oauthState.code_verifier || "", formattedCreds, supabase, user.id); break;
    default: return fnError(platform, "callback", `Troca de token para plataforma '${platform}' não implementada.`);
  }

  for (const result of results) {
    const expiresAt = new Date(Date.now() + result.expiresIn * 1000).toISOString();
    const phoneNumberId = result._phoneNumberId || "";
    const upsertData = {
      user_id: user.id, platform, access_token: result.accessToken, refresh_token: result.refreshToken || null,
      token_expires_at: expiresAt, platform_user_id: result.platformUserId, page_name: result.pageName,
      page_id: platform === "whatsapp" ? null : (result.pageId || null),
      profile_image_url: result.profileImageUrl || null,
      followers_count: result.followersCount || null,
      posts_count: result.postsCount || null,
      is_connected: true, updated_at: new Date().toISOString(),
    };
    if (phoneNumberId) upsertData.phone_number_id = phoneNumberId;
    if (result.platformUserId) upsertData.waba_id = result.platformUserId;
    await supabase.from("social_connections").upsert(upsertData, { onConflict: "user_id,platform,platform_user_id" });

    await supabase.from("social_accounts").upsert({
      user_id: user.id, platform, platform_user_id: result.platformUserId, username: result.username || result.pageName,
      page_name: result.pageName, profile_picture: result.profileImageUrl,
      followers_count: result.followersCount || null,
      posts_count: result.postsCount || null,
      is_connected: true, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,platform,platform_user_id" });

    if (platform === "whatsapp" && result.accessToken && result.platformUserId) {
      const { data: existing } = await supabase.from("api_credentials").select("credentials").eq("user_id", user.id).eq("platform", "whatsapp").maybeSingle();
      const existingCreds = (existing?.credentials) || {};
      await supabase.from("api_credentials").upsert({
        user_id: user.id, platform: "whatsapp",
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
  return json({ success: true, platform, count: results.length });
}
