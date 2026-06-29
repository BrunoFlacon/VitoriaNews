import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processOmnichannelMessage, NormalizedMessage } from "../_shared/bot-engine.ts";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

async function verifyHmacSignature(rawBody: string, signatureHeader: string | null, secret: string): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  const expectedPrefix = "sha256=";
  if (!signatureHeader.startsWith(expectedPrefix)) return false;
  const providedSig = signatureHeader.slice(expectedPrefix.length);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const computedHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (computedHex.length !== providedSig.length) return false;
  const buf1 = new Uint8Array(encoder.encode(computedHex));
  const buf2 = new Uint8Array(encoder.encode(providedSig));
  let result = 0;
  for (let i = 0; i < buf1.length; i++) result |= buf1[i] ^ buf2[i];
  return result === 0;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const verifyToken = Deno.env.get("WEBHOOK_VERIFY_TOKEN") || "";

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
    const rawBody = await req.text();
    const appSecret = Deno.env.get("META_APP_SECRET") || "";
    const signature = req.headers.get("x-hub-signature-256") || "";
    if (appSecret && !(await verifyHmacSignature(rawBody, signature, appSecret))) {
      console.warn("[META-WEBHOOK] HMAC signature verification failed");
      return new Response("Forbidden", { status: 403, headers: corsHeaders(req) });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = JSON.parse(rawBody);
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
            if (msg.type === "echo") continue;

            const contacts = change.value.contacts || [];
            const contact = contacts.find((c: any) => c.wa_id === msg.from);
            
            let mediaId: string | undefined;
            let mimeType: string | undefined;
            let filename: string | undefined;
            if (msg.type && msg.type !== "text" && msg.type !== "echo" && msg[msg.type]) {
              const mediaPayload = msg[msg.type];
              mediaId = mediaPayload?.id;
              mimeType = mediaPayload?.mime_type;
              filename = mediaPayload?.filename;
            }

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
              mediaId,
              mimeType,
              filename,
              rawPayload: msg,
              waMessageId: msg.id
            };

            if (msg.referral) {
              console.log(`[META-WEBHOOK] Click-to-WhatsApp referral:`, JSON.stringify(msg.referral));
            }

            await processOmnichannelMessage(supabase, normalized);
          }

          // Processar statuses (delivered/read/failed) — Item 1.4
          for (const status of change?.value?.statuses || []) {
            try {
              const waMsgId = status.id;
              const waStatus = status.status; // "sent" | "delivered" | "read" | "failed"
              const recipientPhone = status.recipient_id;
              const timestamp = status.timestamp
                ? new Date(parseInt(status.timestamp) * 1000).toISOString()
                : new Date().toISOString();

              console.log(`[META-WEBHOOK] Status: ${waStatus} for message ${waMsgId} to ${recipientPhone}`);

              // Look up the message by WA message ID in metadata
              const { data: existing } = await supabase
                .from("messages")
                .select("id, metadata")
                .eq("metadata->>wa_message_id", waMsgId)
                .maybeSingle();

              if (existing) {
                const metadata = existing.metadata || {};
                if (waStatus === "delivered") metadata.delivered_at = timestamp;
                else if (waStatus === "read") metadata.read_at = timestamp;
                else if (waStatus === "failed") {
                  metadata.failed_reason = status.errors?.[0]?.title || "unknown";
                  metadata.failed_at = timestamp;
                }

                await supabase
                  .from("messages")
                  .update({
                    status: waStatus === "failed" ? "failed" : "delivered",
                    metadata
                  })
                  .eq("id", existing.id);
              } else {
                console.warn(`[META-WEBHOOK] No message found with wa_message_id=${waMsgId}`);
              }
            } catch (statusErr) {
              console.error("[META-WEBHOOK] Error processing status:", statusErr);
            }
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

