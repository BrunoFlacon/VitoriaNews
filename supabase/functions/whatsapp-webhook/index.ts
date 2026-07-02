import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { verifyHmacSignature } from "../_shared/security/verifyMetaSignature.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

            await supabase.from("messages").insert({
              content: text,
              recipient_phone: from,
              recipient_name: contact?.profile?.name || from,
              status: "received",
              platform: "whatsapp",
              created_at: timestamp,
              user_id: resolvedUserId,
              media_url: null,
              metadata: {
                wa_message_id: msgId,
                referral,
                connection_id: null,
                phone_number_id: phoneNumberId,
                media_id: mediaId,
                mime_type: mimeType,
                filename: filename,
              }
            });

            if (referral) {
              console.log(`[WA-WEBHOOK] Click-to-WhatsApp referral from ${from}`);
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
