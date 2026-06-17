import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Error parsing request JSON:", e);
      return new Response(
        JSON.stringify({ error: "Corpo da requisição inválido (JSON malformado)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { topic, inputText, mode = "post", platforms, tone, language = "pt-BR", attentionTechniques = true, mediaUrls = [] } = body;

    const contentSource = topic || inputText;
    if (!contentSource && mode !== "hashtags") {
      return new Response(
        JSON.stringify({ error: "É necessário fornecer um tema (topic) ou um texto base (inputText)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user-specific AI configuration
    console.log(`Fetching AI config for user ${user.id}...`);
    
    // Fallback search: try api_credentials first, then bot_settings
    let { data: aiCreds, error: aiCredsError } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", user.id)
      .eq("platform", "ai_config")
      .maybeSingle();

    let aiConfig = aiCreds?.credentials || {};

    // FALLBACK: If no global config, check bot_settings (RobotBuilder)
    if (!aiConfig.api_key && !aiConfig.openrouter_api_key) {
      console.log("No global AI config found, searching in bot_settings...");
      const { data: botSettings, error: botError } = await supabase
        .from("bot_settings")
        .select("openrouter_api_key, openrouter_model")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (botSettings?.openrouter_api_key) {
        console.log("Found API key in bot_settings fallback!");
        aiConfig = {
          provider: "openrouter",
          api_key: botSettings.openrouter_api_key,
          openrouter_api_key: botSettings.openrouter_api_key,
          openrouter_model: botSettings.openrouter_model,
          text_model: botSettings.openrouter_model
        };
      }
    }

    if (aiCredsError) {
      console.error("Error fetching AI credentials:", aiCredsError);
    }

    // Determine Provider and Key
    const isOpenrouterProvider = aiConfig.provider === "openrouter" || aiConfig.base_url?.includes("openrouter");
    const openrouterKey = aiConfig.openrouter_api_key 
      || (isOpenrouterProvider ? aiConfig.api_key : null)
      || Deno.env.get("OPENROUTER_API_KEY");
    
    const provider = aiConfig.provider || (openrouterKey ? "openrouter" : "lovable");
    const apiKey = aiConfig.api_key || openrouterKey || Deno.env.get("LOVABLE_API_KEY");
    const model = body.model || aiConfig.openrouter_model || aiConfig.text_model || (provider === "openrouter" ? "google/gemini-2.0-flash-001" : "gpt-4o-mini");
    const baseUrl = aiConfig.base_url || (provider === "openrouter" ? "https://openrouter.ai/api/v1" : "https://ai.gateway.lovable.dev/v1");

    console.log(`Using AI Provider: ${provider}, Model: ${model}, BaseUrl: ${baseUrl}, Mode: ${mode}`);
    if (apiKey) console.log(`API Key detected (masked): ${apiKey.substring(0, 6)}...`);

    if (!apiKey) {
      console.error("No API key found for AI generation.");
      return new Response(
        JSON.stringify({ 
          error: "Configuração de IA pendente. Por favor, adicione sua API Key do OpenRouter (sk-or-v1-...) em Configurações > APIs.",
          details: "Não encontramos chaves nas tabelas api_credentials nem bot_settings para este usuário."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const platformsText = platforms?.length > 0 
      ? `para as plataformas: ${platforms.join(", ")}` 
      : "para redes sociais";

    const toneText = tone || "profissional mas acessível";

    let systemInstruction = `Você é um especialista em marketing digital e criação de conteúdo para redes sociais.
Responda APENAS em ${language}.`;

    if (attentionTechniques && mode !== "hashtags") {
      systemInstruction += `\nUse técnicas de copywriting (gatilhos mentais, storytelling ou hooks de atenção) para maximizar o engajamento.`;
    }

    let userPrompt = "";

    if (mode === "improve" && inputText) {
      userPrompt = `Melhore o seguinte texto ${platformsText}, mantendo o sentido original mas tornando-o mais atrativo.\nTom desejado: ${toneText}\n\nTexto Original:\n"${inputText}"`;
    } else if (mode === "translate" && inputText) {
      userPrompt = `Traduza e adapte o seguinte texto para ${language} ${platformsText}.\nTom desejado: ${toneText}\n\nTexto Original:\n"${inputText}"`;
    } else if (mode === "continue" && inputText) {
      userPrompt = `Continue o seguinte texto ${platformsText}, desenvolvendo a ideia de forma natural.\nTom desejado: ${toneText}\n\nTexto Atual:\n"${inputText}"`;
    } else if (mode === "hashtags") {
      userPrompt = `Analise o seguinte texto e gere de 10 a 20 hashtags virais e em alta, otimizadas ${platformsText}.\n\nTexto base:\n"${contentSource || 'Sem texto base, crie hashtags em alta gerais'}"`;
    } else if (mode === "report" && inputText) {
      userPrompt = `Crie uma matéria/reportagem jornalística completa baseada na seguinte transcrição de áudio/vídeo. Inclua um título forte, linha de apoio (subtítulo) e divida em parágrafos legíveis ${platformsText}.\nTom desejado: Jornalístico, ${toneText}\n\nTranscrição:\n"${inputText}"`;
    } else if (mode === "summary" && inputText) {
      userPrompt = `Faça um resumo com os principais pontos (bullet points) para criar expectativa e curiosidade (para viralizar) baseado na seguinte transcrição de áudio/vídeo ${platformsText}.\nTom desejado: ${toneText}\n\nTranscrição:\n"${inputText}"`;
    } else {
      userPrompt = `Crie um post ${platformsText} sobre o seguinte tema: "${topic || inputText}"\nTom desejado: ${toneText}`;
    }

    if (mode !== "hashtags" && mode !== "report" && mode !== "summary") {
      userPrompt += `\n\nInclua:
1. Texto principal do post (máximo 280 caracteres para Twitter/X, até 2200 para outras)
2. 5-10 hashtags relevantes
3. Uma sugestão de call-to-action

Formate a resposta EXATAMENTE assim:
POST: [texto do post]
HASHTAGS: [hashtags separadas por espaço]
CTA: [call-to-action sugerido]`;
    }

    let fetchUrl = `${baseUrl}/chat/completions`;
    let fetchMethod = "POST";
    let fetchHeaders: any = {
      "Content-Type": "application/json",
    };
    let fetchBody: any = {};

    // Build message content for multimodality (Vision)
    let messageContent: any = userPrompt;
    if (mediaUrls && mediaUrls.length > 0 && provider !== "google") {
      // For OpenAI-compatible and Anthropic, message content can be an array of objects
      messageContent = [
        { type: "text", text: userPrompt }
      ];
      for (const url of mediaUrls) {
        if (typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:image'))) {
          messageContent.push({
            type: "image_url",
            image_url: { url: url }
          });
        }
      }
    }

    // Provider-specific logic
    if (provider === "google") {
      fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const parts: any[] = [{ text: userPrompt }];
      // Note: Direct Google API expects base64 or inlineData for images, not just URL strings in typical REST API unless using File API. 
      // For simplicity in this Edge Function, we assume the user prefers OpenRouter for Vision, 
      // but if we had inlineData, we'd add it here. For now, we only pass text to direct Google API.
      
      fetchBody = {
        contents: [{ parts: parts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      };
    } else if (provider === "anthropic") {
      fetchUrl = baseUrl || "https://api.anthropic.com/v1/messages";
      fetchHeaders = {
        ...fetchHeaders,
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
      
      // Anthropic expects image base64, not URLs natively in Messages API, but OpenRouter handles image_url conversion.
      fetchBody = {
        model: model || "claude-3-haiku-20240307",
        max_tokens: 1000,
        system: systemInstruction,
        messages: [{ role: "user", content: messageContent }],
      };
    } else {
      // OpenAI / Lovable / OpenRouter (OpenAI-compatible)
      fetchHeaders["Authorization"] = `Bearer ${apiKey}`;
      
      if (provider === "openrouter") {
        fetchHeaders["HTTP-Referer"] = "https://social-canvas-hub.lovable.dev";
        fetchHeaders["X-Title"] = "Vitória Net";
      }
      
      fetchBody = {
        model: model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: messageContent },
        ],
        temperature: 0.7,
      };
    }

    console.log(`[AI] Calling ${provider} API with model ${model}...`);
    
    const aiResponse = await fetch(fetchUrl, {
      method: fetchMethod,
      headers: fetchHeaders,
      body: JSON.stringify(fetchBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[AI] ${provider} API Error (${aiResponse.status}):`, errorText);
      
      let errorMessage = `Erro na API da IA (${provider}).`;
      if (aiResponse.status === 429) errorMessage = "Limite de requisições excedido na API da IA.";
      if (aiResponse.status === 401) errorMessage = "API Key de IA inválida ou expirada.";
      if (aiResponse.status === 402) errorMessage = "Créditos de IA insuficientes.";
      if (aiResponse.status === 404) errorMessage = "Modelo de IA não encontrado.";
      
      return new Response(
        JSON.stringify({ error: errorMessage, details: errorText }),
        { status: aiResponse.status >= 500 ? 500 : aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let generatedContent = "";

    try {
      if (provider === "google") {
        generatedContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else if (provider === "anthropic") {
        generatedContent = aiData.content?.[0]?.text || "";
      } else {
        generatedContent = aiData.choices?.[0]?.message?.content || "";
      }
    } catch (parseError) {
      console.error(`[AI] Error parsing ${provider} response:`, parseError);
    }

    if (!generatedContent) {
      console.error(`[AI] Empty response from ${provider}:`, JSON.stringify(aiData).substring(0, 500));
      return new Response(
        JSON.stringify({ error: "O provedor de IA retornou uma resposta vazia ou em formato desconhecido." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const postMatch = generatedContent.match(/POST:\s*(.+?)(?=HASHTAGS:|$)/s);
    const hashtagsMatch = generatedContent.match(/HASHTAGS:\s*(.+?)(?=CTA:|$)/s);
    const ctaMatch = generatedContent.match(/CTA:\s*(.+?)$/s);

    const result = {
      post: postMatch?.[1]?.trim() || generatedContent,
      hashtags: hashtagsMatch?.[1]?.trim() || "",
      cta: ctaMatch?.[1]?.trim() || "",
      raw: generatedContent,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unhandled error in generate-post-content:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno no servidor ao gerar conteúdo.", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
