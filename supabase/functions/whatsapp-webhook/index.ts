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

  const verifyToken = Deno.env.get("WEBHOOK_VERIFY_TOKEN") || Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "vitoria_net_omni_secure";

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[WA-WEBHOOK-COMPAT] Verificação bem-sucedida!");
      return new Response(challenge, { status: 200, headers: corsHeaders(req) });
    }
    console.warn(`[WA-WEBHOOK-COMPAT] Tentativa de verificação falhou. Modo: ${mode}, token length: ${(token || "").length}`);
    return new Response("Forbidden", { status: 403, headers: corsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const entries = body?.entry || [];

    for (const entry of entries) {
      for (const change of entry?.changes || []) {
        const metadata = change?.value?.metadata || {};
        const phoneNumberId = metadata.phone_number_id;
        if (!phoneNumberId) continue;

        for (const msg of change?.value?.messages || []) {
          if (msg.type === "echo") continue;

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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[WA-WEBHOOK-COMPAT] Erro no processamento:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

