import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSmartResponse, logInteraction } from "../_shared/bot-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * 📲 Envio via Telegram Bot API
 */
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Telegram Update Object
    const message = body.message || body.channel_post || body.edited_message;
    if (!message) return new Response("OK", { status: 200 });

    const chatId = message.chat.id.toString();
    const text = message.text || message.caption || "";
    const fromId = message.from?.id.toString();
    const senderName = message.from?.username || message.from?.first_name || "Telegram User";
    const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";

    // 1. Encontrar o usuário através do Bot Token
    // No Telegram, o token é único. Precisamos achar qual credencial tem esse token.
    // Dica: O token está na URL do webhook (prática comum) ou fazemos lookup no banco.
    // Vamos usar a URL do webhook: /telegram-webhook?token=BOT_TOKEN
    const url = new URL(req.url);
    const botToken = url.searchParams.get("token");

    if (!botToken) {
      console.warn("[TG-WEBHOOK] Request missing bot token in URL.");
      return new Response("Missing token", { status: 400 });
    }

    console.log(`[TG-WEBHOOK] Update Received. Bot Token (partial): ${botToken?.substring(0, 5)}...`);

    // Busca resiliente para Telegram
    const { data: allCreds, error: credsError } = await supabase
      .from("api_credentials")
      .select("user_id, credentials")
      .eq("platform", "telegram");

    if (credsError) console.error("[TG-WEBHOOK] Creds Fetch Error:", credsError);

    const creds = allCreds?.find((c: any) => 
      c.credentials?.bot_token === botToken ||
      c.credentials?.token === botToken ||
      c.credentials?.accessToken === botToken
    );

    if (!creds) {
      console.warn(`[TG-WEBHOOK] No user found for token: ${botToken?.substring(0, 5)}... Total TG creds checked: ${allCreds?.length || 0}`);
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = creds.user_id;

    // 2. Log da Mensagem Recebida (Inbox)
    await logInteraction(supabase, {
      userId, platform: "telegram", chatId,
      content: text, status: "received",
      metadata: { tg_msg_id: message.message_id, sender_name: senderName, is_group: isGroup }
    });

    // 3. Processar Resposta (Engine Compartilhada)
    const result = await getSmartResponse({
      supabaseUrl, supabaseServiceKey, userId, 
      platform: "telegram", chatId, message: text, isGroup
    });

    if (result && typeof result === "object" && result.error) {
      await logInteraction(supabase, {
        userId, platform: "telegram", chatId,
        content: `[SISTEMA] Robô silenciado: ${result.error}`,
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

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[TG-WEBHOOK] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
