import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
});

function base64Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function hmacSha256Base64(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64Encode(sig);
}

async function getConsumerSecret(supabase): Promise<string | null> {
  const envSecret = Deno.env.get("TWITTER_CONSUMER_SECRET");
  if (envSecret) return envSecret;
  const { data } = await supabase
    .from("api_credentials")
    .select("credentials")
    .eq("platform", "twitter")
    .maybeSingle();
  return data?.credentials?.consumer_secret ||
         data?.credentials?.TWITTER_CONSUMER_SECRET ||
         data?.credentials?.client_secret ||
         null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  // ── GET: CRC (Challenge Response Check) ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const crcToken = url.searchParams.get("crc_token");

    if (!crcToken) {
      return new Response("Missing crc_token", { status: 400, headers: corsHeaders(req) });
    }

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const consumerSecret = await getConsumerSecret(supabase);
      if (!consumerSecret) {
        console.error("[TWITTER-WEBHOOK] TWITTER_CONSUMER_SECRET não configurado");
        return new Response("Server configuration error", { status: 500, headers: corsHeaders(req) });
      }

      const hash = await hmacSha256Base64(consumerSecret, crcToken);
      const responseToken = `sha256=${hash}`;
      console.log("[TWITTER-WEBHOOK] CRC concluído com sucesso");

      return new Response(JSON.stringify({ response_token: responseToken }), {
        status: 200,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("[TWITTER-WEBHOOK] Erro no CRC:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
  }

  // ── POST: Recepção de Eventos ──
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.text();
    let body = JSON.parse(rawBody);

    // Verificar x-twitter-webhooks-signature (plural, conforme docs oficiais)
    const signature = req.headers.get("x-twitter-webhooks-signature") || "";
    if (signature) {
      const consumerSecret = await getConsumerSecret(supabase);
      if (consumerSecret) {
        const expectedHash = await hmacSha256Base64(consumerSecret, rawBody);
        const expectedSig = `sha256=${expectedHash}`;
        if (signature !== expectedSig) {
          console.warn("[TWITTER-WEBHOOK] Assinatura inválida — ignorando evento");
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(req) });
        }
        console.log("[TWITTER-WEBHOOK] Assinatura verificada com sucesso");
      }
    } else {
      console.log("[TWITTER-WEBHOOK] Sem assinatura — processando mesmo assim");
    }

    const eventType = body.type || "unknown";
    const timestamp = body.timestamp || new Date().toISOString();
    console.log(`[TWITTER-WEBHOOK] Evento recebido: ${eventType}`);

    try {
      await supabase.from("webhook_events").insert({
        platform: "twitter",
        event_type: eventType,
        event_timestamp: timestamp,
        raw_payload: body,
        status: "received",
      });
    } catch (logErr: any) {
      console.warn("[TWITTER-WEBHOOK] Erro ao salvar webhook_events:", logErr.message);
    }

    // XAA event types: profile.update.bio, follow.follow, spaces.start, dm.received, chat.received, news.new
    const eventData = body.data || body;
    const userId = eventData.user_id || eventData.actor_id || body.user_id;

    if (eventType.startsWith("profile.update") && userId) {
      console.log(`[TWITTER-WEBHOOK] Perfil atualizado: ${userId} — ${eventType}`);
    } else if (eventType.startsWith("follow")) {
      const targetId = eventData.target_user_id || eventData.target_id;
      console.log(`[TWITTER-WEBHOOK] Follow: ${userId} -> ${targetId} (${eventType})`);
    } else if (eventType.startsWith("dm.") || eventType.startsWith("chat.")) {
      const text = eventData.text || body.text || "";
      const senderId = userId || eventData.sender_id;
      const conversationId = eventData.conversation_id || eventData.dm_conversation_id;
      if (senderId && text) {
        const { error: processErr } = await supabase.rpc("process_omnichannel_message", {
          p_platform: "twitter",
          p_chat_id: senderId,
          p_recipient_id: "",
          p_text: text,
          p_timestamp: Math.floor(new Date(timestamp).getTime() / 1000),
          p_sender_name: senderId,
          p_is_group: false,
          p_is_comment: false,
          p_raw_payload: eventData,
        });
        if (processErr) {
          console.warn(`[TWITTER-WEBHOOK] Erro process_omnichannel_message: ${processErr.message}`);
        }
      }
    } else if (eventType.startsWith("spaces.")) {
      console.log(`[TWITTER-WEBHOOK] Space: ${eventType} — id=${eventData.id || eventData.space_id}`);
    } else if (eventType === "news.new") {
      console.log(`[TWITTER-WEBHOOK] Novas trends/headlines`);
    } else {
      console.log(`[TWITTER-WEBHOOK] Evento não tratado: ${eventType}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[TWITTER-WEBHOOK] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
