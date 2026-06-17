import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get the session or user object
    const authHeader = req.headers.get("Authorization")!;
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      throw new Error("Invalid token or user not found");
    }

    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "É necessário fornecer a URL do arquivo (fileUrl)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user API key for OpenAI
    let { data: aiCreds } = await supabaseClient
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("platform", "ai_config")
      .maybeSingle();

    const aiConfig = aiCreds?.credentials || {};
    const openAIApiKey = aiConfig.api_key || Deno.env.get("OPENAI_API_KEY");

    if (!openAIApiKey || openAIApiKey.includes("sk-or-")) {
      // OpenRouter keys cannot be used for Whisper
      return new Response(
        JSON.stringify({ 
          error: "API Key da OpenAI não encontrada.",
          details: "Para transcrever vídeos e áudios, você precisa configurar uma chave válida da OpenAI (sk-...) em Configurações > APIs > Inteligência Artificial (Campo: API Key Principal)."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Downloading media from URL: ${fileUrl.substring(0, 50)}...`);

    // Download the file from the signed URL
    const mediaResponse = await fetch(fileUrl);
    if (!mediaResponse.ok) {
      throw new Error(`Failed to download media file: ${mediaResponse.statusText}`);
    }

    const mediaBlob = await mediaResponse.blob();
    
    // Check size limit for OpenAI Whisper (25MB)
    if (mediaBlob.size > 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "O arquivo é maior que o limite de 25MB suportado para transcrição." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine filename and extension from Content-Type or default to .mp4
    const contentType = mediaResponse.headers.get("content-type") || "";
    let ext = "mp4";
    if (contentType.includes("audio/mpeg")) ext = "mp3";
    else if (contentType.includes("audio/wav")) ext = "wav";
    else if (contentType.includes("audio/ogg") || contentType.includes("video/ogg")) ext = "ogg";
    else if (contentType.includes("video/webm") || contentType.includes("audio/webm")) ext = "webm";

    const fileName = `media.${ext}`;
    const file = new File([mediaBlob], fileName, { type: contentType || "video/mp4" });

    // Prepare FormData for OpenAI Whisper
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");
    formData.append("language", "pt");

    console.log(`Sending file (${mediaBlob.size} bytes) to OpenAI Whisper API...`);

    const openAIResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`
      },
      body: formData
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API Error:", errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao transcrever a mídia na OpenAI.", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await openAIResponse.json();

    return new Response(JSON.stringify({ text: data.text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in transcribe-media:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
