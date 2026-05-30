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

function getTextFromMsg(msg: any): string {
  if (msg.text?.body) return msg.text.body;
  if (msg.caption) return msg.caption;
  if (msg.type === "location") return `${msg.location?.latitude},${msg.location?.longitude}`;
  if (msg.type === "contacts") return msg.contacts?.map?.(c => c.name?.formatted_name).join(", ") || "[Contato]";
  if (msg.type === "interactive") return msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "[Interativo]";
  if (msg.type === "order") return "[Pedido]";
  if (msg.type === "system") return msg.system?.body || "[Alerta do Sistema]";
  if (msg.type === "request_welcome") return "[Solicitação de Boas-Vindas]";
  return "[Mídia]";
}

function getMediaInfo(msg: any): { mediaId?: string; mediaUrl?: string; mimeType?: string; filename?: string } {
  const mediaTypes = ["image", "video", "audio", "document", "sticker"];
  for (const t of mediaTypes) {
    if (msg[t]) {
      return {
        mediaId: msg[t]?.id,
        mediaUrl: msg[t]?.link,
        mimeType: msg[t]?.mime_type,
        filename: msg[t]?.filename
      };
    }
  }
  return {};
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const verifyToken = Deno.env.get("WEBHOOK_VERIFY_TOKEN") || Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[WA-WEBHOOK-COMPAT] Verification successful!");
      return new Response(challenge, { status: 200, headers: corsHeaders(req) });
    }
    console.warn(`[WA-WEBHOOK-COMPAT] Verification failed. Mode: ${mode}`);
    return new Response("Forbidden", { status: 403, headers: corsHeaders(req) });
  }

  try {
    const rawBody = await req.text();
    const appSecret = Deno.env.get("META_APP_SECRET") || "";
    const signature = req.headers.get("x-hub-signature-256") || "";
    if (appSecret && !(await verifyHmacSignature(rawBody, signature, appSecret))) {
      console.warn("[WA-WEBHOOK-COMPAT] HMAC signature verification failed");
      return new Response("Forbidden", { status: 403, headers: corsHeaders(req) });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = JSON.parse(rawBody);
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
          const mediaInfo = getMediaInfo(msg);

          const text = getTextFromMsg(msg);
          const isGroup = msg.from.includes("@g.us") || msg.from.length > 15;

          let mediaUrl: string | undefined;
          if (mediaInfo.mediaId) {
            mediaUrl = `${supabaseUrl}/functions/v1/whatsapp-media-proxy?mediaId=${mediaInfo.mediaId}&userId=`;
          } else if (mediaInfo.mediaUrl) {
            mediaUrl = mediaInfo.mediaUrl;
          }

          const normalized: NormalizedMessage = {
            platform: "whatsapp",
            chatId: msg.from,
            recipientId: phoneNumberId,
            text,
            timestamp: parseInt(msg.timestamp || "0"),
            senderName: contact?.profile?.name || msg.from,
            isGroup,
            isComment: false,
            mediaType: msg.type !== "text" ? msg.type : undefined,
            mediaUrl,
            rawPayload: {
              ...msg,
              _media_id: mediaInfo.mediaId,
              _mime_type: mediaInfo.mimeType,
              _filename: mediaInfo.filename,
              _location: msg.type === "location" ? { lat: msg.location?.latitude, lng: msg.location?.longitude, name: msg.location?.name } : undefined
            }
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
    console.error("[WA-WEBHOOK-COMPAT] Processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
