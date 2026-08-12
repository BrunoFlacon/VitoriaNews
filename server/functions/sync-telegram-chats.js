// Local implementation of sync-telegram-chats.
// Discovers Telegram chats (groups/channels) via the bot and syncs to messaging_channels.
import { json } from "../lib/fnShared.js";

export default async function syncTelegramChats(ctx) {
  const { supabase, user, body } = ctx;
  const userId = body?.userId || user?.id;

  if (!userId) {
    return { status: 200, body: { success: false, error: "User ID is required", data: null } };
  }

  let botToken = body?.token;

  // Fetch bot token from api_credentials if not provided
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
      console.warn("[sync-telegram-chats] Error fetching credentials:", e.message);
    }
  }

  if (!botToken) {
    return {
      status: 200,
      body: { success: false, error: "Telegram Bot Token não encontrado.", data: null },
    };
  }

  try {
    // ── 1. Validate token via getMe ───────────────────────────────
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return { status: 200, body: { success: false, error: `Erro Telegram API: ${meData.description}`, data: null } };
    }

    const botInfo = meData.result;
    const botId = botInfo.id.toString();

    // ── 2. Get updates to discover chats ──────────────────────────
    const updatesRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100&timeout=0`);
    const updatesData = await updatesRes.json();

    const chatIdSet = new Set();
    if (updatesData.ok && updatesData.result?.length > 0) {
      for (const update of updatesData.result) {
        const chat = update.message?.chat || update.channel_post?.chat || update.my_chat_member?.chat;
        if (chat?.id && chat.type !== "private") {
          chatIdSet.add(String(chat.id));
        }
      }
    }

    // Also include channels already in messaging_channels
    try {
      const { data: existingChannels } = await supabase
        .from("messaging_channels")
        .select("channel_id")
        .eq("user_id", userId)
        .eq("platform", "telegram");

      for (const ch of (existingChannels || [])) {
        if (ch.channel_id) chatIdSet.add(ch.channel_id);
      }
    } catch (_) { /* optional */ }

    // ── 3. Sync each chat ─────────────────────────────────────────
    const discoveredChats = [];
    let totalMembers = 0;

    for (const chatId of Array.from(chatIdSet)) {
      try {
        const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
        const chatData = await chatRes.json();
        if (!chatData.ok) continue;
        const chat = chatData.result;

        // Get member count
        let memberCount = 0;
        try {
          const countRes = await fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${chatId}`);
          const countJson = await countRes.json();
          if (countJson.ok) memberCount = countJson.result;
        } catch (_) {}

        totalMembers += memberCount;

        // Get chat photo
        let chatPhoto = "";
        if (chat.photo?.big_file_id) {
          try {
            const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${chat.photo.big_file_id}`);
            const fileData = await fileRes.json();
            if (fileData.ok) {
              chatPhoto = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
            }
          } catch (_) {}
        }

        const chatType = chat.type === "channel" ? "channel"
          : (chat.type === "supergroup" || chat.type === "group") ? "group"
          : "group";
        const chatName = chat.title || chat.username || chat.first_name || chatId;

        discoveredChats.push({
          chatId: String(chat.id),
          username: chat.username ? `@${chat.username}` : null,
          name: chatName,
          type: chatType,
          members: memberCount,
          photo: chatPhoto,
        });

        // Upsert into messaging_channels
        try {
          const channelPayload = {
            user_id: userId,
            platform: "telegram",
            channel_name: chatName,
            channel_id: String(chat.id),
            channel_type: chatType,
            members_count: memberCount,
            profile_picture: chatPhoto || null,
          };

          const { data: existingCh } = await supabase
            .from("messaging_channels")
            .select("id")
            .eq("user_id", userId)
            .eq("platform", "telegram")
            .eq("channel_id", String(chat.id))
            .maybeSingle();

          if (existingCh) {
            await supabase.from("messaging_channels").update(channelPayload).eq("id", existingCh.id);
          } else {
            await supabase.from("messaging_channels").insert(channelPayload);
          }
        } catch (_) {}
      } catch (_) { /* per-chat error */ }
    }

    // ── 4. Update followers_count on social_connections ──────────
    try {
      const { data: existingConn } = await supabase
        .from("social_connections")
        .select("id")
        .eq("user_id", userId)
        .eq("platform", "telegram")
        .eq("platform_user_id", botId)
        .maybeSingle();

      const updateData = {
        followers_count: totalMembers,
        updated_at: new Date().toISOString(),
      };

      if (existingConn) {
        await supabase.from("social_connections").update(updateData).eq("id", existingConn.id);
      }
    } catch (_) {}

    return {
      status: 200,
      body: {
        success: true,
        data: {
          synced: discoveredChats.length > 0,
          chats: discoveredChats,
          count: discoveredChats.length,
          total_members: totalMembers,
        },
      },
    };
  } catch (err) {
    console.error("[sync-telegram-chats] Error:", err.message);
    return {
      status: 200,
      body: { success: false, error: err.message || "Erro desconhecido", data: null },
    };
  }
}
