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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voiceId, articleId, language, cloneVoice } = await req.json();
    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user AI config
    const { data: aiCreds } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("platform", "ai_config")
      .maybeSingle();

    const aiConfig: any = aiCreds?.credentials || {};
    const openrouterKey = aiConfig.openrouter_api_key || Deno.env.get("OPENROUTER_API_KEY");
    const legacyKey = aiConfig.api_key || Deno.env.get("LOVABLE_API_KEY");

    const apiKey = openrouterKey || legacyKey;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key de IA não configurada. Adicione sua chave do OpenRouter em Configurações > APIs." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TTS via OpenRouter (Google Gemini TTS) or fallback to OpenAI-compatible
    const useOpenRouter = !!openrouterKey;
    const ttsModel = aiConfig.tts_model || (useOpenRouter ? "google/gemini-2.5-flash-preview-tts" : "tts-1");
    const voice = voiceId || aiConfig.voice || "alloy";
    const baseUrl = useOpenRouter ? "https://openrouter.ai/api/v1" : (aiConfig.base_url || "https://api.openai.com/v1");

    console.log(`[TTS] model=${ttsModel}, voice=${voice}, openrouter=${useOpenRouter}`);

    const ttsHeaders: any = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (useOpenRouter) {
      ttsHeaders["HTTP-Referer"] = "https://socialhub.vitoria.net";
      ttsHeaders["X-OpenRouter-Title"] = "Social Canvas Hub";
    }

    const ttsBody: any = {
      model: ttsModel,
      input: text.slice(0, 4000),
      voice,
    };
    
    // Explicit support for Google Gemini TTS via OpenRouter
    if (useOpenRouter && ttsModel.includes("google")) {
      ttsBody.voice = voice; // Ensure voice is passed for Gemini
    }

    const ttsResponse = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: ttsHeaders,
      body: JSON.stringify(ttsBody),
    });

    if (!ttsResponse.ok) {
      const err = await ttsResponse.text();
      console.error("[TTS] Error:", err);
      
      // Fallback: try OpenAI-compatible TTS if OpenRouter fails
      if (useOpenRouter && legacyKey) {
        console.log("[TTS] Trying fallback with legacy key...");
        const fallbackResp = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { "Authorization": `Bearer ${legacyKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "tts-1", input: text.slice(0, 4000), voice: "alloy" }),
        });
        if (fallbackResp.ok) {
          const blob = await fallbackResp.blob();
          const fileName = `tts_${user.id}_${Date.now()}.mp3`;
          const { error: uploadError } = await supabase.storage.from("media").upload(fileName, blob, { contentType: "audio/mpeg", upsert: true });
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(fileName);
          if (articleId) await supabase.from("audio_articles").upsert({ article_id: articleId, audio_url: publicUrl, status: "completed", updated_at: new Date().toISOString() });
          return new Response(JSON.stringify({ audioUrl: publicUrl, provider: "fallback" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      
      throw new Error(`Erro na geração de áudio: ${ttsResponse.status} - ${err}`);
    }

    const audioBlob = await ttsResponse.blob();
    const fileName = `tts_${user.id}_${Date.now()}.mp3`;

    const { error: uploadError } = await supabase.storage.from("media").upload(fileName, audioBlob, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(fileName);

    if (articleId) {
      await supabase.from("audio_articles").upsert({
        article_id: articleId,
        audio_url: publicUrl,
        status: "completed",
        updated_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ audioUrl: publicUrl, model: ttsModel, provider: useOpenRouter ? "openrouter" : "legacy" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[TTS] Unhandled error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
