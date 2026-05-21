# Meta Omnichannel Spec & Botzap Engine (Uso Próprio)

**Status:** Especificação Arquitetural de Transição (Migração de Tech Provider para Uso Próprio)  
**Autor:** Antigravity (Google Advanced Agentic Coding)  
**Objetivo:** Desacoplar a complexa infraestrutura de parceiro de tecnologia (OAuth, rotas de Partner Center e gerenciamento dinâmico de chaves) para adotar um fluxo ágil, direto e centralizado baseado em Token Estático de Usuário do Sistema (System User Token) e Webhook Omnichannel Unificado.

---

## 1. Visão Geral da Mudança Arquitetural

```mermaid
graph TD
    subgraph Antigo Modelo (Tech Provider)
        A[Cliente OAuth Signup] --> B[whatsapp-tech-provider-auth]
        B --> C[Troca de Code por Access Token]
        C --> D[(Tabela api_credentials e social_connections)]
        D --> E[Múltiplos Webhooks Fragmentados]
    end

    subgraph Novo Modelo (Uso Próprio Omnichannel)
        F[Meta Event: WA / FB / IG / Threads] --> G[Webhook Central: /functions/meta-webhook]
        G --> H{Validação Estática: .env}
        H --> I[Normalização: NormalizedMessage]
        I --> J[Motor Unificado: bot-engine.ts]
        J --> K[Graph API v21.0 com System User Token]
        J --> L[(Tabela messages e bot_settings)]
    end
```

### 1.1. O que foi abandonado (Depreciação)
- **Rotas e Funções de OAuth:** Descarte total da função `whatsapp-tech-provider-auth` e seus fluxos de troca de código de autorização (`code`) por tokens dinâmicos.
- **Tabelas de Chaves Dinâmicas:** A busca de tokens em `api_credentials` e `social_connections` por requisição deixa de ser o ponto único de falha.
- **Assinatura de Webhooks Dinâmicos:** A aplicação não assina mais webhooks via código em tempo de execução. Todo o registro de Webhook é feito 1 única vez via painel de Desenvolvedor da Meta (App Dashboard).

### 1.2. O Novo Modelo (Uso Próprio)
- **Autenticação Baseada em Variáveis de Ambiente:** Todas as requisições para a Graph API utilizam um único **System User Token** (com permissões de `whatsapp_business_messaging`, `pages_messaging`, `instagram_manage_messages`, `pages_manage_posts`, `instagram_manage_comments`).
- **Webhook Central:** Um único endpoint (`/functions/meta-webhook`) escuta todos os eventos da Meta (`whatsapp_business_account`, `page`, `instagram`, `instagram_direct`, `feed`).

---

## 2. Configuração de Variáveis de Ambiente (`.env` Supabase)

No painel do Supabase (Project Settings > Edge Functions Secrets) ou no `.env.local`, as seguintes chaves são mandatórias:

```env
# ── Meta Graph API ──
META_SYSTEM_USER_TOKEN=EAA... # Token longo permanente gerado no Business Manager
WEBHOOK_VERIFY_TOKEN=vitoria_net_omni_secure_2026 # String estática de verificação
META_GRAPH_VERSION=v21.0

# ── Identificadores Oficiais das Contas ──
WHATSAPP_PHONE_NUMBER_ID=123456789012345
FACEBOOK_PAGE_ID=987654321098765
INSTAGRAM_ACCOUNT_ID=543210987654321
```

---

## 3. Estrutura de Dados e Normalização

Para unificar o tratamento no motor do robô (`botzap`), todos os payloads recebidos pelo Webhook são convertidos para a interface padronizada `NormalizedMessage`.

```typescript
export type OmnichannelPlatform = 'whatsapp' | 'facebook' | 'instagram' | 'threads' | 'webchat';

export interface NormalizedMessage {
  platform: OmnichannelPlatform;
  chatId: string;           // Identificador único do remetente (WA: 5511999..., FB: PSID, IG: IGSID)
  recipientId: string;      // Identificador da nossa conta (PhoneID, PageID, IGAccountID)
  text: string;             // Conteúdo da mensagem ou comentário
  timestamp: number;        // Epoch timestamp (em segundos ou milissegundos)
  senderName: string;       // Nome de exibição do usuário (se fornecido pelo payload)
  isGroup: boolean;         // WA: true se for grupo (@g.us)
  isComment: boolean;       // true se o evento for um comentário em post/feed
  commentId?: string;       // ID do comentário na Meta (para responder via Graph API)
  postId?: string;          // ID da publicação/post
  mediaType?: string;       // image, video, audio, document
  mediaUrl?: string;        // URL da mídia caso exista
  rawPayload?: any;         // Payload original completo para auditorias e depuração
}
```

---

## 4. Implementação do Webhook Central (`meta-webhook/index.ts`)

Este é o controlador completo da Edge Function do Supabase responsável por receber, validar e despachar todos os eventos da Meta e Web Chat.

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processOmnichannelMessage, NormalizedMessage } from "../_shared/bot-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const verifyToken = Deno.env.get("WEBHOOK_VERIFY_TOKEN") || "vitoria_net_omni_secure";

  // ── 1. ROTA GET: Validação do Webhook (Meta Challenge) ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[META-WEBHOOK] Verificação de Webhook bem-sucedida!");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    console.warn(`[META-WEBHOOK] Tentativa de verificação falhou. Token recebido: ${token}`);
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // ── 2. ROTA POST: Recepção Omnichannel de Eventos ──
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const objectType = body?.object; // 'whatsapp_business_account', 'page', 'instagram'
    const entries = body?.entry || [];

    for (const entry of entries) {
      const entryId = entry.id; // Pode ser o ID do Page, WABA ou IG

      // A: Processamento WhatsApp Business
      if (objectType === "whatsapp_business_account") {
        for (const change of entry?.changes || []) {
          const metadata = change?.value?.metadata || {};
          const phoneNumberId = metadata.phone_number_id;
          if (!phoneNumberId) continue;

          for (const msg of change?.value?.messages || []) {
            if (msg.type === "echo") continue; // Pula mensagens enviadas por nós mesmos

            const contacts = change.value.contacts || [];
            const contact = contacts.find((c: any) => c.wa_id === msg.from);
            
            const normalized: NormalizedMessage = {
              platform: "whatsapp",
              chatId: msg.from,
              recipientId: phoneNumberId,
              text: msg.text?.body || msg.caption || "[Mídia]",
              timestamp: parseInt(msg.timestamp || "0"),
              senderName: contact?.profile?.name || msg.from,
              isGroup: msg.from.includes("@g.us") || msg.from.length > 15,
              isComment: false,
              mediaType: msg.type !== "text" ? msg.type : undefined,
              rawPayload: msg
            };

            await processOmnichannelMessage(supabase, normalized);
          }
        }
      } 
      
      // B: Processamento Facebook Page (Messenger & Comentários)
      else if (objectType === "page") {
        // 1. Verificação de Mensagens do Messenger
        for (const msgEvent of entry?.messaging || []) {
          if (msgEvent.message && !msgEvent.message.is_echo) {
            const senderId = msgEvent.sender?.id;
            const recipientId = msgEvent.recipient?.id;
            const text = msgEvent.message.text || "[Mídia]";

            const normalized: NormalizedMessage = {
              platform: "facebook",
              chatId: senderId,
              recipientId: recipientId || entryId,
              text: text,
              timestamp: Math.floor((msgEvent.timestamp || Date.now()) / 1000),
              senderName: `FB User (${senderId})`,
              isGroup: false,
              isComment: false,
              rawPayload: msgEvent
            };

            await processOmnichannelMessage(supabase, normalized);
          }
        }

        // 2. Verificação de Comentários no Feed da Página
        for (const change of entry?.changes || []) {
          if (change.field === "feed" && change.value?.item === "comment" && change.value?.verb === "add") {
            const val = change.value;
            const normalized: NormalizedMessage = {
              platform: "facebook",
              chatId: val.from?.id,
              recipientId: entryId,
              text: val.message || "",
              timestamp: val.created_time || Math.floor(Date.now() / 1000),
              senderName: val.from?.name || "FB Commenter",
              isGroup: false,
              isComment: true,
              commentId: val.comment_id,
              postId: val.post_id,
              rawPayload: val
            };

            await processOmnichannelMessage(supabase, normalized);
          }
        }
      }

      // C: Processamento Instagram (Direct & Comentários)
      else if (objectType === "instagram") {
        for (const msgEvent of entry?.messaging || []) {
          if (msgEvent.message && !msgEvent.message.is_echo) {
            const senderId = msgEvent.sender?.id;
            const recipientId = msgEvent.recipient?.id;
            const text = msgEvent.message.text || "[Mídia]";

            const normalized: NormalizedMessage = {
              platform: "instagram",
              chatId: senderId,
              recipientId: recipientId || entryId,
              text: text,
              timestamp: Math.floor((msgEvent.timestamp || Date.now()) / 1000),
              senderName: `IG User (${senderId})`,
              isGroup: false,
              isComment: false,
              rawPayload: msgEvent
            };

            await processOmnichannelMessage(supabase, normalized);
          }
        }

        for (const change of entry?.changes || []) {
          if (change.field === "comments" && change.value) {
            const val = change.value;
            const normalized: NormalizedMessage = {
              platform: "instagram",
              chatId: val.from?.id || val.owner_id,
              recipientId: entryId,
              text: val.text || "",
              timestamp: val.created_at || Math.floor(Date.now() / 1000),
              senderName: val.from?.username || "IG Commenter",
              isGroup: false,
              isComment: true,
              commentId: val.id,
              postId: val.media?.id,
              rawPayload: val
            };

            await processOmnichannelMessage(supabase, normalized);
          }
        }
      }
    }

    // Sempre retorna 200 de imediato para a Meta para evitar enfileiramento de retentativas
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[META-WEBHOOK] Erro no processamento do evento:", error);
    // Mesmo em caso de erro interno, retornamos 200 para não travar o Webhook da Meta
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## 5. Motor de Processamento e Envio Omnichannel (`_shared/bot-engine.ts`)

Aqui está a refatoração do motor de inteligência e resposta que lida com as regras de negócio, IA, silenciamento inteligente e envio direto pela Graph API via **System User Token**.

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { NormalizedMessage } from "./bot-engine.ts";

declare const Deno: any;

const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") || "v21.0";
const SYSTEM_TOKEN = Deno.env.get("META_SYSTEM_USER_TOKEN");

/**
 * 🚀 Envio Direto via Meta Graph API (Omnichannel)
 */
async function sendMetaGraphMessage(msg: NormalizedMessage, replyText: string) {
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
      // Resposta a Comentário no Post/Feed
      url += `/${msg.commentId}/comments`;
      payload = { message: replyText };
    } else {
      // Direct Message / Inbox Messenger
      url += `/${msg.recipientId}/messages`;
      payload = {
        recipient: { id: msg.chatId },
        message: { text: replyText }
      };
    }
  } else {
    console.warn(`[BOT-SENDER] Plataforma ${msg.platform} não possui envio Graph API direto implementado.`);
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
    console.error(`[BOT-SENDER] Falha ao enviar mensagem para ${msg.platform} (${msg.chatId}):`, error);
    throw error;
  }
}

/**
 * ⚙️ Processador Central de Mensagens
 */
export async function processOmnichannelMessage(supabase: any, msg: NormalizedMessage) {
  console.log(`[BOTZAP] Entrada Normalizada [${msg.platform}] de ${msg.senderName} (${msg.chatId})`);

  // Ignorar mensagens antigas (trava de segurança de 5 minutos)
  const ageSeconds = Math.floor(Date.now() / 1000) - msg.timestamp;
  if (msg.timestamp > 0 && ageSeconds > 300) {
    console.log(`[BOTZAP] Ignorando evento antigo de ${ageSeconds}s atrás.`);
    return;
  }

  // Identificação do Usuário Dono da Conta (Buscamos o primeiro usuário do sistema ou por mapeamento)
  // Como estamos no modelo de Uso Próprio, o bot responde em nome da nossa empresa
  const { data: adminUsers } = await supabase.from("profiles").select("id").limit(1);
  const userId = adminUsers?.[0]?.id;

  if (!userId) {
    console.warn("[BOTZAP] Nenhum usuário administrador encontrado no sistema.");
    return;
  }

  // 1. Log da Mensagem Recebida (Inbox do Dashboard)
  await logInteraction(supabase, {
    userId,
    platform: msg.platform,
    chatId: msg.chatId,
    content: msg.text,
    status: "received",
    isBot: false,
    metadata: {
      sender_name: msg.senderName,
      is_group: msg.isGroup,
      is_comment: msg.isComment,
      comment_id: msg.commentId,
      post_id: msg.postId,
      media_type: msg.mediaType
    }
  });

  // 2. Executa a Lógica Inteligente de Resposta
  const reply = await getSmartResponse({
    supabaseUrl: Deno.env.get("SUPABASE_URL")!,
    supabaseServiceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    userId,
    platform: msg.platform,
    chatId: msg.chatId,
    message: msg.text,
    isGroup: msg.isGroup
  });

  // 3. Em caso de resposta válida, dispara o envio
  if (reply && typeof reply === "string") {
    console.log(`[BOTZAP] Enviando resposta para ${msg.chatId} [${msg.platform}]: "${reply.slice(0, 50)}..."`);
    await sendMetaGraphMessage(msg, reply);

    // Log do envio do bot
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

/**
 * 💾 Função de Registro no Banco (Tabela messages)
 */
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
    console.error(`[BOTZAP] Erro ao registrar no log de mensagens:`, err);
  }
}
```

---

## 6. Plano de Ação para Transição (Deploy)

1. **Atualizar `.env` do Supabase:** Inserir o `META_SYSTEM_USER_TOKEN` gerado no Business Manager.
2. **Criar / Atualizar a Edge Function `meta-webhook`:** Colocar o código unificado e fazer o deploy via `supabase functions deploy meta-webhook`.
3. **Configurar Webhook no App da Meta:**
   - Acessar developers.facebook.com > App Dashboard > Webhooks.
   - Selecionar **WhatsApp Business Account**, **Page** e **Instagram**.
   - Colocar a URL: `https://[PROJECT_REF].supabase.co/functions/v1/meta-webhook`.
   - Colocar o Token de Verificação idêntico ao do `.env`.
   - Inscrever os campos (`messages` no WA; `messages` e `feed` no Page; `messages` e `comments` no IG).
4. **Remover a Função Antiga:** Deletar `whatsapp-tech-provider-auth` do projeto para evitar confusão de manutenção futura.
