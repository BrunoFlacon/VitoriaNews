import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processOmnichannelMessage, NormalizedMessage } from "../_shared/bot-engine.ts";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const verifyToken = Deno.env.get("WEBHOOK_VERIFY_TOKEN") || "vitoria_net_omni_secure";

  // ── 1. ROTA GET: Validação do Webhook (Meta Challenge) ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[META-WEBHOOK] Verificação de Webhook bem-sucedida!");
      return new Response(challenge, { status: 200, headers: corsHeaders(req) });
    }
    console.warn(`[META-WEBHOOK] Tentativa de verificação falhou. Modo: ${mode}, challenge length: ${(challenge || "").length}`);
    return new Response("Forbidden", { status: 403, headers: corsHeaders(req) });
  }

  // ── 2. ROTA POST: Recepção Omnichannel de Eventos ──
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const objectType = body?.object; // 'whatsapp_business_account', 'page', 'instagram'
    const entries = body?.entry || [];

    for (const entry of entries) {
      const entryId = entry.id;

      // A: Processamento WhatsApp Business
      if (objectType === "whatsapp_business_account") {
        for (const change of entry?.changes || []) {
          const metadata = change?.value?.metadata || {};
          const phoneNumberId = metadata.phone_number_id;
          if (!phoneNumberId) continue;

          for (const msg of change?.value?.messages || []) {
            if (msg.type === "echo") continue; // Pula mensagens enviadas por nós mesmos

            const contacts = change.value.contacts || [];
            const contact = contacts.find((c: any) => c.wa_id === msg.from);
            
            const normalized: NormalizedMessage = {
              platform: "whatsapp",
              chatId: msg.from,
              recipientId: phoneNumberId,
              text: msg.text?.body || msg.caption || "[Mídia]",
              timestamp: parseInt(msg.timestamp || "0"),
              senderName: contact?.profile?.name || msg.from,
              isGroup: msg.from.includes("@g.us") || msg.from.length > 15,
              isComment: false,
              mediaType: msg.type !== "text" ? msg.type : undefined,
              rawPayload: msg
            };

            await processOmnichannelMessage(supabase, normalized);
          }
        }
      } 
      
      // B: Processamento Facebook Page (Messenger & Comentários)
      else if (objectType === "page") {
        // 1. Verificação de Mensagens do Messenger
        for (const msgEvent of entry?.messaging || []) {
          if (msgEvent.message && !msgEvent.message.is_echo) {
            const senderId = msgEvent.sender?.id;
            const recipientId = msgEvent.recipient?.id;
            const text = msgEvent.message.text || "[Mídia]";

            const normalized: NormalizedMessage = {
              platform: "facebook",
              chatId: senderId,
              recipientId: recipientId || entryId,
              text: text,
              timestamp: Math.floor((msgEvent.timestamp || Date.now()) / 1000),
              senderName: `FB User (${senderId})`,
              isGroup: false,
              isComment: false,
              rawPayload: msgEvent
            };

            await processOmnichannelMessage(supabase, normalized);
          }
        }

        // 2. Verificação de Comentários no Feed da Página
        for (const change of entry?.changes || []) {
          if (change.field === "feed" && change.value?.item === "comment" && change.value?.verb === "add") {
            const val = change.value;
            const normalized: NormalizedMessage = {
              platform: "facebook",
              chatId: val.from?.id,
              recipientId: entryId,
              text: val.message || "",
              timestamp: val.created_time || Math.floor(Date.now() / 1000),
              senderName: val.from?.name || "FB Commenter",
              isGroup: false,
              isComment: true,
              commentId: val.comment_id,
              postId: val.post_id,
              rawPayload: val
            };

            await processOmnichannelMessage(supabase, normalized);
          }
        }
      }

      // C: Processamento Instagram (Direct & Comentários)
      else if (objectType === "instagram") {
        for (const msgEvent of entry?.messaging || []) {
          if (msgEvent.message && !msgEvent.message.is_echo) {
            const senderId = msgEvent.sender?.id;
            const recipientId = msgEvent.recipient?.id;
            const text = msgEvent.message.text || "[Mídia]";

            const normalized: NormalizedMessage = {
              platform: "instagram",
              chatId: senderId,
              recipientId: recipientId || entryId,
              text: text,
              timestamp: Math.floor((msgEvent.timestamp || Date.now()) / 1000),
              senderName: `IG User (${senderId})`,
              isGroup: false,
              isComment: false,
              rawPayload: msgEvent
            };

            await processOmnichannelMessage(supabase, normalized);
          }
        }

        for (const change of entry?.changes || []) {
          if (change.field === "comments" && change.value) {
            const val = change.value;
            const normalized: NormalizedMessage = {
              platform: "instagram",
              chatId: val.from?.id || val.owner_id,
              recipientId: entryId,
              text: val.text || "",
              timestamp: val.created_at || Math.floor(Date.now() / 1000),
              senderName: val.from?.username || "IG Commenter",
              isGroup: false,
              isComment: true,
              commentId: val.id,
              postId: val.media?.id,
              rawPayload: val
            };

            await processOmnichannelMessage(supabase, normalized);
          }
        }
      }
    }

    // Sempre retorna 200 de imediato para a Meta para evitar enfileiramento de retentativas
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[META-WEBHOOK] Erro no processamento do evento:", error);
    // Mesmo em caso de erro interno, retornamos 200 para não travar o Webhook da Meta
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

