import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cacheProfileImage } from "../_shared/media.ts";
import { resolveCorsOrigin } from "../_shared/cors.ts";

declare const Deno: any;

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-authorization, x-supabase-auth, x-client-version, x-my-custom-header",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
  "Permissions-Policy": "browsing-topics=()",
});

function json(data: any, status = 200, req?: Request) {
  const dummyHeaders: Record<string, string> = { get: (name: string) => null } as any;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req || { headers: dummyHeaders } as any), "Content-Type": "application/json" },
  });
}

async function getUserIdFromToken(adminClient: any, token: string): Promise<string | null> {
  try {
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (error || !user) {
      console.warn("[SYNC] getUser failed:", error?.message);
      return null;
    }
    return user.id;
  } catch (err) {
    console.error("[SYNC] getUser Error:", err);
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
            botProfilePicture = `${supabaseUrl}/functions/v1/media-relay?url=${encodeURIComponent(botProfilePicture)}`;
          }
        }
      }
    } catch (e) { console.warn("[SYNC] Could not fetch bot profile pic:", e.message); }

    // Register Webhook
    const functionUrl = `${supabaseUrl}/functions/v1/telegram-webhook?token=${token}`;
    try {
      await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(functionUrl)}`);
    } catch {}

    // Cleanup: remover duplicatas Telegram com platform_user_id diferente (sintético ou de outro bot)
    try {
      const { data: dups } = await adminClient
        .from("social_accounts")
        .select("id, platform_user_id")
        .eq("user_id", userId)
        .eq("platform", "telegram");
      if (dups) {
        for (const d of dups) {
          if (d.platform_user_id === botId) continue;
          if (!d.platform_user_id || !/^\d+$/.test(d.platform_user_id)) {
            await adminClient.from("social_accounts").delete().eq("id", d.id);
          }
        }
      }
    } catch (_) {}

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
              chatPhoto = `${supabaseUrl}/functions/v1/media-relay?url=${encodeURIComponent(chatPhoto)}`;
            }
          }
        }

        let followers = 0;
        try {
          const countRes = await fetch(`https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${chatId}`);
          const countJson = await countRes.json();
          if (countJson.ok) followers = countJson.result;
        } catch {}

        // We no longer create social_accounts records for each channel/chat.
        // Telegram profiles in analytics should be consolidated under the Bot ID.
        // Individual channels are stored in messaging_channels for the inbox.

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

    // Batch UPSERT — fallback para update+insert se onConflict falhar
    if (accountRecords.length > 0) {
      const { error: accErr } = await adminClient
        .from("social_accounts")
        .upsert(accountRecords, { onConflict: "user_id,platform,platform_user_id" });
      if (accErr) {
        console.warn("[SYNC] Upsert falhou (constraint?), tentando update+insert manual:", accErr.message);
        for (const rec of accountRecords) {
          const { data: existing } = await adminClient
            .from("social_accounts")
            .select("id")
            .eq("user_id", rec.user_id)
            .eq("platform", "telegram")
            .eq("platform_user_id", rec.platform_user_id)
            .maybeSingle();
          if (existing) {
            await adminClient.from("social_accounts").update(rec).eq("id", existing.id);
          } else {
            await adminClient.from("social_accounts").insert(rec);
          }
        }
      }
    }

    if (channelRecords.length > 0) {
      const { error: chanErr } = await adminClient
        .from("messaging_channels")
        .upsert(channelRecords, { onConflict: "user_id,platform,channel_id" });
      if (chanErr) {
        console.warn("[SYNC] Channel upsert falhou, tentando update+insert manual:", chanErr.message);
        for (const rec of channelRecords) {
          const { data: existing } = await adminClient
            .from("messaging_channels")
            .select("id")
            .eq("user_id", rec.user_id)
            .eq("platform", "telegram")
            .eq("channel_id", rec.channel_id)
            .maybeSingle();
          if (existing) {
            await adminClient.from("messaging_channels").update(rec).eq("id", existing.id);
          } else {
            await adminClient.from("messaging_channels").insert(rec);
          }
        }
      }
    }

    return { success: true, botId, bot: botInfo.username, accountsSynced: accountRecords.length };
  } catch (err) {
    console.error("[SYNC] syncSingleBot Fatal:", err.message);
    return { success: false, error: err.message };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server configuration missing" }, 500, req);
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("X-Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401, req);

    const authToken = authHeader.replace(/^Bearer\s+/i, "");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Get userId
    let userId: string | null = null;
    try {
      const bodyObj = await req.json();
      userId = bodyObj.userId || bodyObj.user_id;
    } catch {}

    if (!userId) {
      userId = await getUserIdFromToken(adminClient, authToken);
    }
    
    if (!userId) return json({ error: "Unauthorized: Missing UserID" }, 401, req);

    // Fetch credentials
    const { data: credData, error: credError } = await adminClient
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", "telegram");

    if (credError)       return json({ error: "Database error", details: credError.message }, 500, req);

    const tokens: string[] = [];
    for (const row of (credData || [])) {
      const creds = row.credentials || {};
      if (typeof creds === "string") tokens.push(creds);
      else if (creds.bot_token) tokens.push(creds.bot_token);
      else if (Array.isArray(creds.tokens)) tokens.push(...creds.tokens);
      else if (creds.token) tokens.push(creds.token);
    }

    if (tokens.length === 0) return json({ success: false, error: "No Telegram tokens found." }, 200, req);

    const allResults = [];
    const botIds: string[] = [];
    for (const botToken of tokens) {
      const res = await syncSingleBot(adminClient, userId, botToken, supabaseUrl);
      allResults.push(res);
      if (res.success && res.botId) {
        botIds.push(res.botId);
      }
    }

    // Cleanup: remover registros Telegram com platform_user_id sintético (não numérico)
    try {
      const { data: staleTgAccounts } = await adminClient
        .from("social_accounts")
        .select("id, platform_user_id")
        .eq("user_id", userId)
        .eq("platform", "telegram");
      if (staleTgAccounts) {
        for (const sa of staleTgAccounts) {
          if (sa.platform_user_id && !botIds.includes(sa.platform_user_id) && !/^\d+$/.test(sa.platform_user_id)) {
            await adminClient.from("social_accounts").delete().eq("id", sa.id);
          }
        }
      }
    } catch (e) {
      console.warn("[SYNC] Cleanup stale Telegram accounts error:", e.message);
    }

    // Final Aggregation for UI
    try {
      // Soma APENAS os canais (type = 'channel'), NÃO grupos nem o bot
      const { data: tgChannels } = await adminClient
        .from("messaging_channels")
        .select("channel_type, members_count")
        .eq("user_id", userId)
        .eq("platform", "telegram");

      const channelSubscribers = (tgChannels || [])
        .filter(ch => ch.channel_type === "channel")
        .reduce((sum, ch) => sum + (Number(ch.members_count) || 0), 0);

      const mainBotId = botIds[0];

      if (mainBotId) {
        // Atualiza o registro do bot com APENAS seguidores de canais
        // (grupos não entram como "seguidores" — são membros)
        await adminClient
          .from("social_accounts")
          .update({
            followers: channelSubscribers,
            followers_count: channelSubscribers,
          })
          .eq("user_id", userId)
          .eq("platform", "telegram")
          .eq("platform_user_id", mainBotId);

        // Get the account ID for account_metrics insertion
        const { count: postsCount } = await adminClient
          .from("scheduled_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "published")
          .contains("platforms", ["telegram"]);

        // Get the account ID for account_metrics insertion
        const { data: mainAccount } = await adminClient
          .from("social_accounts")
          .select("id")
          .eq("user_id", userId)
          .eq("platform", "telegram")
          .eq("platform_user_id", mainBotId)
          .maybeSingle();

        if (mainAccount) {
          // Insert into account_metrics for Dashboard chart
          await adminClient.from("account_metrics").insert({
            user_id: userId,
            social_account_id: mainAccount.id,
            platform: "telegram",
            followers: channelSubscribers,
            posts_count: postsCount || 0,
            collected_at: new Date().toISOString()
          });
        }

        // Buscar profile_picture do social_accounts para propagar para social_connections
        const { data: tgSocialAccount } = await adminClient
          .from("social_accounts")
          .select("profile_picture")
          .eq("user_id", userId)
          .eq("platform", "telegram")
          .eq("platform_user_id", mainBotId)
          .maybeSingle();

        await adminClient
          .from("social_connections")
          .upsert({
            user_id: userId,
            platform: "telegram",
            platform_user_id: mainBotId,
            profile_image_url: tgSocialAccount?.profile_picture || null,
            profile_picture: tgSocialAccount?.profile_picture || null,
            followers_count: channelSubscribers,
            posts_count: postsCount || 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id,platform,platform_user_id" });
      }
    } catch (aggErr) { console.warn("[SYNC] Aggregation failed:", aggErr.message); }

    return json({ success: true, results: allResults }, 200, req);

  } catch (error: any) {
    console.error("[SYNC] Global Exception:", error.message);
    return json({ success: false, error: error.message }, 500);
  }
});

