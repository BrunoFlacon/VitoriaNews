import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

/**
 * 🔹 Renova o access_token de uma conexão OAuth usando refresh_token.
 * Usa as credenciais de client_id/client_secret salvas em api_credentials
 * (fallback: env vars). Plataformas: google/youtube, twitter, linkedin,
 * tiktok, facebook/instagram/whatsapp (fb_exchange) e threads (th_refresh).
 */
export async function refreshConnectionToken(
  supabase: any,
  connection: any
): Promise<{ accessToken: string; expiresAt: string; refreshToken?: string }> {
  const platform = connection?.platform;
  if (!platform) throw new Error("Conexão sem plataforma.");

  const lookupPlatform = platform === "youtube" ? "google" : platform;

  const { data: apiCreds } = await supabase
    .from("api_credentials")
    .select("credentials")
    .eq("user_id", connection.user_id)
    .eq("platform", lookupPlatform)
    .maybeSingle();
  const userCreds = apiCreds?.credentials || {};

  let tokenUrl = "";
  let bodyParams: Record<string, string> = {};
  let authHeader: Record<string, string> = {};
  let defaultExpiresIn = 3600;

  if (platform === "google" || platform === "youtube") {
    tokenUrl = "https://oauth2.googleapis.com/token";
    bodyParams = {
      client_id: userCreds.client_id || Deno.env.get("GOOGLE_CLIENT_ID") || "",
      client_secret: userCreds.client_secret || Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    };
    if (!bodyParams.client_id || !bodyParams.client_secret) {
      throw new Error("YouTube/Google: client_id/client_secret não configurados (api_credentials.google).");
    }
    defaultExpiresIn = 3600;
  } else if (platform === "twitter") {
    tokenUrl = "https://api.x.com/2/oauth2/token";
    const clientId = userCreds.client_id || Deno.env.get("TWITTER_CLIENT_ID") || Deno.env.get("TWITTER_CONSUMER_KEY");
    const clientSecret = userCreds.client_secret || Deno.env.get("TWITTER_CONSUMER_SECRET");
    if (!clientId) throw new Error("X (Twitter): client_id não configurado (api_credentials.twitter).");
    bodyParams = { refresh_token: connection.refresh_token, grant_type: "refresh_token" };
    if (clientSecret) {
      authHeader = { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}` };
    } else {
      bodyParams.client_id = clientId;
    }
    defaultExpiresIn = 7200;
  } else if (platform === "linkedin") {
    tokenUrl = "https://api.linkedin.com/v2/accessToken";
    bodyParams = {
      client_id: userCreds.client_id || Deno.env.get("LINKEDIN_CLIENT_ID") || "",
      client_secret: userCreds.client_secret || Deno.env.get("LINKEDIN_CLIENT_SECRET") || "",
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    };
    if (!bodyParams.client_id || !bodyParams.client_secret) {
      throw new Error("LinkedIn: client_id/client_secret não configurados (api_credentials.linkedin).");
    }
    defaultExpiresIn = 5184000;
  } else if (platform === "tiktok") {
    tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/";
    bodyParams = {
      client_key: userCreds.client_key || Deno.env.get("TIKTOK_CLIENT_KEY") || "",
      client_secret: userCreds.client_secret || Deno.env.get("TIKTOK_CLIENT_SECRET") || "",
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    };
    if (!bodyParams.client_key || !bodyParams.client_secret) {
      throw new Error("TikTok: client_key/client_secret não configurados (api_credentials.tiktok).");
    }
    defaultExpiresIn = 86400;
  } else if (platform === "facebook" || platform === "instagram" || platform === "whatsapp") {
    // fb_exchange: estende token long-lived (60 dias) enquanto ainda válido
    tokenUrl =
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${encodeURIComponent(userCreds.app_id || Deno.env.get("META_APP_ID") || "")}` +
      `&client_secret=${encodeURIComponent(userCreds.app_secret || Deno.env.get("META_APP_SECRET") || "")}` +
      `&fb_exchange_token=${encodeURIComponent(connection.access_token || "")}`;
    if (!connection.access_token) throw new Error(`${platform}: sem access_token para estender.`);
    defaultExpiresIn = 5184000;
  } else if (platform === "threads") {
    tokenUrl =
      `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token` +
      `&access_token=${encodeURIComponent(connection.access_token || userCreds.access_token || "")}`;
    if (!connection.access_token && !userCreds.access_token) {
      throw new Error("Threads: sem access_token para renovar.");
    }
    defaultExpiresIn = 5184000;
  } else {
    throw new Error(`Token refresh not supported for ${platform}`);
  }

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...authHeader },
    body: new URLSearchParams(bodyParams),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    const msg = data.error_description || data.error?.message || data.error || `HTTP ${res.status}`;
    throw new Error(`[refresh:${platform}] ${msg}`);
  }

  const expiresIn = data.expires_in || defaultExpiresIn;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const updateData: Record<string, unknown> = {
    access_token: data.access_token,
    token_expires_at: expiresAt,
    refresh_error: null,
    last_refresh_attempt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Reconexão automática: refresh bem-sucedido religa a conexão
    is_connected: true,
  };
  if (data.refresh_token) {
    updateData.refresh_token = data.refresh_token;
  }

  await supabase
    .from("social_connections")
    .update(updateData)
    .eq("id", connection.id)
    .eq("user_id", connection.user_id);

  console.log(`[credentials] Token renovado com sucesso (${platform}). Expira: ${expiresAt}`);
  return { accessToken: data.access_token, expiresAt, refreshToken: data.refresh_token };
}

/**
 * 🔹 Garante um token fresco para a conexão: se estiver expirado ou prestes a
 * expirar (ou a conexão estiver desconectada com refresh_token), renova na hora.
 */
export async function ensureFreshToken(
  supabase: any,
  connection: any
): Promise<{ accessToken: string | null; refreshed: boolean }> {
  if (!connection) return { accessToken: null, refreshed: false };

  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  const soon = Date.now() + 10 * 60 * 1000; // 10 min de margem
  const needsRefresh =
    !connection.access_token ||
    (expiresAt > 0 && expiresAt <= soon) ||
    (!connection.is_connected && connection.refresh_token);

  if (!needsRefresh || !connection.refresh_token) {
    return { accessToken: connection.access_token || null, refreshed: false };
  }

  try {
    const fresh = await refreshConnectionToken(supabase, connection);
    return { accessToken: fresh.accessToken, refreshed: true };
  } catch (e) {
    console.error(`[credentials] ensureFreshToken falhou (${connection.platform}):`, e?.message || e);
    return { accessToken: connection.access_token || null, refreshed: false };
  }
}

/**
 * 🔹 BASE: credenciais genéricas por plataforma
 */
export async function getPlatformCredentials(
  supabase: any,
  userId: string,
  platform: string,
  targetProfileId?: string
) {
  const lookupPlatform = platform === "youtube" ? "google" : platform;

  // 🔑 API CREDENTIALS (App ID / Secret)
  const { data: apiCreds } = await supabase
    .from("api_credentials")
    .select("credentials")
    .eq("user_id", userId)
    .eq("platform", lookupPlatform)
    .maybeSingle();

  // 🔗 SOCIAL CONNECTIONS (OAuth)
  let query = supabase
    .from("social_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("is_connected", true);

  if (targetProfileId) {
    query = query.or(
      `id.eq.${targetProfileId},platform_user_id.eq.${targetProfileId},page_id.eq.${targetProfileId}`
    );
  }

  const { data: connections } = await query;
  const connection = connections?.[0];

  const userCreds = apiCreds?.credentials || {};

  // 🔄 AUTO-REFRESH: se o token estiver expirado/prestes a expirar (ou a
  // conexão estiver desconectada com refresh_token), renova na hora para a
  // publicação nunca falhar por token vencido — e reconecta automaticamente.
  let freshAccessToken: string | null = null;
  if (connection) {
    const fresh = await ensureFreshToken(supabase, connection);
    freshAccessToken = fresh.accessToken;
  }

  return {
    ...userCreds,

    // Identidade do perfil OAuth realmente usado (para persistir após publicação)
    connectionId: connection?.id || null,
    connectionPageName: connection?.page_name || null,
    connectionUsername: connection?.username || null,

    accessToken:
      freshAccessToken ||
      connection?.access_token ||
      userCreds.access_token ||
      userCreds.accessToken ||
      userCreds.token,

    refreshToken: connection?.refresh_token,

    pageId: connection?.page_id,
    pageName: connection?.page_name,

    // ⚠️ NÃO misturar aqui (Threads será tratado separado)
    platformUserId: connection?.platform_user_id,

    expiresAt: connection?.token_expires_at,

    // Indica se existe conexão OAuth ativa (evita "sucesso falso")
    isConnected: !!connection
  };
}

//🔵 META (FACEBOOK / INSTAGRAM / WHATSAPP)

export async function getMetaCredentials(
  supabase: any,
  userId: string,
  platform: string,
  targetProfileId?: string
) {
  const creds = await getPlatformCredentials(
    supabase,
    userId,
    platform,
    targetProfileId
  );

  return {
    appId: creds.app_id || (Deno as any).env.get("META_APP_ID"),
    appSecret: creds.app_secret || (Deno as any).env.get("META_APP_SECRET"),

    accessToken: creds.accessToken,

    connectionId: creds.connectionId,
    pageId: creds.pageId,
    pageName: creds.pageName,

    platformUserId: creds.platformUserId,

    phoneNumberId: creds.phone_number_id || creds.phone_id,
    wabaId: creds.waba_id
  };
}

// 🟣 THREADS (ISOLADO — CORREÇÃO DEFINITIVA)

export async function getThreadsCredentials(
  supabase: any,
  userId: string,
  targetProfileId?: string
) {
  let query = supabase
    .from("social_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "threads")
    .eq("is_connected", true);

  if (targetProfileId) {
    query = query.or(
      `id.eq.${targetProfileId},platform_user_id.eq.${targetProfileId}`
    );
  }

  const { data } = await query;
  const connection = data?.[0];

  if (!connection) {
    return { error: "Threads não conectado" };
  }

  // 🔄 AUTO-REFRESH: renova o token do Threads quando estiver vencendo
  if (connection.refresh_token || connection.token_expires_at) {
    await ensureFreshToken(supabase, connection);
  }

  if (!connection.access_token) {
    // Fallback: token pode estar em api_credentials (fluxo OAuth antigo)
    const { data: apiCreds } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", "threads")
      .maybeSingle();

    const apiToken =
      apiCreds?.credentials?.access_token ||
      apiCreds?.credentials?.accessToken;

    if (!apiToken) {
      return { error: "Access token do Threads ausente" };
    }

    return {
      accessToken: apiToken,
      platformUserId: connection.platform_user_id,
      connectionId: connection.id,
      connectionUsername: connection.username,
      connectionPageName: connection.page_name,
      expiresAt: connection.token_expires_at
    };
  }

  if (!connection.platform_user_id) {
    return { error: "platform_user_id do Threads não encontrado" };
  }

  return {
    accessToken: connection.access_token,
    platformUserId: connection.platform_user_id,
    connectionId: connection.id,
    connectionUsername: connection.username,
    connectionPageName: connection.page_name,
    expiresAt: connection.token_expires_at
  };
}

// 🟥 YOUTUBE (GOOGLE) — renovação automática de token OAuth (expira em ~1h)

export async function refreshYoutubeToken(
  supabase: any,
  userId: string,
  connectionId: string | null
): Promise<{ accessToken: string; expiresAt: string }> {
  // 1. Conexão com refresh_token (pela connectionId quando possível)
  let connQuery = supabase
    .from("social_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "youtube")
    .eq("is_connected", true);

  if (connectionId) {
    connQuery = connQuery.eq("id", connectionId);
  }

  const { data: connectionList } = await connQuery.limit(1);
  const connection = connectionList?.[0];

  if (!connection?.refresh_token) {
    throw new Error(
      "YouTube: refresh token não encontrado. Reconecte a conta do Google (YouTube)."
    );
  }

  // 2. Client ID / Secret (platform "google")
  const { data: apiCreds } = await supabase
    .from("api_credentials")
    .select("credentials")
    .eq("user_id", userId)
    .eq("platform", "google")
    .maybeSingle();

  const clientId = apiCreds?.credentials?.client_id;
  const clientSecret = apiCreds?.credentials?.client_secret;

  if (!clientId || !clientSecret) {
    throw new Error(
      "YouTube: client_id/client_secret do Google não configurados (api_credentials.google)."
    );
  }

  // 3. Troca refresh_token por access_token novo
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  });

  const tokenBody = await tokenRes.json().catch(() => ({}));

  if (!tokenRes.ok || !tokenBody?.access_token) {
    const msg =
      tokenBody?.error_description || tokenBody?.error || `HTTP ${tokenRes.status}`;
    throw new Error(`YouTube: falha ao renovar token (${msg}). Reconecte a conta do Google.`);
  }

  const expiresAt = new Date(
    Date.now() + (tokenBody.expires_in || 3600) * 1000
  ).toISOString();

  // 4. Salva o novo token na conexão (e refresh_token rotativo, se retornado)
  const update: Record<string, unknown> = {
    access_token: tokenBody.access_token,
    token_expires_at: expiresAt,
  };
  if (tokenBody.refresh_token) {
    update.refresh_token = tokenBody.refresh_token;
  }

  if (connectionId) {
    await supabase
      .from("social_connections")
      .update(update)
      .eq("id", connectionId)
      .eq("user_id", userId);
  } else {
    await supabase
      .from("social_connections")
      .update(update)
      .eq("user_id", userId)
      .eq("platform", "youtube")
      .eq("is_connected", true);
  }

  console.log("[credentials] YouTube token renovado com sucesso.");
  return { accessToken: tokenBody.access_token, expiresAt };
}