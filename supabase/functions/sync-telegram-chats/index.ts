import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
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
        const fileId = photosData.result.photos[0][0].file_id;
        const fileUrl = await getTelegramFileUrl(token, fileId);
        if (fileUrl) {
          // Attempt to cache image as Base64 to bypass browser Timeout/CORS
          try {
            const imgRes = await fetch(fileUrl);
            const blob = await imgRes.blob();
            const buffer = await blob.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            botProfilePicture = `data:image/jpeg;base64,${base64}`;
            console.log("[SYNC] Bot photo cached as Base64");
          } catch (imgErr) {
            console.warn("[SYNC] Photo caching failed, using direct URL:", fileUrl);
            botProfilePicture = fileUrl;
          }
        }
      }
    } catch {}

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
        profile_image_url: botProfilePicture,
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
          chatPhoto = await getTelegramFileUrl(token, chat.photo.big_file_id);
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

        // Add followers to total aggregation if they are uniquely new
        // ... (this keeps original aggregation safe)

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
      return json({ error: "Missing Authorization header", code: 401 }, 401);
    }

    const authToken = authHeader.replace(/^Bearer\s+/i, "");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    let userId: string | undefined;

    // --- AUTH STRATEGY 1: Direct JWT decode (fastest, works without network) ---
    try {
      const parts = authToken.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (decoded?.sub) {
          userId = decoded.sub;
          console.log("[SYNC] Auth via JWT decode:", userId);
        }
      }
    } catch {}

    // --- AUTH STRATEGY 2: Admin validation via Supabase ---
    if (!userId) {
      try {
        const { data: { user } } = await adminClient.auth.getUser(authToken);
        if (user?.id) {
          userId = user.id;
          console.log("[SYNC] Auth via getUser:", userId);
        }
      } catch (err: any) {
        console.warn("[SYNC] getUser failed:", err.message);
      }
    }

    // --- AUTH STRATEGY 3: userId from request body (frontend fallback) ---
    let bodyPayload: any = {};
    try {
      bodyPayload = await req.json();
    } catch {}

    if (!userId && bodyPayload?.userId) {
      console.log("[SYNC] Auth via body userId fallback:", bodyPayload.userId);
      userId = bodyPayload.userId;
    }

    if (!userId) {
      return json({ error: "Unauthorized", details: "No valid user identity found" }, 401);
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
    const { data: mainAccount } = await adminClient
      .from("social_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("platform", "telegram")
      .is("chat_id", null) // The main platform/bot record usually has no specific chatID
      .limit(1)
      .maybeSingle();

    // Fallback: If no null chat_id, take the first one
    let targetAccountId = mainAccount?.id;
    if (!targetAccountId) {
      const { data: firstAcc } = await adminClient
        .from("social_accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("platform", "telegram")
        .limit(1)
        .maybeSingle();
      targetAccountId = firstAcc?.id;
    }

    if (targetAccountId) {
      // 3.5 Update the main Bot account for UI summation
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
    } else {
      console.warn("[SYNC] No social_account found to link metrics history for Telegram aggregation.");
    }

    console.log(`[SYNC] Final Aggregation for ${userId}: ${totalFollowers} followers, ${publishedPostsCount} posts.`);

    return json({
      success: true,
      processed: tokens.length,
      totals: {
        followers: totalFollowers,
        posts: publishedPostsCount
      },
      data: allResults
    });

  } catch (error: any) {
    return json({ success: false, error: error.message }, 500);
  }
});
