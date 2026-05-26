# Plano de Correção — Webhooks & Auto-Refresh de Tokens

## Diagnóstico dos Problemas

| # | Problema | Gravidade | Plataforma | Impacto |
|---|----------|-----------|------------|---------|
| 1 | `whatsapp-tech-provider-auth` retorna 410 mas `WhatsAppEmbeddedSignup.tsx` chama ela | 🔴 **Crítico** | WhatsApp | Fluxo Embedded Signup sempre falha |
| 2 | Threads não tem auto-refresh de token (expira em 60 dias) | 🔴 **Crítico** | Threads | Perda de métricas e conexão |
| 3 | Facebook/Instagram Page Tokens não têm refresh automático | 🔴 **Crítico** | Facebook, Instagram | Perda de métricas após 60 dias |
| 4 | Threads Basic Display API não retorna `profile_picture_url` | 🟡 **Médio** | Threads | Foto do perfil não exibida |
| 5 | Nenhuma visibilidade do status dos webhooks no sistema | 🟡 **Médio** | Todas | Usuário não sabe se webhook está ativo |
| 6 | Meta webhook verify token fixo (não configurável por usuário) | 🔵 **Leve** | Meta | Segurança |

---

## Fase 1 — Correções Imediatas (Prioridade Alta)

### 1.1 WhatsApp Embedded Signup — Corrigir fluxo quebrado

**Arquivo:** `src/components/dashboard/settings/WhatsAppEmbeddedSignup.tsx`

**O que está errado:** Linha 104 chama `whatsapp-tech-provider-auth` que retorna HTTP 410.

**Correção:** Substituir a chamada para `whatsapp-tech-provider-auth` por uma instrução clara para o usuário configurar manualmente via "Uso Próprio" (Business), com link para o passo a passo no Meta Developer Console (documentado na Fase 3).

**Alterações:**
- `WhatsAppEmbeddedSignup.tsx`: Modificar `handleProcessCode` para não invocar a função deprecated. Em vez disso, exibir toast com instruções para configurar manualmente.
- `WhatsAppEmbeddedSignup.tsx`: Adicionar fallback que orienta o usuário a preencher os campos de API manualmente (access_token, waba_id, phone_number_id, app_id).

### 1.2 Threads Basic Display — Fallback para foto do perfil

**Arquivo:** `src/components/dashboard/settings/ConnectionCard.tsx`

**O que está errado:** Threads Basic Display API não retorna `profile_picture_url` — apenas contas Business/Creator têm esse campo.

**Correção:** Adicionar como fallback a foto que foi salva do perfil do Threads no banco de dados quando a foto do Threads não estiver disponível.

**Arquivo adicional:** `supabase/functions/media-relay/index.ts` já tenta recovery com `/picture` endpoint (linhas 357-369), mas o frontend precisa enviar o `platform_user_id` correto.

---

## Fase 2 — Auto-Refresh de Tokens (Prioridade Alta)

### 2.1 Arquitetura do Sistema de Refresh

Criar **duas camadas** de refresh de token:

1. **Preventiva (Frontend)** — `useSocialConnections.ts`: Verificar `token_expires_at` ao carregar. Se faltar menos de 7 dias, chamar `refresh-social-token` automaticamente.

2. **Automática (Cron)** — Edge Function rodando em cron schedule (ex: a cada 6h) que varre TODAS as `social_connections` com token prestes a expirar e renova.

### 2.2 Cron Job de Refresh — `refresh-tokens-cron/index.ts` (CRIAR)

Criar novo arquivo: `supabase/functions/refresh-tokens-cron/index.ts`

```typescript
// Escopo:
// 1. Buscar todas social_connections com token_expires_at < now() + 7 days
// 2. Para cada plataforma, chamar refresh adequado:
//    - google/youtube: OAuth2 refresh_token
//    - twitter: OAuth2 refresh_token  
//    - facebook: Meta Graph API /oauth/access_token (exchange short-lived)
//    - instagram: Mesmo que facebook (page token)
//    - threads: Avisar usuário (não tem refresh — ver 2.4)
// 3. Atualizar access_token e token_expires_at
// 4. Se refresh falhar (token revogado), marcar is_connected = false
//    e notificar usuário
```

**Esquema de renovação por plataforma:**

| Plataforma | Método | Endpoint | Tempo de vida |
|-----------|--------|----------|---------------|
| Facebook (Page) | Exchange Page Token | `graph.facebook.com/v21.0/{page-id}?fields=access_token&access_token={token}` | 60 dias |
| Instagram (Business) | Exchange Page Token (mesmo do Facebook) | Mesmo do Facebook | 60 dias |
| Google/YouTube | OAuth2 refresh_token | `oauth2.googleapis.com/token` | 1 hora (refresh ilimitado) |
| Twitter/X | OAuth2 refresh_token | `api.x.com/2/oauth2/token` | 2 horas (refresh limitado) |
| Threads | ❌ Sem refresh | — | 60 dias fixo |
| Telegram | Bot tokens não expiram | — | Permanente |

Arquivo já existente: `supabase/functions/refresh-social-token/index.ts` — **precisa ser expandido** para suportar Facebook e Instagram Page Tokens.

### 2.3 Expandir `refresh-social-token` — Adicionar suporte a Facebook/Instagram

Adicionar cases no switch (linha 64):
```typescript
case "facebook":
case "instagram": {
  // Facebook Page Token não tem refresh_token
  // Mas podemos obter um novo fazendo exchange do token atual
  // ou usando o token de usuário para gerar novo page token
  const appId = Deno.env.get("META_APP_ID")!;
  const appSecret = Deno.env.get("META_APP_SECRET")!;
  
  // Tenta exchange: pegar page token renovado
  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${connection.access_token}`
  );
  const data = await res.json();
  if (data.access_token) {
    newAccessToken = data.access_token;
    newExpiresIn = data.expires_in || 5184000;
  } else {
    // Se falhar, tenta pegar novo page token via usuário
    // (precisa re-autorização)
    throw new Error("Token exchange failed. Reconnect required.");
  }
  break;
}
```

**Nota:** Meta App ID e App Secret precisam estar nas env vars do Supabase.

### 2.4 Threads — Sistema de Alerta de Expiração

Como Threads **não possui refresh token** (a API não suporta), precisamos de um sistema de alerta:

1. **No `refresh-tokens-cron`**: Detectar Threads com `token_expires_at < now() + 15 days` e criar notificação
2. **No frontend**: Exibir badge "Token expirando" no `APITab.tsx` e `ConnectionCard.tsx` para Threads
3. **Botão "Reconectar"**: Link direto para re-autorização OAuth do Threads

### 2.5 Detecção de Token Expirado no Frontend

**Arquivo:** `src/hooks/useSocialConnections.ts`

No hook, adicionar verificação:
```typescript
// Dentro do processamento de connections
const isExpiringSoon = conn.token_expires_at && 
  new Date(conn.token_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const daysUntilExpiry = conn.token_expires_at
  ? Math.ceil((new Date(conn.token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  : null;
```

Já existe `token_expires_at` no schema. Adicionar campos computados `isExpiringSoon` e `daysUntilExpiry` ao `SocialConnection` interface (linha 24-25).

**Arquivo:** `src/components/dashboard/settings/ConnectionCard.tsx` e `APITab.tsx`

Exibir badge de expiração:
- 🟢 Token OK (> 30 dias)
- 🟡 Expirando em breve (7-30 dias)  
- 🔴 Expirando muito em breve (< 7 dias) com botão "Renovar"
- ⚫ Expirado com botão "Reconectar"

---

## Fase 3 — Painel de Saúde dos Webhooks (Prioridade Média)

### 3.1 Endpoint de Diagnóstico — `webhook-health/index.ts` (CRIAR)

```typescript
// GET /functions/v1/webhook-health?platform=meta
// Retorna status de cada webhook:
// - Meta: não podemos verificar programaticamente (Meta não expõe health check)
//   Mas podemos verificar se o verify token está configurado
// - Telegram: chamar getWebhookInfo da API do Telegram
```

Para Telegram, podemos verificar o webhook real:
```typescript
const webhookInfo = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
// Retorna: url, has_custom_certificate, pending_update_count, etc.
```

### 3.2 Componente de Status — `WebhookStatusBadge.tsx` (CRIAR)

Indicador visual na UI que mostra:
- ✅ **Ativo** — Webhook registrado e saudável
- ⚠️ **Pendente** — Não configurado ou com problemas
- ❌ **Inativo** — Não registrado

Posicionamento: Dentro da `APITab.tsx`, ao lado do nome de cada plataforma que usa webhook.

---

## Fase 4 — Guia Meta Developer Console (Passo a Passo)

### 4.1 Configuração do Webhook Unificado da Meta

```
1. Acesse https://developers.facebook.com/apps/
2. Selecione seu aplicativo Meta
3. No menu esquerdo, vá em "Webhooks" (Produto)
4. Clique em "Adicionar Webhook" se não existir
5. Configure:
   ┌──────────────────────────────────────────────┐
   │ URL de Callback:                             │
   │ https://SEU_PROJETO.supabase.co/             │
   │   functions/v1/meta-webhook                  │
   │                                              │
   │ Token de Verificação:                        │
   │ vitoria_net_omni_secure                      │
   └──────────────────────────────────────────────┘
6. Clique em "Verificar e Salvar"
7. Após verificado, assine os campos necessários:
```

### 4.2 Assinatura de Campos por Plataforma

**WhatsApp Business:**
```
8. Vá em "WhatsApp" > "Configuração da API"
9. Na seção "Webhooks", clique em "Editar Assinatura"
10. Marque: messages, message_deliveries, message_reads
```

**Facebook Page:**
```
11. Volte em "Webhooks" > "Página"
12. Clique em "Editar Assinatura"
13. Marque: feed, messages, messaging_postbacks
```

**Instagram:**
```
14. Em "Webhooks" > "Instagram"
15. Clique em "Editar Assinatura"
16. Marque: comments, messaging, mentions
```

### 4.3 Configuração do Token do WhatsApp (Uso Próprio)

Caso o Embedded Signup não funcione (está deprecated):

```
1. Vá em "WhatsApp" > "Configuração da API" no Meta Dev Console
2. Selecione seu WABA (WhatsApp Business Account)
3. Gere um Token de Acesso permanente:
   - Vá em "Ferramentas" > "Graph API Explorer"
   - Selecione seu aplicativo
   - Selecione "System User" ou "Page Token" com escopo whatsapp_business_messaging
   - Gere token com validade estendida (60 dias)
4. Copie o token e cole no campo "Access Token" da aba WhatsApp
5. Preencha também:
   - WABA ID (WhatsApp Business Account ID)
   - Phone Number ID
   - App ID (do seu aplicativo Meta)
```

### 4.4 Env Necessárias no Supabase

As seguintes variáveis de ambiente precisam estar configuradas no Supabase:

| Variável | Onde obter | Obrigatório para |
|----------|-----------|------------------|
| `META_APP_ID` | Meta Dev Console > Configurações > Básico | Refresh de tokens Facebook/Instagram |
| `META_APP_SECRET` | Meta Dev Console > Configurações > Básico | Refresh de tokens Facebook/Instagram |
| `WEBHOOK_VERIFY_TOKEN` | Defina um valor seguro qualquer | Validação do webhook Meta |
| `GOOGLE_CLIENT_ID` | Google Cloud Console > Credenciais | Refresh tokens Google/YouTube |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console > Credenciais | Refresh tokens Google/YouTube |
| `TWITTER_CONSUMER_KEY` | Twitter Developer Portal | Refresh tokens Twitter |
| `TWITTER_CONSUMER_SECRET` | Twitter Developer Portal | Refresh tokens Twitter |

---

## Resumo das Ações por Arquivo

### Arquivos a CRIAR
| Arquivo | Finalidade |
|---------|-----------|
| `supabase/functions/refresh-tokens-cron/index.ts` | Cron job de refresh automático de tokens |
| `supabase/functions/webhook-health/index.ts` | Endpoint de diagnóstico de webhooks |
| `src/components/dashboard/settings/WebhookStatusBadge.tsx` | Componente de status do webhook na UI |
| `docs/META_DEVCONSOLE_GUIDE.md` | Guia detalhado do Meta Developer Console |

### Arquivos a MODIFICAR
| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/refresh-social-token/index.ts` | Adicionar suporte a Facebook/Instagram Page Token refresh |
| `supabase/functions/collect-social-analytics/index.ts` | Adicionar verificação de token expirado antes de coletar |
| `src/hooks/useSocialConnections.ts` | Adicionar `isExpiringSoon` e `daysUntilExpiry` ao `SocialConnection` |
| `src/components/dashboard/settings/APITab.tsx` | Exibir badge de expiração de token + link para reconectar |
| `src/components/dashboard/settings/ConnectionCard.tsx` | Exibir badge de expiração de token + fallback de foto para Instagram Basic |
| `src/components/dashboard/settings/WhatsAppEmbeddedSignup.tsx` | Corrigir fluxo quebrado (redirecionar para config manual) |
| `src/components/dashboard/SettingsView.tsx` | Integrar novos componentes de saúde de webhook |
| `src/components/dashboard/SocialNetworkCard.tsx` | Exibir status de expiração |
| `supabase/functions/sync-social-data/index.ts` | Adicionar verificação de token expirado antes de sincronizar |
| `supabase/functions/media-relay/index.ts` | Melhorar fallback de recovery para Instagram Basic Display |

### Arquivos a REMOVER
| Arquivo | Motivo |
|---------|--------|
| `supabase/functions/whatsapp-tech-provider-auth/index.ts` | Deprecated, retorna 410 |

---

## Ordem de Execução (Status Final)

```
FASE 1 ─── Correções Imediatas           [✅ CONCLUÍDO]
├── 1.1 WhatsApp Embedded Signup         ✓ WhatsAppEmbeddedSignup.tsx corrigido
└── 1.2 Fallback Instagram photo         ✓ Já existia (apenas confirmado)

FASE 2 ─── Auto-Refresh de Tokens        [✅ CONCLUÍDO]
├── 2.1 Expiry fields no hook            ✓ Já existia (apenas confirmado)
├── 2.2 refresh-social-token expandido   ✓ Facebook/Instagram fb_exchange_token
├── 2.3 Cron job criado                  ✓ refresh-tokens-cron
├── 2.4 Alerta Threads                   ✓ Cron skipa + badge expiração
└── 2.5 Badges na UI                     ✓ ConnectionCard + SettingsView

FASE 3 ─── Painel de Saúde Webhooks      [✅ CONCLUÍDO]
├── 3.1 Endpoint webhook-health          ✓ webhook-health/index.ts
├── 3.2 WebhookStatusBadge               ✓ Componente React memoizado
└── 3.3 Integração SettingsView          ✓ Badge exibido por plataforma

FASE 4 ─── Guia Meta Developer Console   [✅ CONCLUÍDO]
├── 4.1 Guia detalhado                   ✓ docs/META_DEVCONSOLE_GUIDE.md
└── 4.2 Env vars                         ✓ Documentadas no guia

GAP ─── Token Expiry na Coleta           [✅ CONCLUÍDO]
└── collect-social-analytics             ✓ Verifica token_expires_at antes de coletar
```

## Instruções de Deploy

```bash
# 1. Configurar env vars no Supabase
supabase secrets set META_APP_ID=<seu_app_id>
supabase secrets set META_APP_SECRET=<seu_app_secret>
supabase secrets set WEBHOOK_VERIFY_TOKEN=<seu_token>
supabase secrets set GOOGLE_CLIENT_ID=<seu_google_client_id>
supabase secrets set GOOGLE_CLIENT_SECRET=<seu_google_client_secret>
supabase secrets set TWITTER_CONSUMER_KEY=<seu_twitter_key>
supabase secrets set TWITTER_CONSUMER_SECRET=<seu_twitter_secret>

# 2. Deploy das Edge Functions
supabase functions deploy webhook-health
supabase functions deploy refresh-social-token
supabase functions deploy refresh-tokens-cron
supabase functions deploy collect-social-analytics
supabase functions deploy meta-webhook

# 3. Registrar o cron job (se não existir)
# No SQL Editor do Supabase:
select cron.schedule(
  'refresh-tokens-v2',
  '0 */6 * * *',
  $$ select net.http_post(
    url:='https://<projeto>.supabase.co/functions/v1/refresh-tokens-cron',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <service_role_key>"}'::jsonb
  ) as request_id;
  $$
);

# 4. Registrar o cron de coleta de analytics (se não existir)
select cron.schedule(
  'collect-social-analytics-v2',
  '0 */4 * * *',
  $$ select net.http_post(
    url:='https://<projeto>.supabase.co/functions/v1/collect-social-analytics',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <service_role_key>"}'::jsonb,
    body:='{"is_cron":true}'::jsonb
  ) as request_id;
  $$
);

# 5. Configurar webhook no Meta Developer Console (ver docs/META_DEVCONSOLE_GUIDE.md)
```
