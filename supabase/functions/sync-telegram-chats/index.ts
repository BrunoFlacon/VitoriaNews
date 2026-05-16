import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheProfileImage } from "../_shared/media.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-authorization, x-supabase-auth, x-client-version, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
  "Permissions-Policy": "browsing-topics=()",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) {
      payload += '=';
    }
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch (err) {
    console.error("[SYNC] decodeJwt Error:", err);
    return null;
  }
}

async function getTelegramFileUrl(botToken: string, fileId: string): Promise<string> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const data = await res.json();
    if (data.ok) {
      return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
    }
  } catch {}
  return "";
}

async function syncSingleBot(adminClient: any, userId: string, botToken: string, supabaseUrl: string) {
  const accountRecords: any[] = [];
  const channelRecords: any[] = [];
  
  try {
    const token = botToken.trim().replace(/^bot/i, "");
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return { success: false, error: `Telegram API: ${meData.description}`, bot: "Unknown" };
    }

    const botInfo = meData.result;
    const botId = botInfo.id.toString();

    let botProfilePicture = "";
    try {
      const photosRes = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${botId}&limit=1`);
      const photosData = await photosRes.json();
      if (photosData.ok && photosData.result?.photos?.length > 0) {
        const profilePhotos = photosData.result.photos[0];
        const fileId = profilePhotos[profilePhotos.length - 1].file_id;
        const fileUrl = await getTelegramFileUrl(token, fileId);
        if (fileUrl) {
          botProfilePicture = await cacheProfileImage(adminClient, userId, "telegram", fileUrl, botId) || fileUrl;
          
          // Se ainda for uma URL do telegram, aplica o proxy para evitar bloqueios do navegador
          if (botProfilePicture.includes('api.telegram.org')) {
            botProfilePicture = `${supabaseUrl}/functions/v1/proxy-media?url=${encodeURIComponent(botProfilePicture)}`;
          }
        }
      }
    } catch (e) { console.warn("[SYNC] Could not fetch bot profile pic:", e.message); }

    // Register Webhook
    const functionUrl = `${supabaseUrl}/functions/v1/telegram-webhook?token=${token}`;
    try {
      await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(functionUrl)}`);
    } catch {}

    // Add Bot account to records
    accountRecords.push({
      user_id: userId,
      platform: "telegram",
      platform_user_id: botId,
      chat_id: botId,
      username: botInfo.username || botInfo.first_name || "telegram_bot",
      profile_picture: botProfilePicture,
      followers: 0,
      posts_count: 0,
      views: 0,
      likes: 0,
      shares: 0,
      comments: 0,
      engagement_rate: 0,
      is_connected: true,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Find groups/channels
    const chatIds = new Set<string>();
    
    const { data: storedChats } = await adminClient
      .from("social_accounts")
      .select("chat_id")
      .eq("user_id", userId)
      .eq("platform", "telegram")
      .neq("chat_id", botId); 

    if (storedChats) storedChats.forEach(c => c.chat_id && chatIds.add(c.chat_id.toString()));
    
    const { data: historicChannels } = await adminClient
      .from("messaging_channels")
      .select("channel_id")
      .eq("user_id", userId)
      .eq("platform", "telegram");

    if (historicChannels) historicChannels.forEach(hc => hc.channel_id && chatIds.add(hc.channel_id.toString()));

    // Sync each chat
    for (const chatId of chatIds) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`);
        const j = await r.json();
        const chat = j.result;
        if (!chat) continue;

        let chatPhoto = "";
        if (chat.photo?.big_file_id) {
          const remoteUrl = await getTelegramFileUrl(token, chat.photo.big_file_id);
          if (remoteUrl) {
            // Tenta salvar no Storage para persistência eterna
            chatPhoto = await cacheProfileImage(adminClient, userId, "telegram", remoteUrl, chatId.toString()) || remoteUrl;
            
            // Se ainda for uma URL do telegram, aplica o proxy para evitar bloqueios do navegador
            if (chatPhoto.includes('api.telegram.org')) {
              chatPhoto = `${supabaseUrl}/functions/v1/proxy-media?url=${encodeURIComponent(chatPhoto)}`;
            }
          }
        }

        let followers = 0;
        try {
          const countRes = await fetch(`https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${chatId}`);
          const countJson = await countRes.json();
          if (countJson.ok) followers = countJson.result;
        } catch {}

        accountRecords.push({
          user_id: userId,
          platform: "telegram",
          platform_user_id: chatId.toString(),
          chat_id: chatId,
          username: chat.username || chat.title || chat.first_name || chatId,
          profile_picture: chatPhoto,
          followers,
          posts_count: 0,
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0,
          engagement_rate: 0,
          is_connected: true,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        channelRecords.push({
          user_id: userId,
          platform: "telegram",
          channel_id: chatId.toString(),
          channel_name: chat.title || chat.username || chat.first_name || chatId.toString(),
          channel_type: chat.type === "supergroup" ? "supergroup" : chat.type === "channel" ? "channel" : "group",
          members_count: followers,
          profile_picture: chatPhoto,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn(`[SYNC] Failed to sync chat ${chatId}:`, e.message);
      }
    }

    // Batch UPSERT
    if (accountRecords.length > 0) {
      const { error: accErr } = await adminClient
        .from("social_accounts")
        .upsert(accountRecords, { onConflict: "user_id,platform,platform_user_id" });
      if (accErr) console.error("[SYNC] Batch Social Accounts Error:", accErr.message);
    }

    if (channelRecords.length > 0) {
      const { error: chanErr } = await adminClient
        .from("messaging_channels")
        .upsert(channelRecords, { onConflict: "user_id,platform,channel_id" });
      if (chanErr) console.error("[SYNC] Batch Messaging Channels Error:", chanErr.message);
    }

    return { success: true, botId, bot: botInfo.username, accountsSynced: accountRecords.length };
  } catch (err) {
    console.error("[SYNC] syncSingleBot Fatal:", err.message);
    return { success: false, error: err.message };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server configuration missing" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("X-Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const authToken = authHeader.replace(/^Bearer\s+/i, "");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Get userId
    let userId: string | null = null;
    try {
      const bodyObj = await req.json();
      userId = bodyObj.userId || bodyObj.user_id;
    } catch {}

    if (!userId) {
      const jwtPayload = decodeJwt(authToken);
      userId = jwtPayload?.sub || null;
    }
    
    if (!userId) return json({ error: "Unauthorized: Missing UserID" }, 401);

    // Fetch credentials
    const { data: credData, error: credError } = await adminClient
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", "telegram")
      .maybeSingle();

    if (credError) return json({ error: "Database error", details: credError.message }, 500);

    const creds = credData?.credentials || {};
    let tokens: string[] = [];
    if (typeof creds === "string") tokens = [creds];
    else if (creds.bot_token) tokens = [creds.bot_token];
    else if (Array.isArray(creds.tokens)) tokens = creds.tokens;
    else if (creds.token) tokens = [creds.token];

    if (tokens.length === 0) return json({ success: false, error: "No Telegram tokens found." });

    const allResults = [];
    const botIds: string[] = [];
    for (const botToken of tokens) {
      const res = await syncSingleBot(adminClient, userId, botToken, supabaseUrl);
      allResults.push(res);
      if (res.success && res.botId) {
        botIds.push(res.botId);
      }
    }

    // Final Aggregation for UI
    try {
      const { data: accountsData } = await adminClient
        .from("social_accounts")
        .select("followers, platform_user_id, chat_id")
        .eq("user_id", userId)
        .eq("platform", "telegram");
      
      const totalFollowers = (accountsData || []).reduce((sum, acc) => sum + (Number(acc.followers) || 0), 0);
      const mainBotId = botIds[0];

      // UPDATE THE BOT RECORD with total followers (sum of groups/channels)
      // This ensures the main dashboard shows the consolidated number for the bot
      if (totalFollowers > 0 && mainBotId) {
        await adminClient
          .from("social_accounts")
          .update({ followers: totalFollowers, followers_count: totalFollowers })
          .eq("user_id", userId)
          .eq("platform", "telegram")
          .eq("platform_user_id", mainBotId);

        const { count: postsCount } = await adminClient
          .from("scheduled_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "published")
          .contains("platforms", ["telegram"]);

        await adminClient
          .from("social_connections")
          .upsert({
            user_id: userId,
            platform: "telegram",
            platform_user_id: mainBotId,
            followers_count: totalFollowers,
            posts_count: postsCount || 0,
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id,platform,platform_user_id" });
      }
    } catch (aggErr) { console.warn("[SYNC] Aggregation failed:", aggErr.message); }

    return json({ success: true, results: allResults });

  } catch (error: any) {
    console.error("[SYNC] Global Exception:", error.message);
    return json({ success: false, error: error.message }, 500);
  }
});
