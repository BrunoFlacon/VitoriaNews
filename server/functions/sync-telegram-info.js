// Local implementation of sync-telegram-info.
// Validates the bot token via Telegram API and returns bot info.
import { json } from "../lib/fnShared.js";

export default async function syncTelegramInfo(ctx) {
  const { supabase, user, body } = ctx;
  const userId = body?.userId || user?.id;

  if (!userId) {
    return { status: 200, body: { success: false, error: "User ID is required", data: null } };
  }

  let botToken = body?.token;

  // If no token provided, fetch from api_credentials
  if (!botToken) {
    try {
      const { data: credsRow } = await supabase
        .from("api_credentials")
        .select("credentials")
        .eq("user_id", userId)
        .eq("platform", "telegram")
        .maybeSingle();

      const creds = credsRow?.credentials || {};
      botToken = creds.bot_token || creds.botToken || creds.token;
      if (Array.isArray(creds.tokens) && creds.tokens.length > 0) {
        botToken = botToken || creds.tokens[0];
      }
    } catch (e) {
      console.warn("[sync-telegram-info] Error fetching credentials:", e.message);
    }
  }

  if (!botToken) {
    return {
      status: 200,
      body: { success: false, error: "Telegram Bot Token não encontrado. Adicione o token nas Configurações de API.", data: null },
    };
  }

  try {
    // ── 1. Get Bot Info via getMe ─────────────────────────────────
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meRes.json();

    if (!meData.ok) {
      return {
        status: 200,
        body: { success: false, error: `Erro Telegram API: ${meData.description || "Token inválido"}`, data: null },
      };
    }

    const botInfo = meData.result;
    const botUserId = botInfo.id.toString();
    const botUsername = botInfo.username || botInfo.first_name || "telegram_bot";

    // ── 2. Get Bot Profile Photo ──────────────────────────────────
    let profilePicture = "";
    try {
      const photosRes = await fetch(`https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${botInfo.id}&limit=1`);
      const photosData = await photosRes.json();
      if (photosData.ok && photosData.result?.photos?.length > 0) {
        const pArray = photosData.result.photos[0];
        const fileId = pArray[pArray.length - 1].file_id;
        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileData = await fileRes.json();
        if (fileData.ok) {
          profilePicture = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        }
      }
    } catch (_) { /* photo fetch is optional */ }

    // ── 3. Upsert into social_connections ─────────────────────────
    try {
      const { data: existingConn } = await supabase
        .from("social_connections")
        .select("id")
        .eq("user_id", userId)
        .eq("platform", "telegram")
        .eq("platform_user_id", botUserId)
        .maybeSingle();

      const connPayload = {
        user_id: userId,
        platform: "telegram",
        platform_user_id: botUserId,
        page_name: botUsername,
        profile_image_url: profilePicture || null,
        profile_picture: profilePicture || null,
        is_connected: true,
        updated_at: new Date().toISOString(),
      };

      if (existingConn) {
        await supabase.from("social_connections").update(connPayload).eq("id", existingConn.id);
      } else {
        await supabase.from("social_connections").insert(connPayload);
      }
    } catch (dbErr) {
      console.warn("[sync-telegram-info] DB upsert error:", dbErr.message);
    }

    return {
      status: 200,
      body: {
        success: true,
        data: {
          username: botUsername,
          first_name: botInfo.first_name || "",
          profile_picture: profilePicture,
          id: botUserId,
        },
      },
    };
  } catch (err) {
    console.error("[sync-telegram-info] Error:", err.message);
    return {
      status: 200,
      body: { success: false, error: err.message || "Erro desconhecido", data: null },
    };
  }
}
