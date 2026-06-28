# Plano de Atualização da API do WhatsApp

## Sumário Executivo

**Data**: 25/06/2026
**Projeto**: Social Canvas Hub
**Status**: Auditoria concluída — 3 gargalos críticos identificados

---

## 1. Diagnóstico Atual

### 1.1 Conexões WhatsApp
| Item | Status | Detalhes |
|------|--------|----------|
| 12 contas conectadas | ✅ | `social_connections` com tokens válidos |
| Tokens expirando | ✅ | Todos `token_expires_at > NOW()` |
| `api_credentials` sem token | ❌ | Apenas `app_id`, sem `access_token`, `phone_number_id`, `waba_id` |
| Fotos de perfil | ❌ | Banco limpo, API não retorna `profile_photo_url` |
| Métricas (seguidores/posts) | ❌ | WhatsApp API não expõe estes campos |

### 1.2 Cadeia de Funcionamento
```
OAuth → social_connections(token) → collect-social-analytics(métricas)
                                    → sync-social-data(fotos/nome)
                                    → publish-post(enviar msg)
                                    → bot-engine(responder automático)
                                    → meta-webhook(receber msgs)
```

### 1.3 Gargalos Identificados

#### Gargalo 1: `api_credentials` sem token (CRÍTICO)
**Problema**: O WhatsApp OAuth guarda o token em `social_connections` mas nunca replica para `api_credentials`. Funções que lêem de `api_credentials` (como `whatsapp-media-proxy`, `handle-new-subscriber`, `getMetaCredentials()`) não conseguem autenticar.

**Impacto**: 
- `whatsapp-media-proxy` não baixa mídia
- `handle-new-subscriber` não envia welcome messages
- `publish-post` via dispatcher falha se não achar token em `social_connections`
- Bot Engine usa `META_SYSTEM_USER_TOKEN` (env var) — funcional, mas frágil

#### Gargalo 2: Fotos de perfil não retornadas pela API (MÉDIO)
**Problema**: O endpoint `GET /{waba_id}/phone_numbers?fields=profile_photo_url` não retorna URL de foto para nenhum dos 12 números. Possíveis causas:
- Números não têm foto personalizada no WhatsApp Manager
- Token sem escopo `whatsapp_business_management` suficiente
- API v21.0 pode ter mudado o campo

**Impacto**: Cards do WhatsApp no dashboard ficam sem foto (ícone genérico)

#### Gargalo 3: Webhook não verificado (MÉDIO)
**Problema**: Não foi possível verificar se o `meta-webhook` está configurado no painel da Meta Developer para receber mensagens do WhatsApp.

**Impacto**: Mensagens recebidas podem não estar sendo processadas pelo bot

---

## 2. Plano de Correção

### Fase 1: Sincronizar Credenciais (Prioridade Máxima)

**O que**: Criar função que copia tokens do `social_connections` para `api_credentials` após OAuth.

**Arquivos**: `supabase/functions/social-oauth-callback/index.ts`

**Mudança**: Após o `exchangeMeta()` salvar em `social_connections`, também fazer upsert em `api_credentials`:

```typescript
// Após salvar em social_connections (linha ~516)
await supabase.from("api_credentials").upsert({
  user_id: user.id,
  platform: "whatsapp",
  credentials: {
    app_id: formattedCreds.app_id,
    access_token: result.accessToken,
    phone_number_id: result.phoneNumberId || "",
    waba_id: result.platformUserId,
  }
}, { onConflict: "user_id,platform" });
```

**Teste**: Rodar `collect-social-analytics` e verificar se `api_credentials` passa a ter token.

### Fase 2: Forçar Busca de Fotos (Alta Prioridade)

**Opção A — WhatsApp Business Profile (recomendado)**: 
Trocar a ordem de fallback em `collect-social-analytics` e `sync-social-data`:
1. Primeiro: `GET /{waba_id}/whatsapp_business_profile?fields=profile_picture_url`
2. Segundo: `GET /{waba_id}/phone_numbers?fields=profile_photo_url`

**Opção B — Upload manual para Storage**:
Se a API não retornar foto, permitir upload manual via dashboard.

**Opção C — Meta Graph API direct fetch**:
Usar `GET /{phone_number_id}` com field `profile_photo_url` (nível de phone number, não WABA).

### Fase 3: Webhook e Mensagens (Alta Prioridade)

**O que**: Verificar/criar webhook no Meta Developer Console.

**URL do webhook**: `https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/meta-webhook`
**Verify Token**: Definido como env var `WEBHOOK_VERIFY_TOKEN` no Supabase.

**Passos**:
1. Acessar: https://developers.facebook.com/apps/761709995404176/webhooks/
2. Adicionar produto "WhatsApp Business Account"
3. Configurar callback URL: `https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/meta-webhook`
4. Inserir Verify Token (igual ao configurado no Supabase)
5. Inscrever nos campos: `messages`, `message_deliveries`, `message_reads`

### Fase 4: Métricas do WhatsApp (Média Prioridade)

**O que**: WhatsApp não expõe seguidores/posts como redes sociais. Alternativas:

| Métrica | Fonte | Status |
|---------|-------|--------|
| Total de conversas | `GET /{waba_id}/analytics` | Já implementado (best-effort, 5s timeout) |
| Total de mensagens enviadas | Webhook events + `messages` table | Não implementado |
| Contatos ativos | `messages` table (distinct recipient_phone) | Não implementado |
| Taxa de resposta | Bot replies / total received | Não implementado |

**Implementar**: Nova função `whatsapp-analytics` que consulta a `messages` table e retorna:
- Total de mensagens por status (draft, scheduled, sent, failed)
- Total de mensagens do bot vs manual
- Contatos únicos
- Mensagens nos últimos 7/30 dias

### Fase 5: BotZap e Mensagens do Sistema (Média Prioridade)

**O que**: O script `scripts/Bot_Zap/silencio_whatsapp.js` é um script Node.js local que gerencia silêncio do bot. Para funcionar em produção, precisa ser integrado ao backend.

**Problema**: O script roda localmente e gerencia `silencio_chats.json`. Em produção (servidor), este arquivo não persiste.

**Solução**: Migrar lógica de silêncio para o `bot_settings` (já existe tabela com `silence_duration_hours`) e armazenar chats silenciados no banco.

---

## 3. Funções Envolvidas

| Função | Versão Atual | O que faz | Precisa de ajuste |
|--------|-------------|-----------|-------------------|
| `social-oauth-callback` | última | Troca código OAuth por token | ✅ Sincronizar credenciais |
| `collect-social-analytics` | v115 | Coleta métricas | ✅ Fallback de foto |
| `sync-social-data` | v45 | Sincroniza dados | ✅ Fallback de foto |
| `meta-webhook` | última | Recebe msgs do WhatsApp | ✅ Verificar inscrição |
| `publish-post` | v27 | Publica conteúdo | ⚠️ Verificar token |
| `bot-engine` | última | Respostas automáticas | ✅ Migrar silêncio pra DB |
| `whatsapp-media-proxy` | última | Proxy de mídia | ⚠️ Token api_credentials |
| `handle-new-subscriber` | última | Welcome messages | ⚠️ Token system_settings |

---

## 4. Próximos Passos

### Imediatos (hoje)
1. ✅ Corrigir `profile_picture` em `social_connections` — NÃO cair no cache do Media Relay
2. ✅ Corrigir `sync-social-data` e `collect-social-analytics` para atualizar ambas as colunas
3. ✅ Resetar banco de dados (fotos WhatsApp = NULL)
4. ✅ Rodar SQL para sincronizar tokens do `social_connections` para `api_credentials`
5. ✅ social-oauth-callback: sync credentials pós-OAuth
6. ✅ Fallback foto: whatsapp_business_profile primeiro em ambas as functions
7. ⬜ Deploy functions (social-oauth-callback, collect-social-analytics, sync-social-data, whatsapp-analytics)

### Curto Prazo (esta semana)
5. ⬜ Verificar webhook no Meta Developer Console
6. ⬜ Testar envio de mensagem via `publish-post` para WhatsApp
7. ⬜ Criar `whatsapp-analytics` function para métricas baseadas em `messages` table
8. ⬜ Migrar `silencio_whatsapp.js` para usar o banco de dados

### Médio Prazo (próximas semanas)
9. ⬜ Upload manual de foto de perfil WhatsApp
10. ⬜ Implementar dashboard de métricas do WhatsApp (conversas, taxa de resposta)
11. ⬜ Testar bot端-2-end: receber msg → processar → responder

---

## 5. SQL para Sincronizar Credenciais

Execute este SQL no Supabase SQL Editor para copiar os tokens do OAuth para `api_credentials`:

```sql
-- Sincronizar tokens do WhatsApp de social_connections para api_credentials
INSERT INTO api_credentials (user_id, platform, credentials, created_at, updated_at)
SELECT 
  user_id,
  'whatsapp' as platform,
  jsonb_build_object(
    'app_id', '761709995404176',
    'access_token', access_token,
    'phone_number_id', '',
    'waba_id', platform_user_id
  ) as credentials,
  NOW() as created_at,
  NOW() as updated_at
FROM social_connections
WHERE platform = 'whatsapp'
  AND is_connected = true
  AND access_token IS NOT NULL
ON CONFLICT (user_id, platform) 
DO UPDATE SET 
  credentials = jsonb_build_object(
    'app_id', '761709995404176',
    'access_token', EXCLUDED.credentials->>'access_token',
    'phone_number_id', COALESCE(api_credentials.credentials->>'phone_number_id', ''),
    'waba_id', EXCLUDED.credentials->>'waba_id'
  ),
  updated_at = NOW();
```

---

## 6. Referências

- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Webhook Setup](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- [WhatsApp Phone Numbers API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/phone-numbers)
- [WhatsApp Business Profile API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/business-profiles)
- [Meta OAuth Scopes](https://developers.facebook.com/docs/permissions/reference)
