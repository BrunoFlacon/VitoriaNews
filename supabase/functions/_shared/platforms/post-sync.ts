// ============================================================
// post-sync.ts — Sincronização de edição/exclusão de posts
// publicados com as plataformas.
//
// Regra de ouro da auditoria: NUNCA retornar success:true sem
// confirmação real da plataforma. Plataformas sem API de
// update/delete retornam { unsupported: true, message } honesto.
// ============================================================
import { getPlatformCredentials } from "../credentials.ts";

export interface SyncChanges {
  content?: string;
  mediaUrls?: string[];
}

export interface SyncResult {
  success: boolean;
  platform: string;
  operation: "update" | "delete";
  unsupported?: boolean;
  message?: string;
  error?: string;
  platformPostId?: string | null;
}

interface PublishedPostRow {
  user_id: string;
  post_id: string;
  platform: string;
  platform_post_id: string | null;
  metadata?: any;
}

// ------------------------------------------------------------
// TELEGRAM — suporte total (texto + legenda de mídia)
// ------------------------------------------------------------
async function telegramToken(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("api_credentials")
    .select("credentials")
    .eq("user_id", userId)
    .eq("platform", "telegram")
    .maybeSingle();

  if (error || !data?.credentials) {
    throw new Error("Telegram Bot Token não encontrado. Configure-o em Configurações.");
  }
  const token = data.credentials.bot_token || data.credentials.botToken;
  if (!token) throw new Error("Telegram Bot Token ausente nas credenciais.");
  return token;
}

async function deleteTelegramPost(supabase: any, row: PublishedPostRow): Promise<SyncResult> {
  const chatId = row.metadata?.chatId;
  const messageId = row.platform_post_id;
  if (!chatId || !messageId) {
    return {
      success: false,
      platform: "telegram",
      operation: "delete",
      error: "chatId/messageId ausentes no registro publicado (metadata).",
    };
  }
  const token = await telegramToken(supabase, row.user_id);
  const response = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: Number(messageId) }),
  });
  const result = await response.json();
  if (!result.ok) {
    return {
      success: false,
      platform: "telegram",
      operation: "delete",
      error: `Telegram API Error: ${result.description}`,
    };
  }
  return {
    success: true,
    platform: "telegram",
    operation: "delete",
    platformPostId: messageId,
    message: "Mensagem apagada do canal.",
  };
}

async function updateTelegramPost(
  supabase: any,
  row: PublishedPostRow,
  changes: SyncChanges
): Promise<SyncResult> {
  const chatId = row.metadata?.chatId;
  const messageId = row.platform_post_id;
  if (!chatId || !messageId) {
    return {
      success: false,
      platform: "telegram",
      operation: "update",
      error: "chatId/messageId ausentes no registro publicado (metadata).",
    };
  }
  if (changes.mediaUrls && changes.mediaUrls.length > 0) {
    return {
      success: false,
      unsupported: true,
      platform: "telegram",
      operation: "update",
      message:
        "A API do Telegram não permite trocar a mídia de uma mensagem publicada. Somente o texto/legenda é editável (use o mesmo campo de texto).",
    };
  }
  if (changes.content === undefined || changes.content === null) {
    return {
      success: false,
      unsupported: true,
      platform: "telegram",
      operation: "update",
      message: "Nenhum conteúdo de texto para editar.",
    };
  }
  const token = await telegramToken(supabase, row.user_id);
  const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: Number(messageId),
      text: changes.content,
    }),
  });
  const result = await response.json();
  if (!result.ok) {
    return {
      success: false,
      platform: "telegram",
      operation: "update",
      error: `Telegram API Error: ${result.description}`,
    };
  }
  return {
    success: true,
    platform: "telegram",
    operation: "update",
    platformPostId: messageId,
    message: "Mensagem editada no canal.",
  };
}

// ------------------------------------------------------------
// FACEBOOK — apagar: DELETE /{post_id}; editar: POST /{post_id}
// (edição suportada pela Graph API apenas para o texto da legenda)
// ------------------------------------------------------------
async function facebookToken(supabase: any, row: PublishedPostRow): Promise<string> {
  const creds = await getPlatformCredentials(
    supabase,
    row.user_id,
    "facebook",
    row.metadata?.targetProfileId || undefined
  );
  if (!creds.isConnected || !creds.accessToken) {
    throw new Error("Facebook não conectado. Conecte sua página em Configurações.");
  }
  return creds.accessToken;
}

async function deleteFacebookPost(supabase: any, row: PublishedPostRow): Promise<SyncResult> {
  const postId = row.platform_post_id;
  if (!postId) {
    return {
      success: false,
      platform: "facebook",
      operation: "delete",
      error: "platform_post_id ausente.",
    };
  }
  try {
    const token = await facebookToken(supabase, row);
    // Graph API: DELETE /{page-id}_{post-id} ou /{post-id}
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(postId)}?access_token=${encodeURIComponent(token)}`,
      { method: "DELETE" }
    );
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        platform: "facebook",
        operation: "delete",
        error: `Facebook API Error: ${result?.error?.message || response.status}`,
      };
    }
    return {
      success: true,
      platform: "facebook",
      operation: "delete",
      platformPostId: postId,
      message: "Post apagado da página.",
    };
  } catch (e: any) {
    return { success: false, platform: "facebook", operation: "delete", error: e.message };
  }
}

async function updateFacebookPost(
  supabase: any,
  row: PublishedPostRow,
  changes: SyncChanges
): Promise<SyncResult> {
  const postId = row.platform_post_id;
  if (!postId) {
    return {
      success: false,
      platform: "facebook",
      operation: "update",
      error: "platform_post_id ausente.",
    };
  }
  if (changes.content === undefined || changes.content === null) {
    return {
      success: false,
      unsupported: true,
      platform: "facebook",
      operation: "update",
      message: "A edição via API do Facebook altera apenas o texto da legenda.",
    };
  }
  try {
    const token = await facebookToken(supabase, row);
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(postId)}?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: changes.content }),
      }
    );
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        platform: "facebook",
        operation: "update",
        error: `Facebook API Error: ${result?.error?.message || response.status}`,
      };
    }
    return {
      success: true,
      platform: "facebook",
      operation: "update",
      platformPostId: postId,
      message: "Legenda do post editada na página.",
    };
  } catch (e: any) {
    return { success: false, platform: "facebook", operation: "update", error: e.message };
  }
}

// ------------------------------------------------------------
// X / TWITTER — apagar: DELETE /2/tweets/{id}; editar: sem API
// ------------------------------------------------------------
async function deleteXPost(supabase: any, row: PublishedPostRow): Promise<SyncResult> {
  const tweetId = row.platform_post_id;
  if (!tweetId) {
    return { success: false, platform: "twitter", operation: "delete", error: "tweetId ausente." };
  }
  try {
    const creds = await getPlatformCredentials(supabase, row.user_id, "twitter");
    if (!creds.isConnected || !creds.accessToken) {
      return {
        success: false,
        platform: "twitter",
        operation: "delete",
        error: "X (Twitter) não conectado. Conecte sua conta em Configurações.",
      };
    }
    const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${creds.accessToken}` },
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return {
        success: false,
        platform: "twitter",
        operation: "delete",
        error: `X API Error: ${errBody?.detail || errBody?.title || response.status}`,
      };
    }
    const data = await response.json();
    if (data.errors) {
      return {
        success: false,
        platform: "twitter",
        operation: "delete",
        error: `X API Error: ${data.errors[0].message}`,
      };
    }
    return {
      success: true,
      platform: "twitter",
      operation: "delete",
      platformPostId: tweetId,
      message: "Tweet apagado.",
    };
  } catch (e: any) {
    return { success: false, platform: "twitter", operation: "delete", error: e.message };
  }
}

function updateXPost(_supabase: any, row: PublishedPostRow): SyncResult {
  return {
    success: false,
    unsupported: true,
    platform: "twitter",
    operation: "update",
    platformPostId: row.platform_post_id,
    message: "O X (Twitter) não oferece API de edição de tweets.",
  };
}

// ------------------------------------------------------------
// LINKEDIN — pending (person_urn ainda não configurado)
// ------------------------------------------------------------
function linkedInNotReady(row: PublishedPostRow, operation: "update" | "delete"): SyncResult {
  return {
    success: false,
    unsupported: true,
    platform: "linkedin",
    operation,
    platformPostId: row.platform_post_id,
    message:
      "A sincronização com o LinkedIn depende da configuração do person_urn (pendente na publicação).",
  };
}

// ------------------------------------------------------------
// YOUTUBE — apagar: DELETE /youtube/v3/videos; editar: pendente
// ------------------------------------------------------------
function youtubeNotReady(row: PublishedPostRow, operation: "update" | "delete"): SyncResult {
  return {
    success: false,
    unsupported: true,
    platform: "youtube",
    operation,
    platformPostId: row.platform_post_id,
    message:
      operation === "update"
        ? "Edição de vídeo via API (videos.update) ainda não implementada."
        : "Exclusão de vídeo (videos.delete) ainda não implementada (upload é stub).",
  };
}

// ------------------------------------------------------------
// Dispatch genérico — plataformas sem suporte retornam honesto
// ------------------------------------------------------------
function unsupported(row: PublishedPostRow, operation: "update" | "delete"): SyncResult {
  return {
    success: false,
    unsupported: true,
    platform: row.platform,
    operation,
    platformPostId: row.platform_post_id,
    message: `A plataforma ${row.platform} não oferece API para ${operation === "delete" ? "excluir" : "editar"} posts publicados.`,
  };
}

export async function deletePlatformPost(
  supabase: any,
  row: PublishedPostRow
): Promise<SyncResult> {
  switch (row.platform) {
    case "telegram":
      return deleteTelegramPost(supabase, row);
    case "facebook":
      return deleteFacebookPost(supabase, row);
    case "twitter":
    case "x":
      return deleteXPost(supabase, row);
    case "linkedin":
      return linkedInNotReady(row, "delete");
    case "youtube":
      return youtubeNotReady(row, "delete");
    default:
      return unsupported(row, "delete");
  }
}

export async function updatePlatformPost(
  supabase: any,
  row: PublishedPostRow,
  changes: SyncChanges
): Promise<SyncResult> {
  switch (row.platform) {
    case "telegram":
      return updateTelegramPost(supabase, row, changes);
    case "facebook":
      return updateFacebookPost(supabase, row, changes);
    case "twitter":
    case "x":
      return updateXPost(supabase, row);
    case "linkedin":
      return linkedInNotReady(row, "update");
    case "youtube":
      return youtubeNotReady(row, "update");
    default:
      return unsupported(row, "update");
  }
}
