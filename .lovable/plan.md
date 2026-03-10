# Plano de Refatoração Arquitetural — SocialHub

## Prioridade Crítica: RLS ainda RESTRICTIVE

Todas as 12 tabelas continuam com `Permissive: No`. As migrações anteriores falharam ou foram sobrepostas. Isso bloqueia **todas** as operações de dados. Precisamos resolver isso primeiro.

## Estratégia de Execução

Dado o escopo massivo, a implementação será dividida em **fases incrementais** sem quebrar código existente.

---

### FASE 1 — Estabilização (esta iteração)

**1.1 Migração RLS definitiva**

- DROP ALL POLICIES em todas as 12 tabelas
- Recriar todas como `AS PERMISSIVE` com `auth.uid() = user_id`
- Isso desbloqueia calendário, documentos, mídia, mensagens, credenciais

**1.2 Novas tabelas para a modelagem otimizada**
Adicionar tabelas que **não existem** ainda (sem remover as existentes):


| Nova Tabela       | Propósito                                |
| ----------------- | ---------------------------------------- |
| `published_posts` | Rastrear ID de publicação por plataforma |
| `post_metrics`    | Métricas reais por post/plataforma       |
| `articles`        | Portal de notícias                       |
| `audio_articles`  | Áudio de artigos (TTS)                   |
| `transcriptions`  | Transcrições de mídia                    |
| `live_clips`      | Cortes de lives                          |
| `social_accounts` | Dados de perfil/seguidores por conta     |


As tabelas existentes (`scheduled_posts`, `social_connections`, `stories_lives`, `messages`, `contacts`, `documents`, `media`, `messaging_channels`) são **preservadas** integralmente.

**1.3 Índices para escala**

```sql
CREATE INDEX idx_posts_user_scheduled ON scheduled_posts(user_id, scheduled_at);
CREATE INDEX idx_posts_status ON scheduled_posts(status);
CREATE INDEX idx_post_metrics_post ON post_metrics(post_id, collected_at);
CREATE INDEX idx_articles_slug ON articles(slug);
```

---

### FASE 2 — Frontend: Lazy Loading + Code Splitting + Novas Rotas

**2.1 Lazy loading de todas as views do Dashboard**

```typescript
const CalendarView = lazy(() => import('./dashboard/CalendarView'));
const AdvancedAnalytics = lazy(() => import('./dashboard/AdvancedAnalytics'));
// ... todas as views
```

**2.2 Novas rotas**

```
/news          → Lista de artigos
/news/:slug    → Artigo individual
```

**2.3 React Query com cache otimizado**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 }
  }
});
```

**2.4 Novos componentes (sem remover existentes)**

- `NewsPortal.tsx` — listagem de artigos
- `ArticleView.tsx` — artigo individual com botão "Ouvir"
- `LiveStreamManager.tsx` — gerenciar lives multicanal
- `LiveClipsView.tsx` — cortes de lives
- `SocialAccountsPanel.tsx` — perfis conectados com foto/seguidores

---

### FASE 3 — Edge Functions: Fila + Workers + Retry

**3.1 Sistema de fila via tabela `job_queue**`

```sql
CREATE TABLE public.job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_type text NOT NULL,  -- 'publish', 'collect_analytics', 'process_media', 'clip_live'
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
```

**3.2 Worker Edge Functions (novas, sem alterar existentes)**

- `process-job-queue` — processa jobs pendentes com retry exponencial
- `collect-social-analytics` — coleta métricas das APIs sociais
- `generate-live-clips` — gera cortes de lives
- `text-to-speech` — converte artigos em áudio (usando Lovable AI)
- `transcribe-media` — transcrição de áudio/vídeo (usando Lovable AI)

**3.3 pg_cron schedulers**

```sql
-- Publicação agendada (1 min)
SELECT cron.schedule('publish-scheduler', '* * * * *', ...);
-- Analytics (6 horas)
SELECT cron.schedule('collect-analytics', '0 */6 * * *', ...);
-- Refresh tokens (diário)
SELECT cron.schedule('refresh-tokens', '0 3 * * *', ...);
```

**3.4 Retry com backoff exponencial**

```
attempt 1: imediato
attempt 2: 1 min
attempt 3: 5 min
```

---

### FASE 4 — SDK Universal de Redes Sociais

**Estrutura no frontend** (interface TypeScript, não pasta separada):

```typescript
// src/lib/social-sdk/types.ts
interface SocialConnector {
  connectAccount(): Promise<void>;
  refreshToken(): Promise<void>;
  publishPost(content: PostContent): Promise<string>;
  publishStory(media: StoryMedia): Promise<string>;
  startLive(config: LiveConfig): Promise<string>;
  getPostMetrics(postId: string): Promise<PostMetrics>;
  getAccountMetrics(): Promise<AccountMetrics>;
  getFollowersCount(): Promise<number>;
}
```

Cada plataforma implementa via Edge Function. O frontend apenas invoca `supabase.functions.invoke('publish-post', ...)` com o platform como parâmetro.

---

### Resumo de Arquivos

**Migração SQL (1 arquivo):**

- Fix RLS (12 tabelas) + criar 7 novas tabelas + índices + job_queue

**Novos arquivos frontend:**

- `src/lib/social-sdk/types.ts`
- `src/pages/News.tsx`, `src/pages/ArticlePage.tsx`
- `src/components/dashboard/LiveStreamManager.tsx`
- `src/components/dashboard/LiveClipsView.tsx`
- `src/components/dashboard/SocialAccountsPanel.tsx`
- `src/components/dashboard/NewsPortal.tsx`

**Arquivos editados (sem remover funcionalidades):**

- `src/App.tsx` — adicionar rotas `/news`, `/news/:slug`
- `src/pages/Dashboard.tsx` — lazy imports + novas tabs
- `src/components/dashboard/Sidebar.tsx` — novos itens de menu

**Novas Edge Functions:**

- `process-job-queue/index.ts`
- `collect-social-analytics/index.ts`
- `generate-live-clips/index.ts`
- `text-to-speech/index.ts`
- `transcribe-media/index.ts`

**Edge Functions existentes preservadas:**

- `publish-post` ✅
- `social-oauth-init` ✅
- `social-oauth-callback` ✅
- `generate-post-content` ✅
- `get-analytics` ✅
- `refresh-social-token` ✅
- `bulk-import-posts` ✅

---

### Ordem de Execução

1. Migração SQL (RLS + novas tabelas + índices)
2. Frontend: lazy loading + QueryClient otimizado
3. Novas páginas (News portal)
4. Novos componentes dashboard (lives, clips, accounts)
5. Edge Functions de workers
6. pg_cron schedulers
7. SDK types

Nenhum componente, hook, edge function ou tabela existente será removido.

CONTINUAÇÃO DO PLANO ARQUITETURAL — SOCIAL HUB

As fases anteriores permanecem intactas.  
Nenhuma tabela, função de borda, hook ou componente existente deve ser removido.

Todas as novas estruturas são **extensões compatíveis com o sistema atual**.

---

FASE 5 — Engine de Automação de Conteúdo com IA

Criar módulo responsável por geração automática de conteúdo.

Estrutura:

src/services/ai-content-engine

Funções principais:

generatePostIdeas()  
generateSocialPost()  
generateArticle()  
generateHashtags()  
generateVideoDescription()

Fluxo de geração automática:

tema ou conteúdo existente  
↓  
IA gera ideias de posts  
↓  
geração de texto otimizado  
↓  
sugestão de hashtags  
↓  
agendamento automático

Nova tabela:

ai_generated_content

Campos:

id  
user_id  
content_type  
prompt  
generated_text  
metadata jsonb  
created_at

Integração com sistema de agendamento existente:

conteúdo gerado pode ser salvo diretamente em scheduled_posts.

---

FASE 6 — Pipeline de IA para Reaproveitamento de Conteúdo

Criar pipeline automatizado para transformar vídeos e lives em múltiplos formatos.

Pipeline:

upload de mídia  
↓  
transcrição automática  
↓  
detecção de highlights  
↓  
geração de clips  
↓  
geração de posts sociais  
↓  
agendamento automático

Workers adicionais:

ai-highlight-detector  
ai-post-generator

Tabela adicional:

media_processing_jobs

Campos:

id  
media_id  
job_type  
status  
result jsonb  
created_at

---

FASE 7 — Sistema de Stories

Adicionar suporte para publicação e agendamento de stories.

Nova tabela:

stories

Campos:

id  
user_id  
platform  
media_url  
caption  
status  
scheduled_at  
published_at  
platform_story_id

Nova tabela:

story_metrics

Campos:

id  
story_id  
views  
replies  
exits  
collected_at

Worker adicional:

publish-story-worker

Stories suportados:

Instagram  
Facebook  
WhatsApp Status  
TikTok Stories  
YouTube Shorts

Stories também devem aparecer no calendário editorial existente.

---

FASE 8 — Live Streaming Engine (tipo StreamYard)

Criar módulo para transmissão ao vivo diretamente do sistema.

Estrutura:

src/services/live-stream-engine

Funções:

createLiveSession()  
generateStreamKey()  
startLive()  
stopLive()  
recordLive()

Nova tabela:

live_sessions

Campos:

id  
user_id  
title  
description  
scheduled_at  
stream_key  
status  
recording_url  
created_at

Nova tabela:

live_destinations

Campos:

id  
live_id  
platform  
stream_url  
status

Suporte para transmissão simultânea:

YouTube Live  
Facebook Live  
Instagram Live  
TikTok Live  
Website Live Player

Componente frontend:

LiveStudio.tsx

Funções:

configurar live  
gerenciar destinos  
iniciar transmissão  
monitorar status

---

FASE 9 — Pipeline Pós-Live

Após término de uma live:

Fluxo automático:

live recording  
↓  
transcrição automática  
↓  
detecção de momentos importantes  
↓  
geração de clips  
↓  
geração de posts sociais  
↓  
publicação em redes

Workers envolvidos:

transcribe-media  
generate-live-clips  
ai-highlight-detector  
publish-post

Nova tabela:

live_highlights

Campos:

id  
live_id  
start_time  
end_time  
clip_url  
created_at

---

FASE 10 — Processamento de Mídia

Criar serviço de processamento de mídia.

Estrutura:

src/services/media-processing

Funções:

optimizeImage()  
encodeVideo()  
generateThumbnail()  
extractAudio()

Pipeline de mídia:

upload  
↓  
compressão  
↓  
geração de thumbnails  
↓  
armazenamento otimizado

Nova tabela:

media_assets

Campos:

id  
user_id  
media_type  
storage_path  
thumbnail_path  
metadata jsonb  
created_at

---

FASE 11 — Automação de Campanhas

Criar módulo de automação de campanhas de conteúdo.

Estrutura:

src/services/campaign-engine

Nova tabela:

campaigns

Campos:

id  
user_id  
name  
description  
start_date  
end_date  
status

Nova tabela:

campaign_posts

Campos:

id  
campaign_id  
post_id  
scheduled_at  
platform

Fluxo:

criar campanha  
↓  
IA gera sequência de posts  
↓  
posts adicionados ao calendário  
↓  
agendamento automático

---

FASE 12 — Integração de Mensagens Omnichannel

Expandir sistema existente de mensagens.

Plataformas:

WhatsApp  
Telegram

Nova tabela:

message_threads

Campos:

id  
contact_id  
platform  
last_message  
updated_at

Nova tabela:

message_events

Campos:

id  
thread_id  
message  
direction  
status  
sent_at

Sincronização de contatos:

Google Contacts API

Worker adicional:

contact-sync-worker

---

FASE 13 — Otimização para Escala (Milhões de Posts)

Implementar particionamento de tabelas principais.

Exemplo:

posts partitioned by range (created_at)

Criar partições mensais.

Índices adicionais:

posts(created_at)  
posts(user_id, status)  
post_metrics(platform, collected_at)

Objetivo:

manter performance mesmo com milhões de registros.

---

FASE 14 — Rate Limit e Controle de Publicação

Adicionar controle de limite para APIs sociais.

Nova tabela:

api_rate_limits

Campos:

platform  
requests_per_minute  
last_request_at

Worker publish-post deve respeitar limites por plataforma.

Exemplo:

Instagram → 5 posts/min  
Twitter → 10 posts/min  
LinkedIn → 3 posts/min

---

FASE 15 — Analytics Avançado

Expandir sistema atual de métricas.

Nova tabela:

account_metrics

Campos:

id  
social_account_id  
followers  
following  
posts_count  
engagement_rate  
collected_at

Dashboard deve mostrar:

crescimento de seguidores  
engagement rate  
alcance médio  
comparação entre redes

---

FASE 16 — Integração de Text-to-Speech

Expandir função text-to-speech existente.

Nova tabela:

article_audio

Campos:

id  
article_id  
audio_url  
duration  
created_at

Frontend:

botão "Ouvir artigo" na página de notícias.

---

FASE 17 — Sistema de Monitoramento

Criar sistema básico de monitoramento.

Nova tabela:

system_logs

Campos:

id  
service  
level  
message  
metadata jsonb  
created_at

Registrar:

falhas de publicação  
erros de API  
erros de workers

---

ORDEM DE EXECUÇÃO DAS NOVAS FASES

FASE 5 — Engine IA  
FASE 6 — Pipeline de reaproveitamento de conteúdo  
FASE 7 — Stories  
FASE 8 — Live Streaming Engine  
FASE 9 — Pipeline pós-live  
FASE 10 — Processamento de mídia  
FASE 11 — Automação de campanhas  
FASE 12 — Mensagens omnichannel  
FASE 13 — Otimização para escala  
FASE 14 — Rate limit APIs sociais  
FASE 15 — Analytics avançado  
FASE 16 — Text-to-speech  
FASE 17 — Monitoramento

Todas as implementações devem preservar integralmente o código existente e apenas expandir o sistema atual.