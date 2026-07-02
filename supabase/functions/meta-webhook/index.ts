import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processOmnichannelMessage, NormalizedMessage } from "../_shared/bot-engine.ts";
import { resolveCorsOrigin } from "../_shared/cors.ts";
import { verifyHmacSignature } from "../_shared/security/verifyMetaSignature.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

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

          // Resolve connection_id for conversations + per-number isolation
          let connectionId: string | null = null;
          let resolvedUserId: string | null = null;
          const { data: waConn } = await supabase
            .from("social_connections")
            .select("id, user_id")
            .eq("platform", "whatsapp")
            .eq("phone_number_id", phoneNumberId)
            .maybeSingle();
          connectionId = waConn?.id || null;
          resolvedUserId = waConn?.user_id || null;

          // Fallback to first admin if connection not found
          if (!resolvedUserId) {
            const { data: admin } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
            resolvedUserId = admin?.id || null;
          }

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

            // Seção 6.4: Upsert whatsapp_conversations
            let convId: string | null = null;
            if (connectionId && resolvedUserId) {
              const contactWaId = msg.from;
              const contactName = contact?.profile?.name || contactWaId;
              const preview = msg.text?.body || (msg.caption) || "[Mídia]";
              
              // Primeiro tenta SELECT p/ ver se já existe
              const { data: existingConv } = await supabase
                .from("whatsapp_conversations")
                .select("id, unread_count")
                .eq("connection_id", connectionId)
                .eq("contact_wa_id", contactWaId)
                .maybeSingle();

              if (existingConv) {
                // Já existe → incrementa unread_count (mensagem do contato)
                convId = existingConv.id;
                await supabase
                  .from("whatsapp_conversations")
                  .update({
                    contact_name: contactName,
                    last_message_preview: preview,
                    last_message_at: new Date().toISOString(),
                    unread_count: existingConv.unread_count + 1,
                  })
                  .eq("id", existingConv.id);
              } else {
                // Não existe → cria com unread_count=1 (primeira mensagem)
                const { data: newConv } = await supabase
                  .from("whatsapp_conversations")
                  .insert({
                    user_id: resolvedUserId,
                    connection_id: connectionId,
                    contact_wa_id: contactWaId,
                    contact_name: contactName,
                    last_message_preview: preview,
                    last_message_at: new Date().toISOString(),
                    unread_count: 1,
                  })
                  .select("id")
                  .maybeSingle();
                convId = newConv?.id || null;
              }
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
              waMessageId: msg.id,
              conversationId: convId || undefined
            };

            if (msg.referral) {
              console.log(`[META-WEBHOOK] Click-to-WhatsApp referral:`, JSON.stringify(msg.referral));
            }

            await processOmnichannelMessage(supabase, normalized);
          }

          // Processar statuses (delivered/read/failed) — Item 1.4 + Seção 6.3
          for (const status of change?.value?.statuses || []) {
            try {
              const waMsgId = status.id;
              const waStatus = status.status; // "sent" | "delivered" | "read" | "failed"
              const timestamp = status.timestamp
                ? new Date(parseInt(status.timestamp) * 1000).toISOString()
                : new Date().toISOString();

              console.log(`[META-WEBHOOK] Status: ${waStatus} for message ${waMsgId}`);

              // Look up the message by WA message ID in metadata
              const { data: existing } = await supabase
                .from("messages")
                .select("id, metadata, conversation_id")
                .eq("metadata->>wa_message_id", waMsgId)
                .maybeSingle();

              if (existing) {
                const metadata = existing.metadata || {};
                const updateData: any = {
                  delivery_status: waStatus === "failed" ? "failed" : "delivered",
                  metadata
                };

                if (waStatus === "delivered") {
                  updateData.delivered_at = timestamp;
                  metadata.delivered_at = timestamp;
                } else if (waStatus === "read") {
                  updateData.read_at = timestamp;
                  metadata.read_at = timestamp;
                  updateData.delivery_status = "read";
                } else if (waStatus === "failed") {
                  metadata.failed_reason = status.errors?.[0]?.title || "unknown";
                  metadata.failed_at = timestamp;
                }

                // Keep old status field for backward compat
                updateData.status = waStatus === "failed" ? "failed" : "delivered";

                await supabase
                  .from("messages")
                  .update(updateData)
                  .eq("id", existing.id);

                // Update conversation last message preview if available
                if (existing.conversation_id) {
                  await supabase
                    .from("whatsapp_conversations")
                    .update({ last_message_at: timestamp })
                    .eq("id", existing.conversation_id);
                }
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

