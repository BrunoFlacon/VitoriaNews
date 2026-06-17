// deno-lint-ignore-file
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const isSystem = apikeyHeader && (
      apikeyHeader === Deno.env.get("SUPABASE_ANON_KEY") ||
      apikeyHeader === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    if (!user && !isSystem) {
      return new Response(JSON.stringify({ error: "Unauthorized", success: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const effectiveUserId = user?.id || body.userId;
    if (!effectiveUserId) throw new Error("User ID required");

    // Get bot token
    const { data: credsData } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", effectiveUserId)
      .eq("platform", "telegram")
      .maybeSingle();

    const creds = credsData?.credentials as any;
    const botToken = creds?.bot_token || creds?.botToken;
    if (!botToken) throw new Error("Telegram Bot Token not configured");

    // List of chat IDs to probe — can be @username, numeric IDs, or "discover"
    const chatIds: string[] = body.chatIds || [];
    const autoDiscover: boolean = body.autoDiscover !== false;

    // ── Auto-discover via getUpdates (try without advancing offset) ──────────
    const discoveredIds = new Set<string>(chatIds);

    if (autoDiscover) {
      try {
        const updRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100&timeout=0&allowed_updates=["message","channel_post","my_chat_member","chat_member"]`);
        const updData = await updRes.json();
        if (updData.ok) {
          for (const upd of updData.result || []) {
            const chat =
              upd.message?.chat ||
              upd.channel_post?.chat ||
              upd.my_chat_member?.chat ||
              upd.chat_member?.chat;
            if (chat && chat.type !== "private") {
              discoveredIds.add(String(chat.id));
            }
          }
        }
      } catch (_) { /* silent */ }
    }

    // ── Probe each chat ID ───────────────────────────────────────────────────
    const results = [];

    for (const rawId of Array.from(discoveredIds)) {
      const chatId = rawId.trim();
      if (!chatId) continue;

      try {
        // Get chat info
        const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
        const chatData = await chatRes.json();
        if (!chatData.ok) {
          results.push({ chatId, success: false, error: chatData.description });
          continue;
        }

        const chat = chatData.result;

        // Skip private chats
        if (chat.type === "private") {
          results.push({ chatId, success: false, error: "Private chat — skip" });
          continue;
        }

        // Get member count
        const countRes = await fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount?chat_id=${chatId}`);
        const countData = await countRes.json();
        const memberCount = countData.ok ? countData.result : 0;

        // Get chat photo (high quality)
        let chatPhoto = "";
        const photoFileId = chat.photo?.big_file_id || chat.photo?.small_file_id;
        if (photoFileId) {
          try {
            const pRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${photoFileId}`);
            const pData = await pRes.json();
            if (pData.ok) {
              chatPhoto = `https://api.telegram.org/file/bot${botToken}/${pData.result.file_path}`;
            }
          } catch (_) { /* silent */ }
        }

        const chatType = chat.type === "channel" ? "channel" : "group";
        const chatName = chat.title || chat.username || chatId;
        const chatUsername = chat.username ? `@${chat.username}` : null;

        // Upsert into messaging_channels
        const { data: existing } = await supabase
          .from("messaging_channels")
          .select("id")
          .eq("user_id", effectiveUserId)
          .eq("platform", "telegram")
          .eq("channel_id", String(chat.id))
          .maybeSingle();

        const payload: any = {
          user_id: effectiveUserId,
          platform: "telegram",
          channel_name: chatName,
          channel_id: String(chat.id),
          channel_type: chatType,
          members_count: memberCount,
          online_count: Math.round(memberCount * 0.07),
          profile_picture: chatPhoto || null,
        };

        if (existing) {
          await supabase.from("messaging_channels").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("messaging_channels").insert(payload);
        }

        results.push({
          chatId: String(chat.id),
          username: chatUsername,
          name: chatName,
          type: chatType,
          members: memberCount,
          photo: chatPhoto,
          success: true,
          registered: !existing,
        });

      } catch (err: any) {
        results.push({ chatId, success: false, error: err?.message || "Unknown error" });
      }
    }

    // ── Update followers_count on social_connections ─────────────────────────
    const totalMembers = results.filter(r => r.success).reduce((sum, r) => sum + (r.members || 0), 0);

    if (totalMembers > 0) {
      const botRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const botData = await botRes.json();
      if (botData.ok) {
        const botUserId = String(botData.result.id);
        const { data: conn } = await supabase
          .from("social_connections")
          .select("id")
          .eq("user_id", effectiveUserId)
          .eq("platform", "telegram")
          .eq("platform_user_id", botUserId)
          .maybeSingle();

        if (conn) {
          await supabase.from("social_connections")
            .update({ followers_count: totalMembers, updated_at: new Date().toISOString() })
            .eq("id", conn.id);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_members: totalMembers,
      chats_found: results.filter(r => r.success).length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("[discover-telegram-chats] Error:", error?.message);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error", success: false }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
