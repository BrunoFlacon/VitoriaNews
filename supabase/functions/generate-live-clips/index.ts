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
    const { liveId } = await req.json();

    if (!liveId) {
      return new Response(JSON.stringify({ error: "liveId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get live session
    const { data: session } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("id", liveId)
      .single();

    if (!session || !session.recording_url) {
      return new Response(JSON.stringify({ error: "Live session not found or no recording" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log clip generation request
    await supabase.from("system_logs").insert({
      user_id: session.user_id,
      service: "generate-live-clips",
      level: "info",
      message: `Clip generation requested for live ${liveId}`,
      metadata: { liveId, recordingUrl: session.recording_url },
    });

    // Queue for async processing
    await supabase.from("job_queue").insert({
      user_id: session.user_id,
      job_type: "clip_live",
      payload: { liveId, recordingUrl: session.recording_url },
      status: "pending",
    });

    return new Response(JSON.stringify({
      message: "Clip generation queued",
      liveId,
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
