import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

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

  return {
    ...userCreds,

    accessToken:
      connection?.access_token ||
      userCreds.access_token ||
      userCreds.accessToken ||
      userCreds.token,

    refreshToken: connection?.refresh_token,

    pageId: connection?.page_id,
    pageName: connection?.page_name,

    // ⚠️ NÃO misturar aqui (Threads será tratado separado)
    platformUserId: connection?.platform_user_id,

    expiresAt: connection?.token_expires_at
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

  if (!connection.access_token) {
    return { error: "Access token do Threads ausente" };
  }

  if (!connection.platform_user_id) {
    return { error: "platform_user_id do Threads não encontrado" };
  }

  return {
    accessToken: connection.access_token,
    platformUserId: connection.platform_user_id,
    expiresAt: connection.token_expires_at
  };
}