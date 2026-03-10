import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mediaId, mediaUrl } = await req.json();

    if (!mediaId && !mediaUrl) {
      return new Response(JSON.stringify({ error: "mediaId or mediaUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for existing transcription
    if (mediaId) {
      const { data: existing } = await supabase
        .from("transcriptions")
        .select("*")
        .eq("media_id", mediaId)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ transcription: existing }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Log transcription request
    await supabase.from("system_logs").insert({
      service: "transcribe-media",
      level: "info",
      message: `Transcription requested for media ${mediaId || mediaUrl}`,
      metadata: { mediaId, mediaUrl },
    });

    // Queue as a job for async processing
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id;
    }

    if (userId) {
      await supabase.from("job_queue").insert({
        user_id: userId,
        job_type: "transcribe",
        payload: { mediaId, mediaUrl },
        status: "pending",
      });
    }

    return new Response(JSON.stringify({ 
      message: "Transcription queued for processing",
      mediaId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
