import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSmartResponse, logInteraction } from "../_shared/bot-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * 📲 Envio via Meta Graph API
 */
async function sendWAMessage(phoneNumberId: string, accessToken: string, to: string, text: string) {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
    });
    return await response.json();
  } catch (err) {
    console.error("[WA-BOT] Send failed:", err);
    throw err;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "whatsapp_verify";

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === verifyToken) {
      return new Response(url.searchParams.get("hub.challenge"), { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const entries = body?.entry ?? [];

    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const metadata = change?.value?.metadata ?? {};
        const phoneNumberId = metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        console.log(`[WA-WEBHOOK] Entry Received. Meta PhoneID: ${phoneNumberId}`);
        
        // Busca resiliente: Tenta encontrar o usuário pelo campo JSONB credentials
        const { data: allCreds, error: credsError } = await supabase
          .from("api_credentials")
          .select("user_id, credentials")
          .eq("platform", "whatsapp");

        if (credsError) console.error("[WA-WEBHOOK] Creds Fetch Error:", credsError);

        const creds = allCreds?.find((c: any) => 
          c.credentials?.phone_number_id?.toString() === phoneNumberId.toString() ||
          c.credentials?.phone_id?.toString() === phoneNumberId.toString() ||
          c.credentials?.phone_number?.toString() === phoneNumberId.toString()
        );

        if (!creds) {
          console.warn(`[WA-WEBHOOK] No user found for PhoneID: ${phoneNumberId}. Total WA creds checked: ${allCreds?.length || 0}`);
          continue;
        }
        const userId = creds.user_id;
        const accessToken = creds.credentials?.access_token;
        const messages = change?.value?.messages ?? [];
        const contacts = change?.value?.contacts ?? [];

        for (const msg of messages) {
          const from = msg.from;
          const isEcho = msg.type === 'echo' || msg.context?.from === phoneNumberId;
          const isBotEcho = isEcho && (msg.metadata?.biz_opaque_callback_data === "bot_response" || msg.biz_opaque_callback_data === "bot_response");
          
          const contact = contacts.find((c: any) => c.wa_id === from);
          const senderName = contact?.profile?.name ?? null;
          const text = msg?.text?.body ?? msg?.caption ?? "[Mídia]";
          const isGroup = from.includes('@g.us') || from.length > 15;
          const timestamp = parseInt(msg.timestamp || "0");
          const ageInSeconds = Math.floor(Date.now() / 1000) - timestamp;

          // Trava de segurança: Ignorar mensagens com mais de 5 minutos (Alinhado com Original)
          if (timestamp > 0 && ageInSeconds > 300) {
            console.log(`[WA-WEBHOOK] Ignoring old message (${ageInSeconds}s old).`);
            continue;
          }

          // Se for um echo humano (você mandou pelo celular), logamos SEM isBot para ativar o silêncio inteligente
          if (isEcho && !isBotEcho) {
            console.log(`[WA-WEBHOOK] Human Echo detected from ${from}. Marking for silencer.`);
            await logInteraction(supabase, {
              userId, platform: "whatsapp", chatId: from,
              content: text, status: "sent", isBot: false,
              metadata: { wa_msg_id: msg.id, sender_name: "Você (Celular)", is_echo: true, is_human: true }
            });
            continue; // Já processado como intervenção humana
          }

          if (isEcho) continue; // Pula ecos do próprio robô

          // Log da Mensagem Recebida (Inbox)
          await logInteraction(supabase, {
            userId, platform: "whatsapp", chatId: from,
            content: text, status: "received",
            metadata: { wa_msg_id: msg.id, sender_name: senderName, is_echo: false, is_group: isGroup }
          });

          // Processar Resposta do Robô (Engine Compartilhada)
          const result = await getSmartResponse({
            supabaseUrl, supabaseServiceKey, userId, 
            platform: "whatsapp", chatId: from, message: text, isGroup
          });

          if (result && typeof result === "object" && result.error) {
            // Log do motivo de não responder
            await logInteraction(supabase, {
              userId, platform: "whatsapp", chatId: from,
              content: `[SISTEMA] Robô silenciado: ${result.error}`,
              status: "received",
              isBot: true,
              metadata: { bot_error: result.error, is_system_log: true }
            });
          } else if (result && typeof result === "string" && accessToken) {
            await sendWAMessage(phoneNumberId, accessToken, from, result);
            await logInteraction(supabase, {
              userId, platform: "whatsapp", chatId: from,
              content: result, status: "sent", isBot: true,
              metadata: { is_group: isGroup }
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
