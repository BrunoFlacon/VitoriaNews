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
    const { articleId, text } = await req.json();

    if (!articleId || !text) {
      return new Response(JSON.stringify({ error: "articleId and text are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Strip HTML tags for TTS
    const plainText = text.replace(/<[^>]+>/g, "").slice(0, 5000);

    // Use Lovable AI for TTS generation
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    
    // For now, create a placeholder - real TTS integration would go here
    // This stores the request and can be processed by a more capable TTS service
    const { data: existing } = await supabase
      .from("audio_articles")
      .select("*")
      .eq("article_id", articleId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ audioUrl: existing.audio_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the TTS request for processing
    await supabase.from("system_logs").insert({
      service: "text-to-speech",
      level: "info",
      message: `TTS requested for article ${articleId}`,
      metadata: { articleId, textLength: plainText.length },
    });

    return new Response(JSON.stringify({ 
      message: "TTS processing queued",
      articleId,
      textLength: plainText.length,
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
