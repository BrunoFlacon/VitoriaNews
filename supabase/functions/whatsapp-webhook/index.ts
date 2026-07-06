import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { verifyHmacSignature } from "../_shared/security/verifyMetaSignature.ts";
import { getSmartResponse, sendMetaGraphMessage, logInteraction } from "../_shared/bot-engine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

async function findOrCreateContact(
  supabase: any,
  userId: string,
  phone: string,
  name: string | null
): Promise<string | null> {
  const normalized = normalizePhone(phone);
  
  // Check if contact exists by phone
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .or(`phone.eq.${phone},phone_normalized.eq.${normalized}`)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    // Update name if it changed and we have a real name
    if (name && name !== phone) {
      await supabase
        .from("contacts")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .is("name", null);
    }
    return existing.id;
  }

  // Create new contact
  const { data: newContact } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      phone: phone,
      name: name && name !== phone ? name : null,
    })
    .select("id")
    .maybeSingle();

  return newContact?.id || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verification for Meta Webhook setup
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode && token) {
      if (mode === "subscribe" && token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) {
        console.log("WEBHOOK_VERIFIED");
        return new Response(challenge, { status: 200 });
      } else {
        return new Response(null, { status: 403 });
      }
    }

    // HMAC signature verification
    const rawBody = await req.text();
    const appSecret = Deno.env.get("META_APP_SECRET") || "";
    const signature = req.headers.get("x-hub-signature-256") || "";
    if (appSecret && !(await verifyHmacSignature(rawBody, signature, appSecret))) {
      console.warn("[WA-WEBHOOK] HMAC signature verification failed");
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const body = JSON.parse(rawBody);
    console.log("[WA-WEBHOOK] Received webhook event");

    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const metadata = change?.value?.metadata || {};
          const phoneNumberId = metadata.phone_number_id;

          // Resolve userId from the phone number that received the message
          let resolvedUserId: string | null = null;
          if (phoneNumberId) {
            const { data: connection } = await supabase
              .from("social_connections")
              .select("user_id")
              .eq("platform", "whatsapp")
              .eq("phone_number_id", phoneNumberId)
              .maybeSingle();
            resolvedUserId = connection?.user_id || null;
          }

          if (!resolvedUserId) {
            const { data: adminUser } = await supabase
              .from("profiles")
              .select("id")
              .limit(1)
              .maybeSingle();
            resolvedUserId = adminUser?.id || Deno.env.get("DEFAULT_USER_ID") || null;
          }

          if (!resolvedUserId) {
            console.warn("[WA-WEBHOOK] Could not resolve userId, skipping message");
            continue;
          }

          // Process messages
          for (const msg of change?.value?.messages || []) {
            if (msg.type === "echo") continue;

            const from = msg.from;
            const text = msg.text?.body || msg.caption || "[Mídia]";
            const timestamp = msg.timestamp
              ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
              : new Date().toISOString();

            const msgId = msg.id;
            const referral = msg.referral || null;

            let mediaId: string | undefined;
            let mimeType: string | undefined;
            let filename: string | undefined;
            if (msg.type && msg.type !== "text" && msg.type !== "echo" && msg[msg.type]) {
              const mediaPayload = msg[msg.type];
              mediaId = mediaPayload?.id;
              mimeType = mediaPayload?.mime_type;
              filename = mediaPayload?.filename;
            }

            const contact = change.value.contacts?.find((c: any) => c.wa_id === msg.from);

            // Auto-create contact in contacts table
            let contactId: string | null = null;
            if (resolvedUserId && from) {
              try {
                contactId = await findOrCreateContact(
                  supabase,
                  resolvedUserId,
                  from,
                  contact?.profile?.name || null
                );
              } catch (contactErr) {
                console.error("[WA-WEBHOOK] Error creating contact:", contactErr);
              }
            }

            // Seção 6.4: Upsert whatsapp_conversations
            let convId: string | null = null;
            let resolvedConnId: string | null = null;
            if (phoneNumberId && resolvedUserId) {
              // Resolve connection_id
              const { data: waConn } = await supabase
                .from("social_connections")
                .select("id")
                .eq("platform", "whatsapp")
                .eq("phone_number_id", phoneNumberId)
                .maybeSingle();
              resolvedConnId = waConn?.id || null;

              if (waConn?.id) {
                const contactName = contact?.profile?.name || from;
                const preview = text;

                // Primeiro tenta SELECT p/ ver se já existe
                const { data: existingConv } = await supabase
                  .from("whatsapp_conversations")
                  .select("id, unread_count")
                  .eq("connection_id", waConn.id)
                  .eq("contact_wa_id", from)
                  .maybeSingle();

                if (existingConv) {
                  convId = existingConv.id;
                  await supabase
                    .from("whatsapp_conversations")
                    .update({
                      contact_name: contactName,
                      last_message_preview: preview,
                      last_message_at: new Date().toISOString(),
                      unread_count: existingConv.unread_count + 1,
                      ...(contactId ? { contact_id: contactId } : {}),
                    })
                    .eq("id", existingConv.id);
                } else {
                  const { data: newConv } = await supabase
                    .from("whatsapp_conversations")
                    .insert({
                      user_id: resolvedUserId,
                      connection_id: waConn.id,
                      contact_wa_id: from,
                      contact_name: contactName,
                      last_message_preview: preview,
                      last_message_at: new Date().toISOString(),
                      unread_count: 1,
                      ...(contactId ? { contact_id: contactId } : {}),
                    })
                    .select("id")
                    .maybeSingle();
                  convId = newConv?.id || null;
                }
              }
            }

            // Store incoming message
            await supabase.from("messages").insert({
              content: text,
              recipient_phone: from,
              recipient_name: contact?.profile?.name || from,
              status: "received",
              platform: "whatsapp",
              created_at: timestamp,
              user_id: resolvedUserId,
              media_url: null,
              conversation_id: convId,
              metadata: {
                wa_message_id: msgId,
                ad_referral: referral,
                connection_id: resolvedConnId,
                phone_number_id: phoneNumberId,
                media_id: mediaId,
                mime_type: mimeType,
                filename: filename,
              }
            });

            if (referral) {
              console.log(`[WA-WEBHOOK] Click-to-WhatsApp referral from ${from}`);
            }

            // Bot response — only for non-echo, non-referral messages
            if (!referral) {
              try {
                const reply = await getSmartResponse({
                  supabaseUrl: Deno.env.get("SUPABASE_URL")!,
                  supabaseServiceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                  userId: resolvedUserId,
                  platform: "whatsapp",
                  chatId: from,
                  message: text,
                  isGroup: from.includes("@g.us") || from.length > 15,
                  connectionId: resolvedConnId || undefined
                });

                if (reply && typeof reply === "string") {
                  console.log(`[WA-WEBHOOK] Bot reply: "${reply.slice(0, 50)}..."`);
                  
                  const msgPayload = {
                    platform: "whatsapp" as const,
                    chatId: from,
                    recipientId: phoneNumberId,
                    text: text,
                    timestamp: parseInt(msg.timestamp || "0"),
                    senderName: contact?.profile?.name || from,
                    isGroup: from.includes("@g.us") || from.length > 15,
                    isComment: false,
                    mediaId,
                    mimeType,
                    filename,
                    waMessageId: msgId,
                    conversationId: convId || undefined
                  };

                  let sentWaMessageId: string | undefined;
                  try {
                    const sentResult = await sendMetaGraphMessage(msgPayload, reply, {
                      supabase,
                      connectionId: resolvedConnId || undefined,
                      userId: resolvedUserId
                    });
                    if (sentResult?.messages?.[0]?.id) {
                      sentWaMessageId = sentResult.messages[0].id;
                    }
                  } catch (sendErr) {
                    console.error("[WA-WEBHOOK] Error sending bot reply:", sendErr);
                  }

                  await supabase.from("messages").insert({
                    content: reply,
                    recipient_phone: from,
                    recipient_name: contact?.profile?.name || from,
                    status: "sent",
                    platform: "whatsapp",
                    user_id: resolvedUserId,
                    conversation_id: convId,
                    metadata: {
                      bot_reply: true,
                      wa_message_id: sentWaMessageId,
                      connection_id: resolvedConnId,
                    }
                  });
                } else if (reply && typeof reply === "object" && reply.error) {
                  console.log(`[WA-WEBHOOK] Bot silenced: ${reply.error}`);
                }
              } catch (botErr) {
                console.error("[WA-WEBHOOK] Bot engine error:", botErr);
              }
            }
          }

          // Process statuses (delivered/read/failed)
          for (const status of change?.value?.statuses || []) {
            try {
              const waMsgId = status.id;
              const waStatus = status.status; // "sent" | "delivered" | "read" | "failed"
              const timestamp = status.timestamp
                ? new Date(parseInt(status.timestamp) * 1000).toISOString()
                : new Date().toISOString();

              console.log(`[WA-WEBHOOK] Status: ${waStatus} for message ${waMsgId}`);

              const { data: existing } = await supabase
                .from("messages")
                .select("id, metadata")
                .eq("metadata->>wa_message_id", waMsgId)
                .maybeSingle();

              if (existing) {
                const meta = existing.metadata || {};
                if (waStatus === "delivered") meta.delivered_at = timestamp;
                else if (waStatus === "read") meta.read_at = timestamp;
                else if (waStatus === "failed") {
                  meta.failed_reason = status.errors?.[0]?.title || "unknown";
                  meta.failed_at = timestamp;
                }

                await supabase
                  .from("messages")
                  .update({
                    status: waStatus === "failed" ? "failed" : "delivered",
                    metadata: meta
                  })
                  .eq("id", existing.id);
              } else {
                console.warn(`[WA-WEBHOOK] No message found with wa_message_id=${waMsgId}`);
              }
            } catch (statusErr) {
              console.error("[WA-WEBHOOK] Error processing status:", statusErr);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("[WA-WEBHOOK] Error:", error.message);
    // Always return 200 to prevent Meta from retrying/disable the webhook
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
