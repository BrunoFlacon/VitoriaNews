import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSmartResponse, logInteraction } from "../_shared/bot-engine.ts";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return await response.json();
  } catch (err) {
    console.error("[TG-BOT] Send failed:", err);
    throw err;
  }
}

function getFileId(msg: any): string | null {
  const mediaFields = ["photo", "video", "audio", "document", "sticker", "animation", "voice", "video_note"];
  for (const field of mediaFields) {
    const val = msg[field];
    if (val) {
      if (Array.isArray(val) && val.length > 0) return val[val.length - 1]?.file_id;
      if (val.file_id) return val.file_id;
    }
  }
  return null;
}

function getTelegramContentType(message: any): string {
  if (message.photo) return "image";
  if (message.video) return "video";
  if (message.audio) return "audio";
  if (message.document) return "document";
  if (message.sticker) return "sticker";
  if (message.animation) return "animation";
  if (message.voice) return "voice";
  if (message.video_note) return "video_note";
  if (message.location) return "location";
  if (message.contact) return "contact";
  return "text";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const message = body.message || body.channel_post || body.edited_message;
    if (!message) return new Response("OK", { status: 200 });

    const chatId = message.chat.id.toString();
    const text = message.text || message.caption || "";
    const fromId = message.from?.id.toString();
    const senderName = message.from?.username || message.from?.first_name || "Telegram User";
    const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";

    const url = new URL(req.url);
    const botToken = url.searchParams.get("token");

    if (!botToken) {
      console.warn("[TG-WEBHOOK] Request missing bot token in URL.");
      return new Response("Missing token", { status: 400 });
    }

    const { data: allCreds, error: credsError } = await supabase
      .from("api_credentials")
      .select("user_id, credentials")
      .eq("platform", "telegram")
      .or(`credentials->>bot_token.eq.${botToken},credentials->>token.eq.${botToken},credentials->tokens.cs.{${botToken}}`);

    if (credsError) console.error("[TG-WEBHOOK] Creds Fetch Error:", credsError);

    const creds = allCreds?.[0];

    if (!creds) {
      console.warn(`[TG-WEBHOOK] No user found for bot token.`);
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = creds.user_id;
    const fileId = getFileId(message);
    const contentType = getTelegramContentType(message);

    let mediaUrl: string | null = null;
    if (fileId) {
      mediaUrl = `https://api.telegram.org/file/bot${botToken}/`;
      try {
        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileData = await fileRes.json();
        if (fileData.ok && fileData.result?.file_path) {
          mediaUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        }
      } catch (e) {
        console.warn("[TG-WEBHOOK] Failed to resolve file path:", e);
      }
    }

    const location = message.location ? { lat: message.location.latitude, lng: message.location.longitude } : undefined;
    const contact = message.contact ? { phone: message.contact.phone_number, name: message.contact.first_name } : undefined;

    await logInteraction(supabase, {
      userId, platform: "telegram", chatId,
      content: text,
      status: "received",
      metadata: {
        tg_msg_id: message.message_id,
        sender_name: senderName,
        is_group: isGroup,
        media_type: contentType !== "text" ? contentType : undefined,
        media_url: mediaUrl,
        file_id: fileId,
        location,
        contact,
        filename: message.document?.file_name,
        mime_type: message.document?.mime_type,
        sticker_emoji: message.sticker?.emoji,
        sticker_set: message.sticker?.set_name,
        duration: message.voice?.duration || message.video_note?.duration,
        caption: message.caption
      }
    });

    const result = await getSmartResponse({
      supabaseUrl, supabaseServiceKey, userId,
      platform: "telegram", chatId, message: text, isGroup
    });

    if (result && typeof result === "object" && result.error) {
      await logInteraction(supabase, {
        userId, platform: "telegram", chatId,
        content: `[SISTEMA] Bot silenced: ${result.error}`,
        status: "received",
        isBot: true,
        metadata: { bot_error: result.error, is_system_log: true }
      });
    } else if (result && typeof result === "string") {
      await sendTelegramMessage(botToken, chatId, result);
      await logInteraction(supabase, {
        userId, platform: "telegram", chatId,
        content: result, status: "sent", isBot: true,
        metadata: { is_group: isGroup }
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[TG-WEBHOOK] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
  }
});
