import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
});

function hexEncode(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return hexEncode(sig);
}

async function getClientSecret(supabase): Promise<string | null> {
  const envSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
  if (envSecret) return envSecret;

  const { data } = await supabase
    .from("api_credentials")
    .select("credentials")
    .eq("platform", "linkedin")
    .maybeSingle();

  return data?.credentials?.client_secret || data?.credentials?.clientSecret || null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  // ── GET: Validação do Webhook LinkedIn (HMAC Challenge) ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challengeCode = url.searchParams.get("challengeCode");

    if (!challengeCode) {
      return new Response("Missing challengeCode", { status: 400, headers: corsHeaders(req) });
    }

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const clientSecret = await getClientSecret(supabase);
      if (!clientSecret) {
        console.error("[LINKEDIN-WEBHOOK] LINKEDIN_CLIENT_SECRET não configurado");
        return new Response("Server configuration error", { status: 500, headers: corsHeaders(req) });
      }

      const challengeResponse = await hmacSha256(clientSecret, challengeCode);
      console.log("[LINKEDIN-WEBHOOK] Validação concluída com HMAC");

      return new Response(JSON.stringify({ challengeCode, challengeResponse }), {
        status: 200,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("[LINKEDIN-WEBHOOK] Erro na validação:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }
  }

  // ── POST: Recepção de Eventos LinkedIn ──
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.text();
    let body = JSON.parse(rawBody);

    // Verificar X-LI-Signature
    const liSignature = req.headers.get("X-LI-Signature") || "";
    if (liSignature) {
      const clientSecret = await getClientSecret(supabase);
      if (clientSecret) {
        const expectedSig = "hmacsha256=" + await hmacSha256(clientSecret, rawBody);
        if (liSignature !== expectedSig) {
          console.warn("[LINKEDIN-WEBHOOK] X-LI-Signature inválida — ignorando evento");
          return new Response("Unauthorized", { status: 401, headers: corsHeaders(req) });
        }
        console.log("[LINKEDIN-WEBHOOK] X-LI-Signature verificada com sucesso");
      }
    } else {
      console.log("[LINKEDIN-WEBHOOK] Sem X-LI-Signature — processando mesmo assim");
    }

    const eventType = body.eventType || body.event || "unknown";
    const data = body.data || body;
    const timestamp = body.timestamp || new Date().toISOString();

    console.log(`[LINKEDIN-WEBHOOK] Evento: ${eventType}`);

    try {
      await supabase.from("webhook_events").insert({
        platform: "linkedin",
        event_type: eventType,
        event_timestamp: timestamp,
        raw_payload: body,
        status: "received",
      });
    } catch (logErr: any) {
      console.warn("[LINKEDIN-WEBHOOK] Erro ao salvar webhook_events:", logErr.message);
    }

    switch (eventType) {
      case "message_received":
      case "MESSAGE_RECEIVED": {
        const message = data.message || data;
        const senderUrn = message.fromUrn || message.from;
        const recipientUrn = message.toUrn || message.to;
        const conversationId = message.conversationUrn || message.conversation_id;
        const text = message.body || message.text || "[Mídia]";

        if (senderUrn && conversationId) {
          const { error: processErr } = await supabase.rpc("process_omnichannel_message", {
            p_platform: "linkedin",
            p_chat_id: senderUrn.replace("urn:li:person:", ""),
            p_recipient_id: recipientUrn?.replace("urn:li:person:", "") || "",
            p_text: typeof text === "string" ? text : JSON.stringify(text),
            p_timestamp: Math.floor(new Date(timestamp).getTime() / 1000),
            p_sender_name: senderUrn.replace("urn:li:person:", ""),
            p_is_group: false,
            p_is_comment: false,
            p_raw_payload: data,
          });

          if (processErr) {
            console.warn(`[LINKEDIN-WEBHOOK] Erro ao processar mensagem: ${processErr.message}`);
          }
        }
        break;
      }

      case "conversation_change":
      case "CONVERSATION_CHANGE": {
        const convId = data.conversationUrn || data.conversation_id || data.urn;
        const changeType = data.change_type || data.changeType || "updated";
        console.log(`[LINKEDIN-WEBHOOK] Conversa ${convId} alterada: ${changeType}`);
        break;
      }

      case "share_event":
      case "SHARE_EVENT": {
        const shareId = data.share_id || data.id;
        const shareStatus = data.status || data.share_status;
        console.log(`[LINKEDIN-WEBHOOK] Share ${shareId} status: ${shareStatus}`);
        break;
      }

      default:
        console.log(`[LINKEDIN-WEBHOOK] Evento não tratado: ${eventType}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[LINKEDIN-WEBHOOK] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
