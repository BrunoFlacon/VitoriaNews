import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Handle incoming messages
    const body = await req.json();
    console.log("WhatsApp Webhook received:", JSON.stringify(body, null, 2));

    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            for (const msg of change.value.messages) {
              const from = msg.from;
              const text = msg.text?.body || "Mensagem de mídia";
              const timestamp = new Date(msg.timestamp * 1000).toISOString();

              const msgId = msg.id;
              const referral = msg.referral || null;

              await supabase.from("messages").insert({
                content: text,
                recipient_phone: from,
                recipient_name: change.value.contacts?.[0]?.profile?.name || from,
                status: "received",
                platform: "whatsapp",
                created_at: timestamp,
                user_id: Deno.env.get("DEFAULT_USER_ID"),
                metadata: {
                  wa_message_id: msgId,
                  referral,
                  connection_id: null,
                }
              });

              if (referral) {
                console.log(`[WA-WEBHOOK] Click-to-WhatsApp referral: ${JSON.stringify(referral)}`);
              }
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
    console.error("Webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
