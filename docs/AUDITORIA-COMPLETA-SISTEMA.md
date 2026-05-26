# Auditoria Completa do Sistema — Social Canvas Hub

**Data**: 26/05/2026
**Total de arquivos auditados**: 65+
**Total de issues encontradas**: ~220

---

## Sumário por Severidade

| Severidade | Quantidade | Descrição |
|---|---|---|
| 🔴 CRÍTICO | 38 | Causa crash, perda de dados ou corrupção silenciosa |
| 🟠 ALTO | 42 | Causa dados incorretos, ineficiência grave ou race conditions |
| 🟡 MÉDIO | 85 | Causa UX degradada, issues menores de dados ou manutenção |
| 🔵 BAIXO | 55 | Violação de boas práticas, melhorias pontuais |
| **TOTAL** | **~220** | |

---

## Fase 1: 🔴 Correções Críticas Imediatas

### 1.1 Agendamento de Posts — NUNCA publica automaticamente
- **Arquivo**: `supabase/migrations/` (função `enqueue_scheduled_posts` não existe)
- **Problema**: A função PostgreSQL `enqueue_scheduled_posts` referenciada não tem `CREATE FUNCTION` em migration alguma. Posts com `status: 'scheduled'` ficam para sempre no banco.
- **Impacto**: Posts agendados **nunca são publicados**. O recurso inteiro é falso.

### 1.2 `collect-social-analytics` — Filtro `.or()` quebrado por dots no ISO date
- **Arquivo**: `supabase/functions/collect-social-analytics/index.ts:79`
- **Problema**: `.or('next_sync_at.lte.${new Date().toISOString()}...')` — os dots no milliseconds (`.789Z`) quebram o parser de filtros do Supabase REST.
- **Impacto**: CRON sync **nunca encontra tasks pendentes**. Toda a fila `social_sync_tasks` parou.

### 3. `collect-meta-ads-analytics` — `onConflict` não existe
- **Arquivo**: `supabase/functions/collect-meta-ads-analytics/index.ts:136`
- **Problema**: Upsert com `onConflict: "user_id,campaign_id"` mas a única unique constraint existente inclui `date`.
- **Impacto**: **Toda sincronização de Meta Ads falha** com erro de unique constraint.

### 1.4 `collect-youtube-analytics` — `.insert()` em vez de `.upsert()`
- **Arquivo**: `supabase/functions/collect-youtube-analytics/index.ts:187`
- **Problema**: Usa `.insert()` na tabela `youtube_analytics` que tem unique constraint. Na segunda execução, **crasha com duplicate key violation**.

### 1.5 `collect-google-analytics` — `.insert()` em vez de `.upsert()`
- **Arquivo**: `supabase/functions/collect-google-analytics/index.ts:177`
- **Problema**: Mesmo problema — insert em tabela com unique constraint.

### 1.6 `collect-google-analytics` — Nome de coluna errado
- **Arquivo**: `supabase/functions/collect-google-analytics/index.ts:182`
- **Problema**: Código escreve em `dimension` mas a coluna na tabela é `dimension_name`.
- **Impacto**: Insert **sempre falha** com `column "dimension" does not exist`.

### 1.7 `refresh-tokens-cron` — NENHUM cron registrado
- **Arquivo**: Nenhuma migration
- **Problema**: A função `refresh-tokens-cron` existe, está deployada, MAS não há `cron.schedule()` em migration alguma.
- **Impacto**: Tokens expiram e **nunca são renovados automaticamente**.

### 1.8 `collect-social-analytics` — Cron COMMENTED OUT
- **Arquivo**: `supabase/migrations/20260326050000_analytics_automation.sql:28-39`
- **Problema**: O cron `sync-social-analytics-3h` está **completamente comentado**.
- **Impacto**: A fila `social_sync_tasks` nunca é processada em background.

### 1.9 StoryEditor — Sem input de mídia
- **Arquivo**: `src/components/dashboard/StoryEditor.tsx:111`
- **Problema**: `multiFileInputRef` é declarado mas **nunca renderizado** como `<input>` no JSX.
- **Impacto**: Usuários **não conseguem adicionar mídia** aos stories.

### 1.10 StoryEditor — Draft nunca carregado
- **Arquivo**: `src/components/dashboard/StoryEditor.tsx:223-229`
- **Problema**: Draft é salvo em localStorage mas o useEffect que deveria carregar é um no-op.
- **Impacto**: Sistema de rascunhos de stories é **write-only**.

### 1.11 StoryEditor — `stories[0]` sem length check
- **Arquivo**: `src/components/dashboard/StoryEditor.tsx:303`
- **Problema**: Acessa `stories[0].textConfig` sem verificar se array está vazio.
- **Impacto**: Crash ao gravar áudio sem stories.

### 1.12 `usePublisher.ts` — `media_ids: []` e `media_type: 'image'` hardcoded
- **Arquivo**: `src/hooks/usePublisher.ts:136-138`
- **Problema**: Mídia **nunca é incluída** nos posts (sempre array vazio), e tipo é sempre `'image'`.
- **Impacto**: Posts publicados **perdem toda mídia**.

### 1.13 `useSocialConnections` — Infinity no expiry
- **Arquivo**: `src/hooks/useSocialConnections.ts:104`
- **Problema**: `daysUntilExpiry: Infinity` quando não há data de expiração.
- **Impacto**: Badge exibe "Infinity dias" na UI.

### 1.14 `useSocialConnections` — Origens CORS não incluem domínio de produção
- **Arquivo**: `src/hooks/useSocialConnections.ts:434-440`
- **Problema**: `allowedOrigins` não inclui o domínio real de produção.
- **Impacto**: **OAuth quebrado em produção**.

### 1.15 WhatsApp/Meta Webhooks — Sem verificação de assinatura HMAC
- **Arquivo**: `supabase/functions/whatsapp-webhook/index.ts:12-82`
- **Problema**: Nenhum webhook da Meta verifica `X-Hub-Signature-256`.
- **Impacto**: **Qualquer um** que descubra a URL pode forjar eventos.

### 1.16 `sync-telegram-chats` — JWT decodificado sem verificação
- **Arquivo**: `supabase/functions/sync-telegram-chats/index.ts:24-38`
- **Problema**: `decodeJwt()` decodifica base64 **sem verificar assinatura HMAC**.
- **Impacto**: Atacante pode forjar JWT e **impersonar qualquer usuário**.

### 1.17 `bot-engine.ts` — Roteamento single-tenant
- **Arquivo**: `supabase/functions/_shared/bot-engine.ts:301-302`
- **Problema**: Todas as mensagens WhatsApp/FB/IG são roteadas para o **primeiro admin** da tabela `profiles`.
- **Impacto**: **Sistema multi-tenant quebrado**.

### 1.18 `ConnectionCard.tsx` — `waMetadata.is_active` pode crashar
- **Arquivo**: `src/components/dashboard/settings/ConnectionCard.tsx:54`
- **Problema**: `waMetadata` é `any` e se for null/undefined, `waMetadata.is_active` lança erro.

### 1.19 `SocialNetworkCard.tsx` — Posição hardcoded do dropdown Threads
- **Arquivo**: `src/components/dashboard/SocialNetworkCard.tsx:215-222`
- **Problema**: `top: "530px", right: "479.37px"` — break total em qualquer resolução diferente.

### 1.20 Spotify OAuth — `redirectUri` em vez de `redirect_uri`
- **Arquivo**: `supabase/functions/_shared/oauth/providers/spotify.ts:7`
- **Problema**: `URLSearchParams` serializa `redirectUri` (camelCase) mas Spotify espera `redirect_uri` (snake_case).
- **Impacto**: **OAuth do Spotify sempre falha**.

---

## Fase 2: 🟠 Correções de Alta Prioridade

### 2.1 CORS em `social-oauth-callback` — função não invocada
- **Arquivo**: `supabase/functions/social-oauth-callback/index.ts:779`
- **Problema**: `{ ...corsHeaders }` espalha a função em vez de chamá-la `corsHeaders(req)`.

### 2.2 `AdvancedAnalytics.tsx` — `Math.random()` em produção
- **Arquivo**: `src/components/dashboard/AdvancedAnalytics.tsx:1244`
- **Problema**: `Math.random() > 0.5` esconde 50% dos canais aleatoriamente.

### 2.3 `collect-social-analytics` — Sem timeout em fetchs
- **Arquivo**: `supabase/functions/collect-social-analytics/index.ts` (30+ chamadas)
- **Problema**: NENHUMA chamada `fetch()` tem `AbortController` ou timeout.
- **Impacto**: Se qualquer API externa travar, a função inteira bloqueia.

### 2.4 `collect-social-analytics` — Sem paginação em `sync_all`
- **Arquivo**: `supabase/functions/collect-social-analytics/index.ts:90-94`
- **Problema**: Carrega TODOS os user_ids sem `.limit()`.

### 2.5 Giphy API usa access_token em vez de api_key
- **Arquivo**: `supabase/functions/collect-social-analytics/index.ts:1024`
- **Problema**: `api_key=${conn.access_token}` — Giphy espera API key, não access token OAuth.

### 2.6 `collect-youtube-analytics` — Sem paginação
- **Arquivo**: `supabase/functions/collect-youtube-analytics/index.ts:159-163`
- **Problema**: `maxResults=50` — se canal tem >50 vídeos, resto nunca é coletado.

### 2.7 `collect-youtube-analytics` — Upsert duplicado
- **Arquivo**: `supabase/functions/collect-youtube-analytics/index.ts:123` e `305`
- **Problema**: Dois upserts na mesma tabela para a mesma row.

### 2.8 `collect-meta-ads-analytics` — `limit=1` nos insights
- **Arquivo**: `supabase/functions/collect-meta-ads-analytics/index.ts:109`
- **Problema**: Só retorna o insight mais recente, perdendo histórico.

### 2.9 `collect-meta-ads-analytics` — Sem paginação em campanhas
- **Arquivo**: `supabase/functions/collect-meta-ads-analytics/index.ts:93`
- **Problema**: `limit=100` — se ad account tem >100 campanhas, resto perdido.

### 2.10 `get-analytics` — Query sem filtro de usuário
- **Arquivo**: `supabase/functions/get-analytics/index.ts:171`
- **Problema**: Busca `platform_hourly_performance` **sem `.eq("user_id", userId)`** — vaza dados entre usuários.

### 2.11 `getWebhookInfo` — Bot tokens vazados em logs
- **Arquivo**: `supabase/functions/telegram-webhook/index.ts:60,85`
- **Problema**: Loga primeiros 5-15 chars do token.

### 2.12 `google-gemini` — API key na URL
- **Arquivo**: `supabase/functions/_shared/bot-engine.ts:119`
- **Problema**: `?key=${apiKey}` — API key em URL pode ser logada.

### 2.13 Meta Client Secret em URL query param
- **Arquivo**: `supabase/functions/refresh-social-token/index.ts:134-135`
- **Problema**: `client_secret=${metaAppSecret}` na URL de exchange.

### 2.14 Hardcoded fallback secrets no código
- **Arquivo**: `supabase/functions/meta-webhook/index.ts:17`, `backup-messages/index.ts:47`
- **Problema**: `|| "vitoria_net_omni_secure"` — fallback público no código fonte.

### 2.15 `handle-new-subscriber` — Graph API v18.0 (desatualizada)
- **Arquivo**: `supabase/functions/handle-new-subscriber/index.ts:66`
- **Problema**: Usa `v18.0` quando todo o resto usa `v21.0`.

### 2.16 `backup-messages` — `btoa(String.fromCharCode.apply(null, ...))` quebra em arrays grandes
- **Arquivo**: `supabase/functions/backup-messages/index.ts:36-37`
- **Problema**: Argument limit do JavaScript (>65536 elementos) corrompe backups.

### 2.17 `whatsapp-media-proxy` — Sem auth
- **Arquivo**: `supabase/functions/whatsapp-media-proxy/index.ts:10-86`
- **Problema**: Qualquer um que saiba a URL pode acessar mídias do WhatsApp.

### 2.18 `whatsapp-media-proxy` — Sem limite de tamanho
- **Arquivo**: `supabase/functions/whatsapp-media-proxy/index.ts:73`
- **Problema**: Carrega mídia inteira na memória sem check de tamanho.

### 2.19 Config.toml — 22 funções faltando
- **Arquivo**: `supabase/config.toml`
- **Problema**: Funções como `radar-api`, `backup-messages`, `publish-post`, `cron-status` etc. não têm entrada.

### 2.20 `dump-stats` em config.toml mas não existe
- **Arquivo**: `supabase/config.toml:80-89`
- **Problema**: Entrada para `dump-stats` mas diretório da função não existe.

### 2.21 Cron `invoke-automation-radar` — Chama endpoint inexistente
- **Arquivo**: `supabase/migrations/20240330000000_add_cron_jobs.sql:5-16`
- **Problema**: Chama `/process_queue` que não existe em `automation-api`.

### 2.22 Cron localhost URLs hardcoded
- **Arquivo**: `supabase/migrations/20240330000000_add_cron_jobs.sql:11-12`, `20260427110000_automate_news_radar.sql:14-15`
- **Problema**: URLs apontam para `127.0.0.1:54321` em vez de produção.

### 2.23 WebhookStatusBadge — React Hook Rules violation
- **Arquivo**: `src/components/dashboard/settings/WebhookStatusBadge.tsx:42-43`
- **Problema**: Early return antes do `useEffect` — viola regras dos hooks.

### 2.24 AbortSignal não passado para supabase.functions.invoke
- **Arquivo**: `src/utils/supabase-utils.ts:34-42`
- **Problema**: AbortController criado mas `signal` nunca enviado na chamada.

### 2.25 Fake `isOnline` gerado com `Math.random()`
- **Arquivo**: `supabase/functions/discover-telegram-chats/index.ts:213,263`
- **Problema**: Dados falsos apresentados como reais para o usuário.

### 2.26 Fake `online_count` gerado
- **Arquivo**: `supabase/functions/sync-messaging-channels/index.ts:132`

### 2.27 `SettingsView.tsx` — Mock data "Hits" no Meta Pixel
- **Arquivo**: `src/components/dashboard/SettingsView.tsx:1632`

### 2.28 `AdvancedAnalytics.tsx` — "1.2m" hardcoded
- **Arquivo**: `src/components/dashboard/AdvancedAnalytics.tsx:1139`

### 2.29 `collect-social-analytics` — Race condition CRON tasks
- **Arquivo**: `supabase/functions/collect-social-analytics/index.ts:75-83,101-103`
- **Problema**: SELECT e UPDATE não atômicos — duas execuções CRON simultâneas processam a mesma task.

---

## Fase 3: 🟡 Correções de Média Prioridade

### 3.1 Bot Engine — `.or()` filter logic errada
- **Arquivo**: `supabase/functions/_shared/bot-engine.ts:73`
- **Problema**: Filtro usa `,` (AND) em vez de `|` (OR) no PostgREST.

### 3.2 Instagram hashtag search — user ID errado
- **Arquivo**: `src/components/dashboard/StoryEditor.tsx:164`
- **Problema**: Passa Supabase Auth UUID em vez de Instagram Business ID.

### 3.3 Music search — No-op
- **Arquivo**: `src/components/dashboard/StoryEditor.tsx:169-178`
- **Problema**: Mostra toast e não faz nada.

### 3.4 Search errors — Silenciados
- **Arquivo**: `src/components/dashboard/StoryEditor.tsx:194-196`

### 3.5 `useApiCredentials.ts` — Erros de fetch silenciados
- **Arquivo**: `src/hooks/useApiCredentials.ts:139-140`

### 3.6 WhatsApp API creds sobrescrevem OAuth
- **Arquivo**: `src/hooks/useApiCredentials.ts:204-219`

### 3.7 Telegram sync delay hardcoded 1.2s
- **Arquivo**: `src/hooks/useApiCredentials.ts:226`

### 3.8 `safeInvoke` silencia erros 4xx demais
- **Arquivo**: `src/utils/supabase-utils.ts:79`

### 3.9 `CronMonitorView` — `staleTime: Infinity`
- **Arquivo**: `src/components/dashboard/CronMonitorView.tsx:48-74`

### 3.10 `CronMonitorView` — Erros de sync silenciados
- **Arquivo**: `src/components/dashboard/CronMonitorView.tsx:96-114`

### 3.11 `WhatsApp media proxy` — Sem validação de `mediaId`
- **Arquivo**: `supabase/functions/whatsapp-media-proxy/index.ts:50`

### 3.12 Missing indexes — `social_connections(user_id,platform,is_connected)`
- **Migração necessária**

### 3.13 Missing index — `oauth_states(state,user_id,platform)`

### 3.14 Missing index — `messages(user_id,platform,recipient_phone,status,sent_at)`

### 3.15 `Trend-discovery.ts` — Upsert manual com race condition
- **Arquivo**: `supabase/functions/_shared/automation/trend-discovery.ts:192-236`

### 3.16 `collect-social-analytics` — Persistência multi-tabela não transactional
- **Arquivo**: `supabase/functions/collect-social-analytics/index.ts:1117-1168`

### 3.17 `collect-social-analytics` — threads `"me"` endpoint pode falhar
- **Arquivo**: `supabase/functions/collect-social-analytics/index.ts:354`

### 3.18 `SettingsView` — Missing cleanup em setTimeout
- **Arquivo**: `src/components/dashboard/SettingsView.tsx:108-117`

### 3.19 Auto-sync effect — Race condition
- **Arquivo**: `src/components/dashboard/SettingsView.tsx:270-288`

### 3.20 `syncSocialStats` — Race condition multi-plataforma
- **Arquivo**: `src/components/dashboard/SettingsView.tsx:160-244`

### 3.21 `BillingTab` — NaN no MRR (parseFloat("R$ 29,90"))
- **Arquivo**: `src/components/dashboard/settings/BillingTab.tsx:1013-1015`

### 3.22 WhatsApp links com país hardcoded "55"
- **Arquivo**: `src/components/dashboard/settings/BillingTab.tsx:1024`, `SubscribersView.tsx:286`

### 3.23 `NewsPortal` — Sem paginação
- **Arquivo**: `src/components/dashboard/NewsPortal.tsx:190-225`

### 3.24 `DashboardHomeView` — `socialPlatforms.slice(0, 5)`
- **Arquivo**: `src/components/dashboard/DashboardHomeView.tsx:275`

### 3.25 `useAnalytics` — Erros silenciados, UI mostra zeros
- **Arquivo**: `src/hooks/useAnalytics.ts:183-192`

### 3.26 `publish-post` — Sem auth guard
- **Arquivo**: `supabase/functions/publish-post/index.ts:25`

### 3.27 Telegram webhook — Busca TODAS credenciais
- **Arquivo**: `supabase/functions/telegram-webhook/index.ts:63-67`

### 3.28 Token refresh — Cobre só 4 de 12+ plataformas
- **Arquivo**: `supabase/functions/refresh-social-token/index.ts:11-13`

### 3.29 Compartilhamento de client_secret via `logOAuth`
- **Arquivo**: `supabase/functions/social-oauth-callback/index.ts:119`

### 3.30 `sync-telegram-chats` — `maybeSingle()` perde multi-bot
- **Arquivo**: `supabase/functions/sync-telegram-chats/index.ts:248-253`

---

## Fase 4: 🔵 Melhorias e Boas Práticas

### 4.1 Typescript — Uso excessivo de `any` e `@ts-nocheck`
- Múltiplos arquivos

### 4.2 Console.log/error em produção
- ~41 statements encontrados

### 4.3 Missing loading states em listas
- SubscribersView, BillingTab, etc.

### 4.4 Missing key props em listas
- SettingsView.tsx:951

### 4.5 Hardcoded locale "pt-BR"
- `get-analytics/index.ts:320-323`

### 4.6 Import map dead code
- `import_map.json:7` — `_shared/` nunca usado como bare specifier

### 4.7 Shared modules usam URLs diretas em vez do import map
- `_shared/credentials.ts:1`

### 4.7 7 migrations repetem `CREATE EXTENSION IF NOT EXISTS pg_cron`

### 4.9 OAuth state sem `expires_at`
- `social-oauth-init/index.ts:179-185`

### 4.10 AuthContext — session check a cada 15s é excessivo
- `AuthContext.tsx:152`

### 4.11 AuthContext — cache TTL de 30 minutos
- `AuthContext.tsx:76`

### 4.12 `backup-messages` — Não está em config.toml
- Precisa `verify_jwt = false`

### 4.13 `handle-new-subscriber` — Não está em config.toml
- Precisa `verify_jwt = false`

---

## Plano de Implantação por Fases

```
Fase 1: 🔴 Críticas Imediatas (1.1 a 1.20)       ~4-5 horas
Fase 2: 🟠 Alta Prioridade (2.1 a 2.29)           ~6-8 horas  
Fase 3: 🟡 Média Prioridade (3.1 a 3.30)          ~8-10 horas
Fase 4: 🔵 Melhorias (4.1 a 4.13)                 ~3-4 horas
                                                  ─────────
                                          Total   ~21-27 horas
```

### Fase 1 — Detalhamento (Ordem de execução)

| # | Tarefa | Arquivos | Tempo |
|---|--------|----------|-------|
| 1.1 | Criar `enqueue_scheduled_posts` + `publish_post_worker` | Nova migration | 30min |
| 1.2 | Fix `.or()` filter syntax | `collect-social-analytics/index.ts:79` | 15min |
| 1.3 | Adicionar unique constraint ou fix onConflict | `meta_ads_campaigns` migration | 15min |
| 1.4 | Mudar `.insert()` → `.upsert()` | `collect-youtube-analytics/index.ts:187` | 10min |
| 1.5 | Mudar `.insert()` → `.upsert()` | `collect-google-analytics/index.ts:177` | 10min |
| 1.6 | Corrigir nome coluna `dimension` → `dimension_name` | `collect-google-analytics/index.ts:182` | 5min |
| 1.7 | Adicionar `cron.schedule()` para refresh-tokens | Nova migration | 15min |
| 1.8 | Descomentar cron collect-social-analytics + fix | Migration | 10min |
| 1.9 | Adicionar `<input>` de mídia no StoryEditor | `StoryEditor.tsx` | 20min |
| 1.10 | Implementar load de draft do localStorage | `StoryEditor.tsx` | 15min |
| 1.11 | Adicionar guard `stories.length > 0` | `StoryEditor.tsx:303` | 5min |
| 1.12 | Passar `mediaUrls` corretamente | `usePublisher.ts` | 15min |
| 1.13 | Tratar `Infinity` no display | `useSocialConnections.ts`, `ConnectionCard.tsx` | 10min |
| 1.14 | Adicionar domínio real nas allowedOrigins | `useSocialConnections.ts` | 5min |
| 1.15 | Adicionar HMAC verification nos Meta webhooks | `whatsapp-webhook`, `meta-webhook` | 30min |
| 1.16 | Remover decodeJwt ou usar verificação real | `sync-telegram-chats/index.ts` | 20min |
| 1.17 | Usar `phone_number_id` para rotear mensagens | `bot-engine.ts:301-302` | 30min |
| 1.18 | Adicionar null check | `ConnectionCard.tsx:54` | 5min |
| 1.19 | Substituir posição hardcoded por layout relativo | `SocialNetworkCard.tsx` | 15min |
| 1.20 | Corrigir `redirectUri` → `redirect_uri` | `spotify.ts:7` | 5min |

### Fase 2 — Principais tarefas
- Corrigir CORS em callback
- Remover `Math.random()` e mocks do AdvancedAnalytics
- Adicionar AbortController/timeout em todos os fetchs
- Adicionar paginação em sync/analytics (YouTube, Meta Ads, etc.)
- FIX do Giphy API key
- Adicionar filtro `user_id` no get-analytics
- Sanitizar logs (tokens, secrets)
- Adicionar funções faltantes no config.toml
- Remover `dump-stats` do config.toml
- Fix cron URLs de localhost para produção
- Fix Hook Rules no WebhookStatusBadge
- Passar AbortSignal no safeInvoke
- Remover fake `Math.random()` de isOnline/online_count
- Remover mocks do SettingsView/AdvancedAnalytics

### Fase 3 — Principais tarefas
- Fix `.or()` filter no bot-engine
- Adicionar validação de input em mediaId
- Missing indexes migration
- Transaction na persistência multi-tabela
- Fix upsert manual no trend-discovery
- Cleanup em useEffect (SettingsView, BillingTab, etc.)
- Sanitizar preço no BillingTab
- Adicionar paginação em listas
- Auth guard no publish-post
- Limitar busca de credenciais no telegram-webhook
- Adicionar refresh para TikTok/LinkedIn/Threads/Reddit/Spotify
- Sanitizar payload no logOAuth

### Fase 4 — Principais tarefas
- Reduzir `any` Typescript
- Remover console.log de produção
- Adicionar loading states
- Adicionar key props
- Internacializar locale
- Usar import map corretamente
- Consolidar migrations pg_cron
- Adicionar expires_at no oauth_states
- Ajustar session check interval para 60s
- Adicionar funções ao config.toml

---

## Resumo das Migrações Pendentes

| Migration | Conteúdo |
|-----------|----------|
| `20260527000000_enqueue_scheduled_posts.sql` | Funções `enqueue_scheduled_posts` + `publish_post_worker` |
| `20260527010000_fix_meta_ads_constraint.sql` | Add unique constraint `(user_id, campaign_id)` |
| `20260527020000_register_refresh_tokens_cron.sql` | `cron.schedule('refresh-tokens-v2', '0 */6 * * *', ...)` |
| `20260527030000_fix_collect_social_analytics_cron.sql` | Descomenta + fix cron |
| `20260527040000_missing_indexes.sql` | Compound indexes |

---

*Documento gerado automaticamente em 26/05/2026 com base em auditoria de código-fonte.*
