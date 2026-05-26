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
  const envSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");
  if (envSecret) return envSecret;
  const { data } = await supabase
    .from("api_credentials")
    .select("credentials")
    .eq("platform", "tiktok")
    .maybeSingle();
  return data?.credentials?.client_secret || data?.credentials?.clientSecret || null;
}

function parseTikTokSignature(header: string): { ts: string; sig: string } | null {
  const parts: Record<string, string> = {};
  for (const pair of header.split(",")) {
    const eq = pair.indexOf("=");
    if (eq > 0) parts[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return parts["t"] && parts["s"] ? { ts: parts["t"], sig: parts["s"] } : null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  // ── GET: Verificação do Webhook TikTok ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge");
    const verifyToken = url.searchParams.get("verify_token");
    const expectedToken = Deno.env.get("TIKTOK_WEBHOOK_TOKEN") || "";

    if (challenge) {
      if (verifyToken && verifyToken === expectedToken) {
        console.log("[TIKTOK-WEBHOOK] Verificação challenge OK");
        return new Response(challenge, { status: 200, headers: corsHeaders(req) });
      }
      return new Response("Forbidden", { status: 403, headers: corsHeaders(req) });
    }
    return new Response("OK", { status: 200, headers: corsHeaders(req) });
  }

  // ── POST: Recepção de Eventos TikTok ──
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // Verificar TikTok-Signature
    const sigHeader = req.headers.get("TikTok-Signature") || "";
    if (sigHeader) {
      const parsed = parseTikTokSignature(sigHeader);
      if (parsed) {
        const clientSecret = await getClientSecret(supabase);
        if (clientSecret) {
          const signedPayload = parsed.ts + "." + rawBody;
          const expectedSig = await hmacSha256(clientSecret, signedPayload);
          if (parsed.sig !== expectedSig) {
            console.warn("[TIKTOK-WEBHOOK] TikTok-Signature inválida — ignorando");
            return new Response("Unauthorized", { status: 401, headers: corsHeaders(req) });
          }
          const nowSec = Math.floor(Date.now() / 1000);
          if (Math.abs(nowSec - parseInt(parsed.ts)) > 300) {
            console.warn("[TIKTOK-WEBHOOK] Timestamp muito antigo — possível replay");
            return new Response("Too old", { status: 400, headers: corsHeaders(req) });
          }
          console.log("[TIKTOK-WEBHOOK] TikTok-Signature verificada");
        }
      }
    }

    const event = body.event;
    const data = body.data || {};
    const timestamp = body.timestamp || new Date().toISOString();

    console.log(`[TIKTOK-WEBHOOK] Evento: ${event}`, JSON.stringify(data).substring(0, 200));

    try {
      await supabase.from("webhook_events").insert({
        platform: "tiktok",
        event_type: event,
        event_timestamp: timestamp,
        raw_payload: body,
        status: "received",
      });
    } catch (logErr: any) {
      console.warn("[TIKTOK-WEBHOOK] Erro webhook_events:", logErr.message);
    }

    switch (event) {
      case "video.status": {
        const videoId = data.video_id || data.id;
        const status = data.status || data.video_status;
        const shareId = data.share_id;
        if (videoId) {
          await supabase.from("post_metrics").upsert({
            external_id: videoId,
            platform: "tiktok",
            status: status === "PUBLISHED" ? "published" : "processing",
            share_id: shareId,
            updated_at: timestamp,
          }, { onConflict: "external_id,platform" });
          console.log(`[TIKTOK-WEBHOOK] Video ${videoId} -> ${status}`);
        }
        break;
      }

      case "video.deletion": {
        const delId = data.video_id || data.id;
        if (delId) {
          await supabase.from("post_metrics").update({
            status: "deleted", updated_at: timestamp,
          }).eq("external_id", delId).eq("platform", "tiktok");
          console.log(`[TIKTOK-WEBHOOK] Video ${delId} deletado`);
        }
        break;
      }

      case "authorization": {
        console.log(`[TIKTOK-WEBHOOK] Autorização: openId=${data.open_id} status=${data.status}`);
        break;
      }

      default:
        console.log(`[TIKTOK-WEBHOOK] Evento não tratado: ${event}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[TIKTOK-WEBHOOK] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
