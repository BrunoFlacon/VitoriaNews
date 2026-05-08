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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, size = "1024x1024", quality = "standard" } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user AI config
    const { data: aiCreds } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("platform", "ai_config")
      .maybeSingle();

    const aiConfig = aiCreds?.credentials || {};
    const provider = aiConfig.provider || "lovable";
    const apiKey = aiConfig.api_key || Deno.env.get("LOVABLE_API_KEY");
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key de IA não configurada." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = aiConfig.base_url || (provider === "lovable" ? "https://ai.gateway.lovable.dev/v1" : "https://api.openai.com/v1");
    const model = aiConfig.image_model || "dall-e-3";

    console.log(`Generating image with ${provider} using model ${model}`);

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        n: 1,
        size: size,
        quality: quality,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image Provider error:", errorText);
      throw new Error(`Erro na geração de imagem: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("Nenhuma imagem foi gerada.");
    }

    // Download and upload to Supabase Storage to ensure persistence
    const imgRes = await fetch(imageUrl);
    const imgBlob = await imgRes.blob();
    const fileName = `ai_gen_${user.id}_${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, imgBlob, {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("media")
      .getPublicUrl(fileName);

    // Save to media table
    const { data: mediaEntry, error: mediaError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        name: `AI Generated: ${prompt.slice(0, 30)}...`,
        file_url: publicUrl,
        file_type: "image/png",
        file_size: imgBlob.size,
        metadata: { prompt, ai_model: model, provider }
      })
      .select()
      .single();

    if (mediaError) throw mediaError;

    return new Response(JSON.stringify({ 
      imageUrl: publicUrl,
      mediaId: mediaEntry.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-image:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
