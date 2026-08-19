import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, title, mediaType, aspectRatio, base64Image } = await req.json();

    if (!base64Image) {
      return new Response(JSON.stringify({ error: "base64Image é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert Base64 data URL to Binary ArrayBuffer
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `covers/${Date.now()}_${projectId || "cover"}.png`;

    // Upload to media-covers bucket
    const { error: uploadError } = await supabase.storage
      .from("media-covers")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[COVER-PROCESS] Storage error:", uploadError.message);
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pubUrl } = supabase.storage.from("media-covers").getPublicUrl(fileName);
    const publicUrl = pubUrl.publicUrl;

    console.log(`[COVER-PROCESS] Cover uploaded successfully: ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        coverUrl: publicUrl,
        aspectRatio,
        mediaType,
        title,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
