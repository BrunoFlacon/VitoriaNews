import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

export interface BotEngineConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  userId: string;
  platform: string;
  chatId: string;
  message: string;
  isGroup?: boolean;
}

export async function getSmartResponse(config: BotEngineConfig) {
  const { supabaseUrl, supabaseServiceKey, userId, platform, chatId, message, isGroup = false } = config;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`[BOT-ENGINE] [${platform}] Processing message for User ${userId}, Chat ${chatId}. isGroup: ${isGroup}`);

  const { data: settings } = await supabase
    .from('bot_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle();

  if (!settings) {
    console.warn(`[BOT-ENGINE] [${platform}] No settings found.`);
    return { error: "Configurações não encontradas para esta plataforma." };
  }
  if (!settings.is_active) {
    console.log(`[BOT-ENGINE] [${platform}] Bot is INACTIVE.`);
    return { error: "O Robô está DESATIVADO no painel." };
  }

  // Filtros de atuação
  if (isGroup && !settings.respond_groups) {
    console.log(`[BOT-ENGINE] [${platform}] Group responding DISABLED.`);
    return { error: "Resposta em GRUPOS desativada nas configurações." };
  }
  if (!isGroup && !settings.respond_private) {
    console.log(`[BOT-ENGINE] [${platform}] Private responding DISABLED.`);
    return { error: "Resposta em Inbox Privado desativada nas configurações." };
  }

  const text = message.toLowerCase().trim();

  // 1. Opt-Out (Simplificado conforme pedido: apenas as palavras)
  const optOutKeywords = [
    "parar", "stop", "parar bot", "sair do bot", "nao quero bot", 
    "não quero bot", "falar com humano", "atendente", "suporte"
  ];

  if (optOutKeywords.some(k => text.includes(k))) {
    console.log(`[BOT-ENGINE] [${platform}] Opt-out keyword detected: ${text}`);
    return "Entendido! Pausamos o assistente automático nesta conversa. Um consultor humano falará com você em breve.";
  }

  // 2. Human Bypass (Sincronização com Inbox)
  const silenceHours = settings.silence_duration_hours || 1;
  const SILENCE_MS = silenceHours * 60 * 60 * 1000;
  
  if (silenceHours > 0) {
    // Busca mensagens enviadas por HUMANOS (onde metadata->bot_reply não é true)
    const { data: lastHumanMsg } = await supabase
      .from('messages')
      .select('sent_at, metadata')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('recipient_phone', chatId)
      .eq('status', 'sent')
      .or('metadata->>bot_reply.eq.false,metadata->bot_reply.is.null')
      .gt('sent_at', new Date(Date.now() - SILENCE_MS).toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastHumanMsg) {
      console.log(`[BOT-ENGINE] [${platform}] Human recently replied (${lastHumanMsg.sent_at}). Bot SILENCED for ${silenceHours}h.`);
      return { error: `Silêncio Inteligente Ativo: Você respondeu recentemente (${new Date(lastHumanMsg.sent_at).toLocaleTimeString()}).` };
    }
  }

  // 3. Fluxos Fixos
  const flows = settings.flow_coordinates || [];
  for (const flow of flows) {
    if (!flow.keyword) continue;
    const keywords = flow.keyword.split(',').map((k: any) => k.trim().toLowerCase());
    if (keywords.some((k: any) => k && text.includes(k))) {
      console.log(`[BOT-ENGINE] [${platform}] Keyword match: ${flow.keyword}`);
      return flow.response;
    }
  }

  // 4. Inteligência Artificial
  if (settings.behavior_mode !== 'fixed') {
    const provider = settings.ai_provider || 'openai';
    const model = settings.ai_model;
    
    let apiKey = '';
    let apiUrl = '';

    switch (provider) {
      case 'openai':
        apiKey = settings.openai_api_key || Deno.env.get("OPENAI_API_KEY");
        apiUrl = "https://api.openai.com/v1/chat/completions";
        break;
      case 'groq':
        apiKey = settings.groq_api_key || Deno.env.get("GROQ_API_KEY");
        apiUrl = "https://api.groq.com/openai/v1/chat/completions";
        break;
      case 'openrouter':
        apiKey = settings.openrouter_api_key || Deno.env.get("OPENROUTER_API_KEY");
        apiUrl = "https://openrouter.ai/api/v1/chat/completions";
        break;
      case 'google':
        apiKey = settings.gemini_api_key || Deno.env.get("GEMINI_API_KEY");
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
        break;
    }

    if (!apiKey && provider !== 'google') {
      console.warn(`[BOT-ENGINE] [${platform}] Missing API Key for ${provider}`);
      return { error: `Chave de API do ${provider} ausente ou inválida.` };
    }

    try {
      console.log(`[BOT-ENGINE] [${platform}] Calling ${provider} IA with model ${model || 'default'}...`);
      
      const defaultSystemPrompt = "Você é o robô assistente oficial do Social Canvas Hub / Vitória Net. Você é educado, ágil e focado em ajudar o usuário com informações sobre marketing, redes sociais e tendências. Se o usuário perguntar quem você é, identifique-se como o Robô Artesão da Vitória Net.";
      let systemPrompt = settings.ai_prompt || defaultSystemPrompt;
      
      if (isGroup) {
        systemPrompt += "\nOBSERVAÇÃO: Você está em um GRUPO. Responda apenas se for uma pergunta ou se for mencionado. Seja breve.";
      }

      // 4a. Tratamento para Google Gemini
      if (provider === 'google') {
        const payload = { contents: [{ parts: [{ text: `${systemPrompt}\n\nUsuário: ${message}` }] }] };
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) throw new Error(`Google API returned ${response.status}`);
        
        const aiData = await response.json();
        const reply = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`[BOT-ENGINE] [${platform}] Gemini Reply generated successfully.`);
        return reply || { error: "IA retornou resposta vazia." };
      }

      // 4b. Tratamento Padrão (OpenAI-compatible: Groq, OpenRouter, OpenAI)
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || (provider === 'groq' ? 'llama-3.1-70b-versatile' : 'gpt-4o-mini'),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[BOT-ENGINE] API Error (${provider}):`, errText);
        return "Desculpe, estou processando muitas informações agora. Pode repetir em instantes?";
      }

      const aiData = await response.json();
      const aiReply = aiData.choices?.[0]?.message?.content;
      
      if (!aiReply) {
        return { error: "IA retornou resposta vazia." };
      }

      console.log(`[BOT-ENGINE] [${platform}] ${provider} Reply generated successfully.`);
      return aiReply;
    } catch (err: any) {
      console.error(`[BOT-ENGINE] IA Exception (${provider}):`, err);
      return { error: `Falha na conexão com ${provider}: ${err.message}` };
    }
  }

  console.log(`[BOT-ENGINE] [${platform}] No keyword match and IA disabled.`);
  return null;
}

export async function logInteraction(supabase: any, {
  userId, platform, chatId, content, status, isBot = false, metadata = {}
}: any) {
  try {
    await supabase.from("messages").insert({
      user_id: userId,
      content,
      platform,
      recipient_phone: chatId,
      status,
      sent_at: new Date().toISOString(),
      metadata: { ...metadata, bot_reply: isBot }
    });
  } catch (err) {
    console.error(`[BOT-ENGINE] Log Error:`, err);
  }
}
