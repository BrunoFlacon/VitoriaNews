## Diagnóstico

Investigação revelou três classes de problemas que travam atualizações e captação:

### 1. Schema incompleto vs. código
Edge functions e UI referenciam tabelas/colunas que **não existem**:

| Referência no código | Status |
|---|---|
| `bot_settings` | ❌ Não existe (erro `PGRST205` no console) |
| `meta_ads_campaigns` | ❌ Não existe (`get-analytics` quebra) |
| `google_analytics_data` | ❌ Não existe |
| `youtube_analytics` | ❌ Não existe |
| `eventos_de_ataque` | ❌ Não existe |
| `social_accounts.views/likes/shares/comments/cover_photo/subscribers_count/metadata` | ❌ Colunas faltam (sync-social-data quebra) |
| `account_metrics.platform/views/likes/shares/comments` | ❌ Colunas faltam |
| `post_metrics.external_id/content/published_at/media_url/media_type/performance_score` | ❌ Colunas faltam (collect-social-analytics quebra) |
| `messaging_channels.online_count` | ❌ Coluna falta |
| `social_connections.cover_photo` | ❌ Coluna falta |
| `trends` UNIQUE em `keyword` | ❌ Upsert `onConflict: 'keyword'` falha |
| `trends` UNIQUE em `(keyword, source)` | ❌ Upsert do `collect-google-trends` falha |
| `social_accounts` UNIQUE em `(user_id, platform, platform_user_id)` | ❌ Upsert quebra |
| `post_metrics` UNIQUE em `(user_id, platform, external_id)` | ❌ Upsert quebra |

### 2. Coletores que retornam dados falsos
`meta.ts`, `tiktok.ts`, `messaging.ts`, `alt-social.ts` (parcial), `x-twitter.ts` (fallback) inserem **mocks hardcoded** ("Marketing Intelligence", "Sustentabilidade", "Vida Sustentável", "Viral Challenge BR") — poluindo o radar com dados fictícios.

### 3. Sem agendamento automático
Não há `cron.job` ativo — coletas só rodam quando o usuário clica manualmente em "Sincronizar". `pg_cron` e `pg_net` precisam ser habilitados e agendamentos criados.

---

## Plano de Correção

### Etapa 1 — Migração de schema (uma única migração)

**Adicionar colunas faltantes** (ALTER TABLE … ADD COLUMN IF NOT EXISTS, sem apagar dados):

- `social_accounts`: `views BIGINT DEFAULT 0`, `likes BIGINT DEFAULT 0`, `shares BIGINT DEFAULT 0`, `comments BIGINT DEFAULT 0`, `cover_photo TEXT`, `subscribers_count INTEGER DEFAULT 0`, `metadata JSONB DEFAULT '{}'`, `is_connected BOOLEAN DEFAULT true`, `followers_count INTEGER DEFAULT 0`, `page_id TEXT`, `page_name TEXT`
- `account_metrics`: `platform TEXT`, `views BIGINT DEFAULT 0`, `likes BIGINT DEFAULT 0`, `shares BIGINT DEFAULT 0`, `comments BIGINT DEFAULT 0`
- `post_metrics`: `external_id TEXT`, `content TEXT`, `published_at TIMESTAMPTZ`, `media_url TEXT`, `media_type TEXT`, `performance_score NUMERIC DEFAULT 0`
- `messaging_channels`: `online_count INTEGER DEFAULT 0`
- `social_connections`: `cover_photo TEXT`, `views BIGINT DEFAULT 0`, `likes BIGINT DEFAULT 0`, `shares BIGINT DEFAULT 0`, `comments BIGINT DEFAULT 0`, `subscribers_count INTEGER DEFAULT 0`

**Constraints UNIQUE para upserts funcionarem**:
- `social_accounts (user_id, platform, platform_user_id)`
- `post_metrics (user_id, platform, external_id)` (parcial: WHERE external_id IS NOT NULL)
- `trends (user_id, keyword, source)` (compatível com ambos coletores)

**Tabelas novas com RLS owner-scoped**:
- `bot_settings (user_id, settings JSONB, …)` — owner-only
- `meta_ads_campaigns (user_id, campaign_id, name, impressions, reach, clicks, amount_spent, date, …)` — owner-only
- `google_analytics_data (user_id, property_id, metric_name, metric_value, dimension_value, date, …)` — owner-only
- `youtube_analytics (user_id, channel_id, video_id, views, likes, comments, subscribers_gained, estimated_minutes_watched, date, …)` — owner-only
- `eventos_de_ataque (user_id, tipo, descricao, plataforma, severity, detectado_em, metadata, …)` — owner-only

Todas com RLS, política `auth.uid() = user_id` para SELECT/INSERT/UPDATE/DELETE.

### Etapa 2 — Coletores reais (substituir mocks)

- **`meta.ts`**: buscar Page Insights reais via `graph.facebook.com/v21.0/{pageId}/insights`; remover mocks. Se sem credencial, retornar `[]`.
- **`tiktok.ts`**: buscar trending hashtags via Creative Center público (RSS/JSON); remover mocks. Se falhar, `[]`.
- **`messaging.ts`**: derivar do banco (`messaging_channels` ordenado por `members_count`); remover mock WhatsApp.
- **`alt-social.ts`**: manter Reddit (já real); remover mocks Kwai/Rumble.
- **`x-twitter.ts`**: manter API real; remover fallback hardcoded.

### Etapa 3 — Padronização do client Supabase nas edge functions

Trocar imports `@supabase/supabase-js` (sem URL) por `https://esm.sh/@supabase/supabase-js@2` em `meta.ts` (atualmente quebra deploy).

### Etapa 4 — Agendamento automático (pg_cron + pg_net)

Habilitar extensões e criar cron jobs (via insert tool, não migração):
- `collect-social-analytics` a cada 30 min
- `radar-api/sync-intelligence` a cada 1 hora  
- `collect-google-trends` a cada 2 horas
- `refresh-social-token` diariamente
- `process-job-queue` a cada 1 min
- `worker_collect_metrics()` a cada 15 min
- `enqueue_scheduled_posts()` a cada 1 min

### Etapa 5 — Frontend

- `RobotBuilder.tsx`, `FloatingWhatsApp.tsx`, `useSocialStats.ts`, `NotificationContext.tsx`: passam a funcionar automaticamente quando `bot_settings` existir (sem mudança de código necessária além de regenerar types).
- `useTrends.ts`: nenhum ajuste — já usa `radar-api`.

---

## Arquivos modificados

**Migração (1 arquivo)**: schema completo  
**Edge functions reescritas**:
- `supabase/functions/_shared/automation/collectors/meta.ts`
- `supabase/functions/_shared/automation/collectors/tiktok.ts`
- `supabase/functions/_shared/automation/collectors/messaging.ts`
- `supabase/functions/_shared/automation/collectors/alt-social.ts`
- `supabase/functions/_shared/automation/collectors/x-twitter.ts`

**Insert SQL (cron jobs)**: 1 chamada via insert tool

---

## Garantias

- ✅ Nenhum `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` ou `DELETE` — só `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`
- ✅ Dados existentes preservados
- ✅ RLS owner-scoped em todas as novas tabelas
- ✅ Pronto para receber novas APIs: bastará criar credencial em `api_credentials` ou conexão em `social_connections` que os coletores capturam automaticamente
- ✅ Schema 100% compatível com o código atual de `get-analytics`, `collect-social-analytics`, `sync-social-data`, `radar-api`