# Guia de Configuração — Meta Developer Console

Passo a passo para configurar Webhooks e Tokens no Meta Developer Console.

---

## 1. Pré-requisitos

Antes de começar, configure estas variáveis de ambiente no Supabase:

| Variável | Onde obter | Obrigatório para |
|----------|-----------|------------------|
| `META_APP_ID` | Meta Dev Console > Configurações > Básico | Refresh Facebook/Instagram, validação webhook |
| `META_APP_SECRET` | Meta Dev Console > Configurações > Básico | Refresh Facebook/Instagram |
| `WEBHOOK_VERIFY_TOKEN` | Defina um valor seguro qualquer (ex: `vitoria_net_omni_secure`) | Validação do webhook Meta |
| `GOOGLE_CLIENT_ID` | Google Cloud Console > Credenciais | Refresh tokens Google/YouTube |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console > Credenciais | Refresh tokens Google/YouTube |
| `TWITTER_CONSUMER_KEY` | Twitter Developer Portal | Refresh tokens Twitter |
| `TWITTER_CONSUMER_SECRET` | Twitter Developer Portal | Refresh tokens Twitter |

### Como configurar no Supabase

```bash
# Via Supabase CLI:
supabase secrets set META_APP_ID=seu_app_id
supabase secrets set META_APP_SECRET=seu_app_secret
supabase secrets set WEBHOOK_VERIFY_TOKEN=seu_token_seguro
supabase secrets set GOOGLE_CLIENT_ID=seu_google_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=seu_google_client_secret
supabase secrets set TWITTER_CONSUMER_KEY=seu_twitter_key
supabase secrets set TWITTER_CONSUMER_SECRET=seu_twitter_secret

# Ou via Dashboard do Supabase:
# Settings > API > Environment Variables > Adicionar
```

---

## 2. Registrar o Webhook Unificado da Meta

A Edge Function `meta-webhook` gerencia **WhatsApp**, **Facebook Page** e **Instagram** em um único endpoint.

### 2.1 Acessar o Meta Developer Console

1. Acesse [https://developers.facebook.com/apps/](https://developers.facebook.com/apps/)
2. Selecione seu aplicativo Meta (ou crie um novo: **Criar Aplicativo** > **Empresa**)
3. Adicione os produtos necessários:
   - **Webhooks** (produto básico)
   - **WhatsApp** (se for usar WhatsApp Business)
   - **Facebook Login** (se precisar de login com Facebook)
   - **Instagram Basic Display** (se for usar Instagram)

### 2.2 Configurar o Webhook

1. No menu esquerdo, vá em **"Webhooks"**
2. Clique em **"Adicionar Webhook"** se não existir
3. Configure:

   ```
   ┌──────────────────────────────────────────────────────────┐
   │ URL de Callback:                                         │
   │ https://SEU_PROJETO.supabase.co/functions/v1/meta-webhook│
   │                                                          │
   │ Token de Verificação:                                    │
   │ [O MESMO valor de WEBHOOK_VERIFY_TOKEN configurado       │
   │  nas env vars do Supabase]                               │
   └──────────────────────────────────────────────────────────┘
   ```

4. Clique em **"Verificar e Salvar"**
5. Se a verificação falhar:
   - Confirme que o `WEBHOOK_VERIFY_TOKEN` nas env vars do Supabase é **exatamente igual** ao informado
   - A função `meta-webhook` já está deployed? Execute: `supabase functions deploy meta-webhook`
   - Teste manualmente: `curl "https://SEU_PROJETO.supabase.co/functions/v1/meta-webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=123"`

### 2.3 Assinar Campos por Plataforma

Após verificado, você precisa assinar os campos que cada plataforma usará:

#### WhatsApp Business
1. Vá em **"WhatsApp"** > **"Configuração da API"**
2. Na seção **"Webhooks"**, clique em **"Editar Assinatura"**
3. Marque: `messages`, `message_deliveries`, `message_reads`

#### Facebook Page
1. Volte em **"Webhooks"** > **"Página"**
2. Clique em **"Editar Assinatura"**
3. Marque: `feed`, `messages`, `messaging_postbacks`, `leadgen`

#### Instagram
1. Em **"Webhooks"** > **"Instagram"**
2. Clique em **"Editar Assinatura"**
3. Marque: `comments`, `messaging`, `mentions`, `messaging_optins`

---

## 3. Conectar WhatsApp Business (Uso Próprio)

O **Embedded Signup** está deprecated pela Meta. Use **"Uso Próprio"** (Business API):

### 3.1 Gerar Token de Acesso Permanente

1. Vá em **"WhatsApp"** > **"Configuração da API"** no Meta Dev Console
2. Selecione seu WABA (WhatsApp Business Account)
3. Anote o **WABA ID** e **Phone Number ID**
4. Gere um Token de Acesso:
   - Vá em **"Ferramentas"** > **"Graph API Explorer"**
   - Selecione seu aplicativo
   - Selecione **"System User"** ou **"Page Token"**
   - Escopo: `whatsapp_business_messaging`, `whatsapp_business_management`
   - Gere token e clique em **"Estender Token"** (60 dias)

### 3.2 Configurar no Sistema

No painel **APIs Sociais & Dev**, plataforma **WhatsApp**, preencha:

```
Access Token:    [token gerado no passo anterior]
WABA ID:         [WhatsApp Business Account ID]
Phone Number ID: [Phone Number ID]
App ID:          [ID do seu aplicativo Meta]
```

---

## 4. Criar Aplicação Instagram Basic Display

Para conectar Instagram Basic Display (visualização de perfil público):

1. No Meta Dev Console, adicione o produto **"Instagram Basic Display"**
2. Vá em **"Instagram Basic Display"** > **"Configuração"**
3. Adicione a URL de redirecionamento OAuth:
   ```
   https://SEU_PROJETO.supabase.co/functions/v1/social-oauth-callback
   ```
4. Anote o **Instagram App ID** e **Instagram App Secret**
5. No sistema, configure as credenciais do Instagram com esses valores

---

## 5. Conectar Facebook Page

1. No Meta Dev Console, adicione **"Facebook Login"**
2. Vá em **"Facebook Login"** > **"Configurações"**
3. Adicione a URL de redirecionamento OAuth:
   ```
   https://SEU_PROJETO.supabase.co/functions/v1/social-oauth-callback
   ```
4. No sistema, a conexão é feita via OAuth no botão **"Conectar Facebook"**

---

## 6. Verificar se o Webhook Está Funcionando

### 6.1 Teste via API

```bash
curl -H "Authorization: Bearer SEU_TOKEN_SUPABASE" \
  "https://SEU_PROJETO.supabase.co/functions/v1/webhook-health?platform=meta&userId=SEU_USER_ID"
```

Resposta esperada:
```json
{
  "success": true,
  "webhooks": {
    "meta": {
      "configured": true,
      "healthy": true,
      "details": "WEBHOOK_VERIFY_TOKEN configurado | META_APP_ID=123456..."
    }
  }
}
```

### 6.2 Teste via Telegram

```bash
curl -H "Authorization: Bearer SEU_TOKEN_SUPABASE" \
  "https://SEU_PROJETO.supabase.co/functions/v1/webhook-health?platform=telegram&userId=SEU_USER_ID"
```

### 6.3 Verificar na Interface

No painel **APIs Sociais & Dev**, ao lado do nome de cada plataforma com webhook, há um badge:
- ✅ **Webhook Ativo** — configurado e saudável
- ⚠️ **Não Configurado** — env vars faltando ou webhook não registrado
- ❌ **Webhook com Erro** — configurado mas com problemas

Clique no badge para re-verificar o status.

---

## 7. Fluxo Completo de Dados

```
Meta envia evento → meta-webhook (Edge Function) → processOmnichannelMessage
       ↓
  Mensagens armazenadas em `messages` / `messaging_channels`
       ↓
collect-social-analytics (CRON 4h ou manual) → busca métricas
       ↓
  social_accounts (perfil atual)
  account_metrics (série temporal)
  post_metrics (posts individuais)
       ↓
get-analytics (Edge Function) → analytics UI
```

---

## 8. Resolução de Problemas

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| Webhook não verifica | `WEBHOOK_VERIFY_TOKEN` diferente | Confirme valores idênticos nas env vars e no formulário |
| Meta retorna 403 no callback | URL do webhook incorreta | Verifique URL: `.../functions/v1/meta-webhook` |
| WhatsApp não envia eventos | Assinatura de campos não configurada | Marque `messages` nas configurações do WhatsApp |
| Instagram não envia eventos | Token Instagram inválido | Reconecte o perfil do Instagram |
| Token Facebook/Instagram expira | `META_APP_ID`/`META_APP_SECRET` faltando | Configure env vars e deploy `refresh-tokens-cron` |
| Threads não atualiza métricas | Threads não tem refresh token | Reconecte manualmente a cada 60 dias |
| Coleta não funciona | Token expirado + sem auto-refresh | Verifique badge de expiração no ConnectionCard |
