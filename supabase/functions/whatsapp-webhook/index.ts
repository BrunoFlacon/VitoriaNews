// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "whatsapp_verify";

  // ── GET: Webhook verification handshake ──────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // ── POST: Receive incoming messages ──────────────────────────────────────
  try {
    const body = await req.json();
    console.log("[WA-WEBHOOK] Received payload:", JSON.stringify(body, null, 2));

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const entries = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const metadata = change?.value?.metadata ?? {};
        const phoneNumberId = metadata?.phone_number_id;
        
        if (!phoneNumberId) {
          console.log("[WA-WEBHOOK] Skipping change: Missing phone_number_id");
          continue;
        }

        // 1. Identify User by phone_number_id
        const { data: creds, error: credsError } = await supabase
          .from("api_credentials")
          .select("user_id")
          .eq("platform", "whatsapp")
          .filter("credentials->>phone_number_id", "eq", phoneNumberId)
          .maybeSingle();

        if (credsError || !creds) {
          console.warn(`[WA-WEBHOOK] User not found for phone_number_id: ${phoneNumberId}`, credsError);
          continue;
        }

        const userId = creds.user_id;
        const messages = change?.value?.messages ?? [];
        const contacts = change?.value?.contacts ?? [];

        for (const msg of messages) {
          const from = msg.from;
          const contact = contacts.find((c: any) => c.wa_id === from);
          const senderName = contact?.profile?.name ?? null;
          const text = msg?.text?.body ?? msg?.caption ?? "[Mídia]";

          // 2. Insert Message with correct user_id
          const { error: insError } = await supabase.from("messages").insert({
            user_id: userId,
            content: text,
            platform: "whatsapp",
            recipient_phone: from,
            recipient_name: senderName,
            status: "sent",
            sent_at: new Date().toISOString(),
            metadata: { 
              wa_msg_id: msg.id,
              integration_type: "official"
            }
          });

          if (insError) {
            console.error("[WA-WEBHOOK] Failed to insert message:", insError);
          } else {
            console.log(`[WA-WEBHOOK] Message from ${from} logged for user ${userId}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[WA-WEBHOOK] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
