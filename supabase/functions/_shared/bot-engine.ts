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
      .or('metadata->>bot_reply.eq.false|metadata->bot_reply.is.null')
      .gt('sent_at', new Date(Date.now() - SILENCE_MS).toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastHumanMsg) {
      console.log(`[BOT-ENGINE] [${platform}] Human recently replied (${lastHumanMsg.sent_at}). Bot SILENCED for ${silenceHours}h.`);
      return { error: `Silêncio Inteligente Ativo: Você respondeu recentemente (${new Date(lastHumanMsg.sent_at).toLocaleTimeString()}).` };
    }

    // Também verifica silencio_chats (silêncio manual/persistente)
    const { data: silenced } = await supabase
      .from('silencio_chats')
      .select('id, silenced_at, expires_at')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('chat_id', chatId)
      .maybeSingle();

    if (silenced) {
      if (silenced.expires_at && new Date(silenced.expires_at) < new Date()) {
        // Expirado — limpar
        await supabase.from('silencio_chats').delete().eq('id', silenced.id);
      } else {
        console.log(`[BOT-ENGINE] [${platform}] Chat ${chatId} manually SILENCED (${silenced.silenced_at}).`);
        return { error: "Este chat está silenciado no painel." };
      }
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
        apiKey = settings.gemini_api_key || Deno.env.get("GEMINI_API_KEY") || '';
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent`;
        break;
    }

    if (!apiKey) {
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
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          console.error(`[BOT-ENGINE] Google API Error (${response.status}):`, errText);
          if (response.status === 429) {
            return "Estou processando muitas requisições. Aguarde um momento e tente novamente.";
          }
          return "Desculpe, tive um problema ao processar sua mensagem. Pode repetir?";
        }
        
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
  userId, platform, chatId, content, status, isBot = false, metadata = {}, mediaUrl
}: any) {
  try {
    const insertPayload: any = {
      user_id: userId,
      content,
      platform,
      recipient_phone: chatId,
      status,
      sent_at: new Date().toISOString(),
      metadata: { ...metadata, bot_reply: isBot }
    };
    if (mediaUrl) {
      insertPayload.media_url = mediaUrl;
    }
    await supabase.from("messages").insert(insertPayload);
  } catch (err) {
    console.error(`[BOT-ENGINE] Log Error:`, err);
  }
}

export type OmnichannelPlatform = 'whatsapp' | 'facebook' | 'instagram' | 'threads' | 'webchat';

export interface NormalizedMessage {
  platform: OmnichannelPlatform;
  chatId: string;
  recipientId: string;
  text: string;
  timestamp: number;
  senderName: string;
  isGroup: boolean;
  isComment: boolean;
  commentId?: string;
  postId?: string;
  mediaType?: string;
  mediaUrl?: string;
  rawPayload?: any;
  mediaId?: string;
  mimeType?: string;
  filename?: string;
  location?: { lat: number; lng: number; name?: string };
  contact?: { phone: string; name: string };
  stickerEmoji?: string;
  duration?: number;
}

export async function sendMetaGraphMessage(msg: NormalizedMessage, replyText: string) {
  const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v21.0";
  const SYSTEM_TOKEN = Deno.env.get("META_SYSTEM_USER_TOKEN");

  if (!SYSTEM_TOKEN) {
    throw new Error("META_SYSTEM_USER_TOKEN não configurado no .env");
  }

  let url = `https://graph.facebook.com/${GRAPH_VERSION}`;
  let payload: any = {};

  if (msg.platform === "whatsapp") {
    url += `/${msg.recipientId}/messages`;
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: msg.chatId,
      type: "text",
      text: { body: replyText }
    };
  } else if (msg.platform === "facebook" || msg.platform === "instagram") {
    if (msg.isComment && msg.commentId) {
      url += `/${msg.commentId}/comments`;
      payload = { message: replyText };
    } else {
      url += `/${msg.recipientId}/messages`;
      payload = {
        recipient: { id: msg.chatId },
        message: { text: replyText }
      };
    }
  } else {
    console.warn(`[BOT-SENDER] Plataforma ${msg.platform} não possui envio Graph API direto.`);
    return null;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SYSTEM_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.error) {
      console.error(`[GRAPH-API-ERROR] [${msg.platform}]`, data.error);
      throw new Error(data.error.message);
    }
    return data;
  } catch (error) {
    console.error(`[BOT-SENDER] Falha ao enviar para ${msg.platform} (${msg.chatId}):`, error);
    throw error;
  }
}

export async function processOmnichannelMessage(supabase: any, msg: NormalizedMessage) {
  console.log(`[BOTZAP] Entrada Normalizada [${msg.platform}] de ${msg.senderName} (${msg.chatId})`);

  const ageSeconds = Math.floor(Date.now() / 1000) - msg.timestamp;
  if (msg.timestamp > 0 && ageSeconds > 300) {
    console.log(`[BOTZAP] Ignorando evento antigo (${ageSeconds}s atrás).`);
    return;
  }

  let userId: string | null = null;

  if (msg.platform === "whatsapp") {
    const { data: connection } = await supabase
      .from("social_connections")
      .select("user_id")
      .eq("platform", "whatsapp")
      .eq("platform_user_id", msg.recipientId)
      .maybeSingle();
    userId = connection?.user_id || null;
  }

  if (!userId) {
    const { data: connection } = await supabase
      .from("social_connections")
      .select("user_id")
      .eq("platform_user_id", msg.recipientId)
      .maybeSingle();
    userId = connection?.user_id || null;
  }

  if (!userId) {
    const { data: adminUsers } = await supabase.from("profiles").select("id").limit(1);
    userId = adminUsers?.[0]?.id;
  }

  if (!userId) {
    console.warn("[BOTZAP] Nenhum usuário encontrado.");
    return;
  }

  const mediaMetadata: any = {
    media_type: msg.mediaType,
    media_id: msg.mediaId,
    mime_type: msg.mimeType,
    filename: msg.filename,
    location: msg.location,
    contact: msg.contact,
    sticker_emoji: msg.stickerEmoji,
    duration: msg.duration
  };
  if (msg.rawPayload?._location) mediaMetadata.location = msg.rawPayload._location;

  await logInteraction(supabase, {
    userId,
    platform: msg.platform,
    chatId: msg.chatId,
    content: msg.text,
    status: "received",
    mediaUrl: msg.mediaUrl,
    isBot: false,
    metadata: {
      sender_name: msg.senderName,
      is_group: msg.isGroup,
      is_comment: msg.isComment,
      comment_id: msg.commentId,
      post_id: msg.postId,
      ...mediaMetadata
    }
  });

  const reply = await getSmartResponse({
    supabaseUrl: Deno.env.get("SUPABASE_URL")!,
    supabaseServiceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    userId,
    platform: msg.platform,
    chatId: msg.chatId,
    message: msg.text,
    isGroup: msg.isGroup
  });

  if (reply && typeof reply === "string") {
    console.log(`[BOTZAP] Respondendo [${msg.platform}]: "${reply.slice(0, 50)}..."`);
    await sendMetaGraphMessage(msg, reply);

    await logInteraction(supabase, {
      userId,
      platform: msg.platform,
      chatId: msg.chatId,
      content: reply,
      status: "sent",
      isBot: true,
      metadata: { is_group: msg.isGroup, is_comment: msg.isComment }
    });
  } else if (reply && typeof reply === "object" && reply.error) {
    console.log(`[BOTZAP] Silenciado/Não respondeu: ${reply.error}`);
  }
}
