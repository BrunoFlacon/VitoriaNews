import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheProfileImage } from "../_shared/media.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

async function syncSingleBot(adminClient: any, userId: string, botToken: string) {
  const results: any[] = [];
  try {
    const token = botToken.trim().replace(/^bot/i, "");
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return { success: false, error: `Telegram API: ${meData.description}` };
    }

    const botInfo = meData.result;
    const botId = botInfo.id.toString();

    let botProfilePicture = "";
    try {
      const photosRes = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${botId}&limit=1`);
      const photosData = await photosRes.json();
      if (photosData.ok && photosData.result?.photos?.length > 0) {
        const profilePhotos = photosData.result.photos[0];
        // Take the last photo in the array (largest size)
        const fileId = profilePhotos[profilePhotos.length - 1].file_id;
        const fileUrl = await getTelegramFileUrl(token, fileId);
        if (fileUrl) {
          // Cache image in our storage
          botProfilePicture = await cacheProfileImage(
            adminClient,
            userId,
            "telegram",
            fileUrl,
            botId
          ) || fileUrl;
        }
      }
    } catch {}

    // NEW: SET WEBHOOK automatically to our Edge Function
    const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook?token=${token}`;
    try {
      const whRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(functionUrl)}`);
      const whData = await whRes.json();
      console.log(`[SYNC] Webhook registration for ${botInfo.username}:`, whData);
    } catch (whErr) {
      console.error(`[SYNC] Webhook registration failed for ${botInfo.username}:`, whErr);
    }

    const botRecord = {
      user_id: userId,
      platform: "telegram",
      chat_id: botId,
      username: botInfo.username || botInfo.first_name || "telegram_bot",
      profile_picture: botProfilePicture,
      followers: 0,
      posts_count: 0,
      updated_at: new Date().toISOString(),
    };

    const { data: existingBot } = await adminClient
      .from("social_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("platform", "telegram")
      .eq("chat_id", botId)
      .maybeSingle();

    if (existingBot?.id) {
      await adminClient.from("social_accounts").update(botRecord).eq("id", existingBot.id);
    } else {
      await adminClient.from("social_accounts").insert(botRecord);
    }

    // NEW: Sync back to social_connections to ensure UI cards update
    await adminClient.from("social_connections")
      .upsert({
        user_id: userId,
        platform: "telegram",
        profile_picture: botProfilePicture,
        profile_image_url: botProfilePicture, // botProfilePicture is already cached at line 71
        username: botInfo.username || botInfo.first_name,
        is_connected: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,platform' });

    results.push({
      type: "bot",
      username: botInfo.username,
      name: botInfo.first_name,
      profile_picture: botProfilePicture,
      status: "synced",
    });

    const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
    const updatesData = await updatesRes.json();
    const chatIds = new Set<string>();
    if (updatesData.ok && Array.isArray(updatesData.result)) {
      for (const update of updatesData.result) {
        const id = update.message?.chat?.id || update.channel_post?.chat?.id || update.my_chat_member?.chat?.id;
        if (id) chatIds.add(id.toString());
      }
    }

    const { data: storedChats } = await adminClient
      .from("social_accounts")
      .select("chat_id")
      .eq("user_id", userId)
      .eq("platform", "telegram")
      .neq("chat_id", botId); 

    if (storedChats) {
      for (const c of storedChats) {
        if (c.chat_id) chatIds.add(c.chat_id.toString());
      }
    }
    
    // NOVO: Garantir que também buscamos os canais mapeados em messaging_channels
    const { data: historicChannels } = await adminClient
      .from("messaging_channels")
      .select("channel_id")
      .eq("user_id", userId)
      .eq("platform", "telegram");

    if (historicChannels) {
      for (const hc of historicChannels) {
        if (hc.channel_id) chatIds.add(hc.channel_id.toString());
      }
    }

    async function getChat(chatId: string) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`);
        const j = await r.json();
        return j.result;
      } catch { return null; }
    }

    async function getMemberCount(chatId: string) {
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${chatId}`);
        const j = await r.json();
        return j.ok ? j.result : 0;
      } catch { return 0; }
    }

    for (const chatId of chatIds) {
      try {
        const chat = await getChat(chatId);
        if (!chat) continue;

        let chatPhoto = "";
        if (chat.photo?.big_file_id) {
          const remoteUrl = await getTelegramFileUrl(token, chat.photo.big_file_id);
          if (remoteUrl) {
            chatPhoto = await cacheProfileImage(
              adminClient,
              userId,
              "telegram",
              remoteUrl,
              chatId
            ) || remoteUrl;
          }
        }

        let followers = 0;
        try {
          const countRes = await fetch(`https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${chatId}`);
          const countJson = await countRes.json();
          if (countJson.ok) followers = countJson.result;
        } catch {}

        const chatRecord = {
          user_id: userId,
          platform: "telegram",
          chat_id: chatId,
          username: chat.username || chat.title || chat.first_name || chatId,
          profile_picture: chatPhoto,
          followers,
          posts_count: 0,
          updated_at: new Date().toISOString(),
        };

        const { data: existingChat } = await adminClient
          .from("social_accounts")
          .select("id")
          .eq("user_id", userId)
          .eq("platform", "telegram")
          .eq("chat_id", chatId)
          .maybeSingle();

        if (existingChat?.id) {
          await adminClient.from("social_accounts").update(chatRecord).eq("id", existingChat.id);
        } else {
          await adminClient.from("social_accounts").insert(chatRecord);
        }

        const msgChannelRecord = {
          user_id: userId,
          platform: "telegram",
          channel_id: chatId.toString(),
          channel_name: chat.title || chat.username || chat.first_name || chatId.toString(),
          channel_type: chat.type === "supergroup" ? "supergroup" : chat.type === "channel" ? "channel" : "group",
          members_count: followers,
          profile_picture: chatPhoto,
          updated_at: new Date().toISOString()
        };

        const { data: existingMsgChannel } = await adminClient
          .from("messaging_channels")
          .select("id")
          .eq("user_id", userId)
          .eq("platform", "telegram")
          .eq("channel_id", chatId.toString())
          .maybeSingle();

        if (existingMsgChannel?.id) {
          await adminClient.from("messaging_channels").update(msgChannelRecord).eq("id", existingMsgChannel.id);
        } else {
          await adminClient.from("messaging_channels").insert(msgChannelRecord);
        }

        results.push({
          type: chat.type || "chat",
          chat_id: chatId,
          username: chat.username || "",
          name: chat.title || "",
          followers,
          status: "synced",
        });
      } catch {}
    }

    return { success: true, bot: { username: botInfo.username }, results };
  } catch (err: any) {
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

    // Support both standard Authorization and X-Authorization bypass header
    const authHeader = 
      req.headers.get("Authorization") || 
      req.headers.get("authorization") ||
      req.headers.get("X-Authorization") ||
      req.headers.get("x-authorization");

    if (!authHeader) {
      console.error("[SYNC] Missing Authorization Header");
      return json({ error: "Missing Authorization header", code: 401 }, 400); // Changed to 400 for debugging
    }

    const authToken = authHeader.replace(/^Bearer\s+/i, "");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Parse the body to get userId from frontend
    let bodyObj: any = {};
    try {
      // Clone req to not consume it fully if we need it later, but we only use it here once
      bodyObj = await req.json();
    } catch (e) {
      console.warn("[SYNC] Could not parse JSON body");
    }

    let userId = bodyObj.userId || bodyObj.user_id;

    // Decode JWT directly to get userId if not in body.
    if (!userId) {
      const jwtPayload = decodeJwt(authToken);
      if (jwtPayload && jwtPayload.sub) {
        userId = jwtPayload.sub;
      }
    }
    
    if (!userId) {
      console.error("[SYNC] Token payload missing 'sub' and body missing userId");
      return json({ error: "Unauthorized", details: "Invalid token payload" }, 402); // Changed to 402 for debugging
    }

    const { data: credData, error: credError } = await adminClient
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", "telegram")
      .maybeSingle();

    if (credError) {
      return json({ error: "Database error fetching credentials", details: credError.message }, 500);
    }

    const creds = credData?.credentials || {};
    let tokens: string[] = [];

    if (typeof creds === "string") {
      tokens = [creds];
    } else if (creds.bot_token) {
      tokens = [creds.bot_token];
    } else if (Array.isArray(creds.tokens)) {
      tokens = creds.tokens;
    } else if (creds.token) {
      tokens = [creds.token];
    }

    if (tokens.length === 0) {
      return json({ success: false, error: "No active Telegram tokens found in your settings." });
    }

    const allResults = [];
    for (const botToken of tokens) {
      const res = await syncSingleBot(adminClient, userId!, botToken);
      allResults.push(res);
    }

    try {
      // --- AGGREGATION LOGIC: Interlinking DB with Telegram Metrics ---
      
      // 1. Sum total members (Groups + Channels)
      const { data: accountsData } = await adminClient
        .from("social_accounts")
        .select("followers")
        .eq("user_id", userId)
        .eq("platform", "telegram");
      
      const totalFollowers = (accountsData || []).reduce((sum: number, acc: any) => sum + (acc.followers || 0), 0);

      // 2. Count ONLY Published Posts from our DB
      const { count: publishedPostsCount } = await adminClient
        .from("scheduled_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "published")
        .contains("platforms", ["telegram"]);

      // 3. Update the main Social Connection card for UI
      await adminClient
        .from("social_connections")
        .update({
          followers_count: totalFollowers,
          posts_count: publishedPostsCount || 0,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("platform", "telegram");

      // 4. Record history for Analytics Charts (unifying with account_metrics)
      // 4. Record history for Analytics Charts (unifying with account_metrics)
      // Prioritize the BOT (positive ID) over groups/channels (negative IDs)
      const { data: telegramAccounts } = await adminClient
        .from("social_accounts")
        .select("id, chat_id")
        .eq("user_id", userId)
        .eq("platform", "telegram");

      const botAcc = telegramAccounts?.find(a => Number(a.chat_id) > 0);
      const firstAcc = telegramAccounts?.[0];
      let targetAccountId = botAcc?.id || firstAcc?.id;

      if (targetAccountId) {
        await adminClient
          .from("social_accounts")
          .update({
            followers: totalFollowers,
            posts_count: publishedPostsCount || 0,
            updated_at: new Date().toISOString()
          })
          .eq("id", targetAccountId);

        await adminClient
          .from("account_metrics")
          .insert({
            user_id: userId,
            social_account_id: targetAccountId,
            platform: "telegram",
            followers: totalFollowers,
            posts_count: publishedPostsCount || 0,
            views: 0,
            collected_at: new Date().toISOString()
          });
        console.log(`[SYNC] History recorded in account_metrics for ${targetAccountId}`);
      }
      
      console.log(`[SYNC] Final Aggregation for ${userId}: ${totalFollowers} followers, ${publishedPostsCount} posts.`);
    } catch (aggErr) {
      console.error("[SYNC] Aggregation Logic Failed, but sync succeeded:", aggErr);
    }

    return json({
      success: true,
      processed: tokens.length,
      data: allResults
    });

  } catch (error: any) {
    return json({ success: false, error: error.message }, 500);
  }
});
