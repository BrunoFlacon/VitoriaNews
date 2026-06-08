import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  try {
    let mediaId, userId;
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      mediaId = url.searchParams.get("mediaId");
      userId = url.searchParams.get("userId");
    } else {
      const body = await req.json();
      mediaId = body.mediaId;
      userId = body.userId;
    }

    if (!mediaId || !/^\d+$/.test(mediaId)) return new Response("Invalid Media ID", { status: 400 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get WhatsApp credentials for the user
    const { data: credData, error: credError } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", "whatsapp")
      .maybeSingle();

    if (credError || !credData) {
      console.error("[WA-PROXY] Credentials error:", credError);
      return new Response("Unauthorized or credentials missing", { status: 401 });
    }

    const accessToken = credData.credentials?.access_token;
    if (!accessToken) return new Response("WhatsApp Access Token missing", { status: 401 });

    // 2. Fetch Media URL from Meta
    console.log(`[WA-PROXY] Fetching URL for MediaID: ${mediaId}`);
    const metaUrlResp = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!metaUrlResp.ok) {
      const err = await metaUrlResp.text();
      console.error("[WA-PROXY] Meta API Error:", err);
      return new Response(`Meta API Error: ${err}`, { status: metaUrlResp.status });
    }

    const { url, mime_type } = await metaUrlResp.json();
    if (!url) return new Response("Media URL not found in Meta response", { status: 404 });

    // 3. Fetch Binary Data
    console.log(`[WA-PROXY] Fetching Binary from: ${url}`);
    const binaryResp = await fetch(url, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!binaryResp.ok) {
      return new Response("Failed to fetch binary data from Meta CDN", { status: binaryResp.status });
    }

    const contentLength = binaryResp.headers.get("content-length");
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return new Response("Media too large", { status: 413 });
    }

    const blob = await binaryResp.blob();
    if (blob.size > MAX_SIZE) {
      return new Response("Media too large", { status: 413 });
    }
    return new Response(blob, {
      headers: {
        ...corsHeaders(req),
        "Content-Type": mime_type || "image/jpeg",
        "Cache-Control": "public, max-age=86400"
      }
    });

  } catch (error: any) {
    console.error("[WA-PROXY] Fatal error:", error.message);
    return new Response(error.message, { status: 500, headers: corsHeaders(req) });
  }
});

