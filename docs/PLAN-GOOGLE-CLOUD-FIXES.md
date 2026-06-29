# Plano de Correção — Google Cloud Services

## Diagnóstico Geral

| Serviço | Chave | SyncFn | Status |
|---------|-------|--------|--------|
| Maps API | `maps_api_key` | `null` | ✅ Config-only (sem dados a coletar) |
| News API | `news_api_key` | `radar-api` | 🔴 Crash — `discoverTrends` não importado |
| ~~YouTube API~~ | ~~`youtube_api_key`~~ | ~~`collect-youtube-analytics`~~ | ♻️ Removido — usar aba YouTube separada |
| Google Ads | `ads_id` | `collect-meta-ads-analytics` | 🔴 ERRADO — coleta Meta Ads, não Google Ads |
| Analytics | `analytics_id` | `collect-google-analytics` | 🟡 Funciona, mas com bugs |
| Search Console | `search_console_id` | `collect-search-console-data` | 🔴 Duplicatas + sem exibição no frontend |
| People API | `people_api_key` | `sync-google-contacts` | 🟡 Funciona, sem sync global |

---

## 1. 🔴 CRITICAL — News API: `radar-api` crash

**Arquivo**: `supabase/functions/radar-api/index.ts:111`

**Problema**: `discoverTrends()` é chamado mas **nunca foi importado**. O arquivo importa `detectCoordinatedAttack` via import dinâmico (linha 126), mas `discoverTrends` (linha 111) não tem import.

**Correção**: Adicionar import no topo do arquivo:
```ts
import { discoverTrends } from '../_shared/radar/discover-trends.ts';
```
Verificar se o arquivo `_shared/radar/discover-trends.ts` existe. Se não existir, criar ou substituir por implementação que consulta `news_api_key` da `api_credentials` e faz scraping/fetch de fontes reais de notícias.

---

## 2. 🔴 CRITICAL — "Google Ads" coleta Meta Ads

**Arquivos**:
- `APITab.tsx:313` — card "Google Ads" com `syncFn: 'collect-meta-ads-analytics'`
- `AdvancedAnalytics.tsx:467` — card "Google Ads" exibindo `adsStats` do Meta
- `useAnalytics.ts:78` — tipo `adsStats` sem distinção Google vs Meta

**Problema**: O serviço "Google Ads" (Google AdWords) está usando a edge function `collect-meta-ads-analytics` que consulta a **Graph API do Facebook** (`graph.facebook.com/v21.0`). Google Ads tem API própria (`googleads.googleapis.com`).

**Correção**:
1. Criar edge function `collect-google-ads-analytics` que usa Google Ads API
2. Em `APITab.tsx`, trocar `syncFn` de `collect-meta-ads-analytics` para `collect-google-ads-analytics`
3. Em `AdvancedAnalytics.tsx`, separar card "Google Ads" de `meta_ads_campaigns` (Meta Ads)
4. Em `useAnalytics.ts`, renomear/tipar `adsStats` para evitar ambiguidade

---

## 3. 🟡 MÉDIO — Search Console sem display + duplicatas

**Arquivos**:
- `supabase/functions/collect-search-console-data/index.ts:117` — `.insert()` sem dedup
- `supabase/functions/collect-search-console-data/index.ts:203-205` — `avgPosition` quebrado
- `SettingsView.tsx:376-379` — não incluso no sync global

**Problemas**:
1. Usa `.insert()` em vez de `.upsert()` → duplicatas a cada sync
2. `rows.length` em `results[0].rows` (que é número, não array)
3. Dados salvos mas **nunca exibidos** em analytics
4. Nunca sincronizado no sync global

**Correção**:
1. Migrar para `upsert` com `onConflict` adequado
2. Consertar cálculo de `avgPosition`
3. Adicionar card "Google Search Console" no `AdvancedAnalytics.tsx`
4. Adicionar `collect-search-console-data` no sync global em `SettingsView.tsx`

---

## 4. 🟡 MÉDIO — Google Analytics com bugs

**Arquivo**: `supabase/functions/collect-google-analytics/index.ts`

**Problemas**:
1. `onConflict: "user_id,property_id,metric_name,date"` mas **não existe unique constraint** na tabela `google_analytics_data`
2. `startDate = "2020-01-01"` em todo sync → refetch desnecessário de 6+ anos de histórico
3. Apenas 3 métricas coletadas (activeUsers, sessions, screenPageViews)

**Correção**:
1. Criar migration SQL com unique constraint
2. Usar `lastSyncedAt` para sync incremental
3. Adicionar bounceRate, conversions, eventCount, etc.

---

## 5. 🟢 BAIXO — People API sem sync global + sem paginação

**Arquivo**: `supabase/functions/sync-google-contacts/index.ts`

**Problemas**:
1. Sem sync global (não incluso em `SettingsView.tsx:376-379`)
2. Sem paginação para listas > 200 contatos
3. Sem validação de escopo OAuth

**Correção**:
1. Adicionar ao sync global
2. Implementar paginação com `pageToken`
3. Validar escopo `contacts` antes de chamar People API

---

## 6. ✅ Maps API — Nenhuma ação necessária

Maps API é **config-only**: armazena a chave da API Google Maps. Não há dados analíticos a coletar nem exibição em dashboard. O usuário usa a chave em outras partes do sistema (ex: mapas no frontend).

---

## 7. 🟡 VERIFICAÇÃO — Google Workspace / OAuth Client (plataforma `google`)

### O que é
Gateway OAuth que obtém o token de acesso usado por **todas** as edge functions Google (GA, Search Console, People, YouTube). Sem ele, nenhuma coleta de dados Google funciona.

### Fluxo a verificar

```
Settings → Conectar Google Workspace
  → social-oauth-init
    → valida client_id + client_secret (DB ou env vars)
    → gera URL: https://accounts.google.com/o/oauth2/v2/auth
      ?scope=youtube.upload+youtube+business.manage+openid+profile+email
      &access_type=offline&prompt=consent
    → usuário autoriza no popup
  → redireciona para /oauth/callback/google
    → social-oauth-callback → exchangeGoogle()
    → POST https://oauth2.googleapis.com/token (code → token)
    → GET /oauth2/v2/userinfo (dados do usuário)
    → GET /youtube/v3/channels?mine=true (canais YouTube)
    → upsert em social_connections + social_accounts
    → token armazenado com refresh_token
```

### Testes de verificação

#### Teste 1: Init gera URL correta
```ts
// Simular chamada a social-oauth-init com platform=google
// Verificar se authUrl contém:
const url = new URL(authUrl);
url.origin === 'https://accounts.google.com';
url.pathname === '/o/oauth2/v2/auth';
url.searchParams.get('access_type') === 'offline';
url.searchParams.get('prompt') === 'consent';
url.searchParams.get('scope').includes('youtube');
url.searchParams.get('scope').includes('business.manage');
```

#### Teste 2: Callback troca token
```ts
// Simular exchangeGoogle() com code mock
// Verificar:
// - POST 200 para https://oauth2.googleapis.com/token
// - access_token não vazio
// - refresh_token presente (access_type=offline)
// - userinfo retorna name/email/picture
// - youtube/channels retorna lista
```

#### Teste 3: Token armazenado corretamente
```sql
SELECT * FROM social_connections 
WHERE platform = 'google' 
  AND user_id = <id>
  AND is_connected = true
  AND access_token IS NOT NULL
  AND refresh_token IS NOT NULL
  AND token_expires_at > NOW();
```

#### Teste 4: Refresh automático funciona
```sql
-- Verificar cron job registrado
SELECT * FROM cron.job WHERE function_name = 'refresh-tokens-cron';

-- Verificar logs de refresh
SELECT * FROM oauth_logs 
WHERE provider = 'google' 
  AND stage = 'refresh' 
  AND created_at > NOW() - INTERVAL '7 days';
```

#### Teste 5: Token é usado downstream
Para cada edge function consumidora, confirmar que ela encontra o token:
```sql
-- collect-google-analytics: busca social_connections platform='google'
-- collect-search-console-data: busca social_connections platform='google'
-- sync-google-contacts: busca social_connections platform IN ('google','youtube')
```

### Pontos de falha conhecidos

| # | Problema | Impacto |
|---|----------|---------|
| 1 | `client_id`/`client_secret` não configurados nem no DB nem nas env vars | 🔴 Init/callback quebram |
| 2 | Usuário não autorizou todos os escopos necessários | 🟡 People API falha com 403 |
| 3 | `refresh_token` não foi emitido (usuário já havia autorizado antes sem `prompt=consent`) | 🟡 Token expira em 1h |
| 4 | Env vars `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` foram rotacionadas no Google Cloud Console | 🔴 Refresh token rejeitado |
| 5 | CORS: redirect_uri não registrado no Google Cloud Console | 🔴 Google rejeita o redirect |

---

## 8. 🟢 BAIXO — Integração Google Trends no PowerRadar

**Arquivo**: `src/components/dashboard/PowerRadar.tsx:242`

O PowerRadar já tem suporte a `"google"` como fonte de trends. Verificar se o coletor de trends realmente consulta a API Google Trends (ou se é placeholder).

**Correção**: Se não existir, implementar coletor Google Trends ou substituir por feed RSS do Google News.

---

## Ordem de Implantação

| Prioridade | Tarefa | Esforço | Status |
|------------|--------|---------|--------|
| **P0** | Verificar OAuth flow (Testes 1-5 acima) | **1h** | 🔄 Pendente |
| P0 | Corrigir import `discoverTrends` no `radar-api` | 30min | ✅ Feito |
| P0 | Separar Google Ads de Meta Ads (remover card) | 1h | ✅ Feito (card removido, renomeado) |
| P1 | Consertar Search Console (upsert + avgPosition + display + sync global) | 3h | ✅ Feito |
| P1 | Unique constraint + sync incremental no GA | 2h | ✅ Feito (constraint já existe em migration, incremental adicionado) |
| P2 | People API: sync global + paginação | 2h | 🔄 Sync global adicionado, paginação pendente |
| P2 | Integração Google Trends no PowerRadar | 2h | 🔄 Pendente |
| P3 | Deploy de todas as edge functions corrigidas | 1h | 🔄 Bloqueado (CLI indisponível) |
| P1 | Sync incremental no Search Console | 1h | ✅ Feito |
