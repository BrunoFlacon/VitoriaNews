// deno-lint-ignore-file
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    const apikeyHeader = req.headers.get("apikey");
    
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    let user = null;

    if (authHeader) {
      const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data } = await authClient.auth.getUser();
      user = data.user;
    }

    const isSystemAccess = apikeyHeader && (
      apikeyHeader === Deno.env.get('SUPABASE_ANON_KEY') || 
      apikeyHeader === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    if (!user && !isSystemAccess) {
      return new Response(JSON.stringify({ error: "Unauthorized", success: false }), { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const body = await req.json();
    const { platform, token } = body;
    if (platform !== "telegram") throw new Error("Only telegram supported");

    const effectiveUserId = user?.id || body.userId;
    if (!effectiveUserId) throw new Error("User ID is required");

    let botToken = token;
    if (!botToken) {
      const { data: credsData } = await supabase
        .from("api_credentials")
        .select("credentials")
        .eq("user_id", effectiveUserId)
        .eq("platform", "telegram")
        .maybeSingle();
      const creds = credsData?.credentials as any;
      botToken = creds?.bot_token || creds?.botToken;
    }
    if (!botToken) throw new Error("Telegram Bot Token not found");
    
    // ── Helper: Ensure Storage Bucket exists ────────────────────────────────
    async function ensureBucketExists() {
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.find(b => b.id === "media");
        if (!exists) {
          const { error } = await supabase.storage.createBucket("media", { public: true });
          if (error) console.error("Error creating bucket:", error.message);
          else console.log("Bucket 'media' created successfully");
        }
      } catch (e) { console.error("ensureBucketExists failed", e); }
    }
    await ensureBucketExists();
    
    // ── Helper: Download and Upload to Storage ──────────────────────────────
    async function downloadAndUploadImage(url: string, path: string): Promise<string | null> {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        
        const { data, error } = await supabase.storage
          .from("media")
          .upload(path, blob, { contentType: blob.type, upsert: true });
        
        if (error) {
          console.error(`Storage error for ${path}:`, error.message);
          return null;
        }
        
        const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
        return publicUrl;
      } catch (e) {
        console.error(`Download/Upload failed for ${path}:`, e);
        return null;
      }
    }

    // ── 1. Get Bot Info ──────────────────────────────────────────────────────
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) throw new Error(`Telegram API Error: ${meData.description}`);
    const botInfo = meData.result;
    const botUserId = botInfo.id.toString();
    const botUsername = botInfo.username || botInfo.first_name || "telegram_bot";

    // ── 2. Get Bot Profile Photo ─────────────────────────────────────────────
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
          const tempUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
          const permanentUrl = await downloadAndUploadImage(tempUrl, `profiles/telegram_${botUserId}.jpg`);
          profilePicture = permanentUrl || tempUrl;
        }
      }
    } catch (_) { /* silent */ }

    // ── 3. Discover chats via getUpdates ─────────────────────────────────────
    // getUpdates polls for recent activity — works when no webhook is set
    const updatesRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100&timeout=0`);
    const updatesData = await updatesRes.json();

    // Collect unique chat IDs from updates
    const chatIdSet = new Set<string>();
    if (updatesData.ok && updatesData.result?.length > 0) {
      for (const update of updatesData.result) {
        const chat = update.message?.chat || update.channel_post?.chat || update.my_chat_member?.chat;
        if (chat?.id && chat.type !== "private") {
          chatIdSet.add(String(chat.id));
        }
      }
    }

    // ── 4. Also check messaging_channels already saved for this user ─────────
    const { data: existingChannels } = await supabase
      .from("messaging_channels")
      .select("channel_id")
      .eq("user_id", effectiveUserId)
      .eq("platform", "telegram");

    for (const ch of (existingChannels || [])) {
      if (ch.channel_id) chatIdSet.add(ch.channel_id);
    }

    // ── 5. For each chat, get details + member count ─────────────────────────
    let totalMembers = 0;
    const discoveredChats = [];

    for (const chatId of Array.from(chatIdSet)) {
      try {
        const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
        const chatData = await chatRes.json();
        if (!chatData.ok) continue;

        const chat = chatData.result;

        // Get member count
        const countRes = await fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${chatId}`);
        const countData = await countRes.json();
        const memberCount = countData.ok ? countData.result : 0;
        totalMembers += memberCount;

        // Get chat photo
        let chatPhoto = "";
        if (chat.photo?.big_file_id) {
          try {
            const pRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${chat.photo.big_file_id}`);
            const pData = await pRes.json();
            if (pData.ok) {
              const tempUrl = `https://api.telegram.org/file/bot${botToken}/${pData.result.file_path}`;
              const permanentUrl = await downloadAndUploadImage(tempUrl, `channels/telegram_${chatId}.jpg`);
              chatPhoto = permanentUrl || tempUrl;
            }
          } catch (_) { /* silent */ }
        }

        const chatType = chat.type === "channel" ? "channel" : (chat.type === "supergroup" || chat.type === "group") ? "group" : "group";
        const chatName = chat.title || chat.username || chatId;

        discoveredChats.push({
          chatId: String(chat.id),
          username: chat.username ? `@${chat.username}` : null,
          name: chatName,
          type: chatType,
          members: memberCount,
          photo: chatPhoto,
        });

        // Upsert into messaging_channels
        const { data: existingCh } = await supabase
          .from("messaging_channels")
          .select("id")
          .eq("user_id", effectiveUserId)
          .eq("platform", "telegram")
          .eq("channel_id", String(chat.id))
          .maybeSingle();

        const channelPayload: any = {
          user_id: effectiveUserId,
          platform: "telegram",
          channel_name: chatName,
          channel_id: String(chat.id),
          channel_type: chatType,
          members_count: memberCount,
          online_count: Math.round(memberCount * 0.07),
          profile_picture: chatPhoto || null,
        };

        if (existingCh) {
          await supabase.from("messaging_channels").update(channelPayload).eq("id", existingCh.id);
        } else {
          await supabase.from("messaging_channels").insert(channelPayload);
        }
      } catch (_chatErr) { /* silent per chat */ }
    }

    // ── 6. Count messages (posts) sent ───────────────────────────────────────
    const { count: msgCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", effectiveUserId)
      .eq("platform", "telegram")
      .eq("status", "sent");

    // ── 7. Update social_connections ─────────────────────────────────────────
    const { data: existingConn } = await supabase
      .from("social_connections")
      .select("id, metadata")
      .eq("user_id", effectiveUserId)
      .eq("platform", "telegram")
      .eq("platform_user_id", botUserId)
      .maybeSingle();

    const currentMetadata = (existingConn?.metadata as any) || {};

    const connPayload = {
      user_id: effectiveUserId,
      platform: "telegram",
      platform_user_id: botUserId,
      page_name: botUsername,
      profile_image_url: profilePicture,
      profile_picture: profilePicture,
      followers_count: totalMembers,  // Sum of all channel/group members
      is_connected: true,
      updated_at: new Date().toISOString(),
      metadata: {
        ...currentMetadata,
        posts_count: msgCount || 0,
        discovered_chats: discoveredChats,
      }
    };

    if (existingConn) {
      await supabase.from("social_connections").update(connPayload).eq("id", existingConn.id);
    } else {
      await supabase.from("social_connections").insert(connPayload);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        username: botUsername,
        first_name: botInfo.first_name,
        profile_picture: profilePicture,
        total_members: totalMembers,
        discovered_chats: discoveredChats,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[sync-telegram-info] Error:", error?.message || error);
    return new Response(JSON.stringify({ 
      error: error?.message || "Unknown error",
      success: false 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
