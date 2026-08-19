# 🔍 AUDITORIA COMPLETA — Sistema de Stories, Publicações e Estatísticas

**Data:** 2026-08-18  
**Escopo:** Dashboard → Rascunho → Agendamento → Publicação → Estatísticas  
**Status:** AUDITORIA REALIZADA — Erros, Gargalos e Bloqueios Identificados

---

## ÍNDICE

1. [Resumo Executivo](#1-resumo-executivo)
2. [Mapa de Fluxo — Story do Rascunho à Publicação](#2-mapa-de-fluxo)
3. [Erros Críticos (BLOQUEIOS)](#3-erros-críticos)
4. [Erros Graves (GARGALOS)](#4-erros-graves)
5. [Erros Médios (MELHORIAS NECESSÁRIAS)](#5-erros-médios)
6. [Erros Leves (CÓDIGO MORTO / WARNINGS)](#6-erros-leves)
7. [Matriz de Suporte por Plataforma](#7-matriz-de-suporte)
8. [Auditoria de Estatísticas por Rede](#8-auditoria-de-estatísticas)
9. [Plano de Correção — Priorizado](#9-plano-de-correção)
10. [Anexo: Arquivos Afetados](#10-anexo)

---

## 1. RESUMO EXECUTIVO

A sistema de stories e publicações possui **3 problemas bloqueadores** que impedem o fluxo completo de funcionar, **5 gargalos** que afetam a confiabilidade, e **12+ melhorias** necessárias.

### Contagem de Issues

| Severidade | Quantidade | Impacto |
|-----------|-----------|---------|
| 🔴 CRÍTICO (Bloqueador) | 3 | Impossibilita publicação em horário/agendado |
| 🟠 GRAVE (Gargalo) | 5 | Publicações falham ou publicam incorretamente |
| 🟡 MÉDIO | 7 | Funcionalidade parcial ou dados incorretos |
| 🔵 LEVE | 5+ | Código morto, warnings, melhorias de código |

---

## 2. MAPA DE FLUXO

### 2.1 Fluxo de Story

```
┌─────────────────────────────────────────────────────────────────┐
│  RASCUNHO (CreatePostPanel / StoryEditor)                       │
│  ├── Texto + Mídia (foto/vídeo/áudio)                           │
│  ├── Stickers (hashtag, localização, música, GIF, emoji)       │
│  ├── Seleção de Plataformas e Perfis                            │
│  └── Agendamento (datetime-local input)                         │
├─────────────────────────────────────────────────────────────────┤
│  SALVAMENTO                                                      │
│  ├── scheduled_posts (tipo post normal)                         │
│  └── stories_lives (tipo story)  ← SEPARADO, sem cron          │
├─────────────────────────────────────────────────────────────────┤
│  AGENDAMENTO / CRON                                              │
│  ├── pg_cron a cada 1 minuto → process-scheduled-posts          │
│  │   └── Busca posts com scheduled_at <= agora                  │
│  │   └── Status: scheduled → publishing → published/failed      │
│  ├── process-job-queue (a cada 5 min) → tarefas async           │
│  └── ❌ stories_lives NÃO tem trigger de cron                   │
├─────────────────────────────────────────────────────────────────┤
│  PUBLICAÇÃO                                                       │
│  ├── publish-post → dispatcher.ts → adapter por plataforma      │
│  ├── Cada adapter chama a API nativa da rede social             │
│  └── Resultado salvo em published_posts + post_sync_log         │
├─────────────────────────────────────────────────────────────────┤
│  ESTATÍSTICAS                                                     │
│  ├── collect-social-analytics (a cada 6h)                       │
│  ├── collect-youtube-analytics (YouTube profundo)               │
│  ├── get-analytics (agregador do dashboard)                     │
│  └── hook useAnalytics → componentes React                      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Dois Sistemas Paralelos (PROBLEMA DE ARQUITETURA)

| Tabela | Uso | Cron? | Publica? |
|--------|-----|-------|---------|
| `scheduled_posts` | Posts normais (texto, imagem, vídeo, carrossel) | ✅ pg_cron 1min | ✅ Via publish-post |
| `stories_lives` | Stories e Lives | ❌ **SEM CRON** | ❌ **Manual apenas** |

**Impacto:** Um story agendado em `stories_lives` **NUNCA será publicado automaticamente**. O campo `scheduled_at` existe no banco mas **nenhum processo o lê**.

---

## 3. ERROS CRÍTICOS (BLOQUEIOS)

### 🔴 CRIT-01: Stories Agendados NÃO São Publicados Automaticamente

- **Arquivo:** `supabase/functions/process-scheduled-posts/index.ts`
- **Descrição:** O cron `process-scheduled-posts` APENAS busca na tabela `scheduled_posts`. A tabela `stories_lives` possui campo `scheduled_at` mas **nenhum edge function a monitora**.
- **Consequência:** O usuário agenda um story para 20:00h. O cron ignora completamente. O story **nunca é publicado**.
- **Prova:** Grep por `stories_lives` em `process-scheduled-posts` retorna ZERO resultados.
- **Correção Necessária:** Criar monitor na tabela `stories_lives` OU migrar stories para o pipeline `scheduled_posts`.

### 🔴 CRIT-02: ContentType "story" Perdido no Agendamento Automático

- **Arquivo:** `supabase/functions/process-scheduled-posts/index.ts` (linha ~150-180)
- **Descrição:** Quando o cron invoca `publish-post`, envia `mediaType` mas **NÃO envia `contentType`** (que deveria ser `'story'`). O adapter de Instagram precisa receber `contentType: 'story'` para usar `media_type: 'STORIES'` na Graph API.
- **Consequência:** Stories agendados via `scheduled_posts` são publicados como post normal (feed), não como story.
- **Correção Necessária:** Passar `contentType` do campo `media_type` ou `metadata` na chamada ao publish-post.

### 🔴 CRIT-03: `process-scheduled-posts` NÃO Publica em Todas as Plataformas Selecionadas

- **Arquivo:** `supabase/functions/process-scheduled-posts/index.ts` (linha ~185-210)
- **Descrição:** O array `platforms` do post pode ter formato `"instagram|profileId123"` (plataforma|perfil). O cron pode não estar repassando o `targetProfileId` corretamente para a chamada HTTP.
- **Consequência:** Posts multi-plataforma podem publicar apenas em uma plataforma ou na plataforma errada.
- **Correção Necessária:** Validar que o formato `platform|targetProfileId` é preservado na chamada HTTP ao publish-post.

---

## 4. ERROS GRAVES (GARGALOS)

### 🟠 GRAVE-01: TikTok Publica como PRIVADO

- **Arquivo:** `supabase/functions/_shared/platforms/tiktok.ts` (linha 129)
- **Código:** `privacy_level: "SELF_ONLY"`
- **Comentário no código:** "Apps not audited can only publish to private accounts"
- **Impacto:** TODOS os posts do TikTok são publicados como privado/invisível.
- **Correção:** Aguardar auditoria da API TikTok OU usar fluxo alternativo.

### 🟠 GRAVE-02: YouTube Publica como PRIVADO

- **Arquivo:** `supabase/functions/_shared/platforms/youtube.ts` (linha 76)
- **Código:** `privacyStatus: "private"`
- **Comentário no código:** "privado durante testes; mude para public em producao"
- **Impacto:** TODOS os vídeos do YouTube ficam privados.
- **Correção:** Mudar para `privacyStatus: "public"` (ou `unlisted`).

### 🟠 GRAVE-03: 6 Plataformas São SIMULAÇÕES (Falso Sucesso)

- **Arquivos:**
  - `_shared/platforms/snapchat.ts` → retorna `{ success: true }` sem fazer nada
  - `_shared/platforms/kwai.ts` → gera ID random, finge sucesso
  - `_shared/platforms/rumble.ts` → gera ID random, finge sucesso
  - `_shared/platforms/truthsocial.ts` → gera ID random, finge sucesso
  - `_shared/platforms/gettr.ts` → gera ID random, finge sucesso
  - `_shared/platforms/googlenews.ts` → gera ID random, finge sucesso
- **Impacto:** O usuário vê "Publicado com sucesso!" mas NADA foi publicado. Dados falsos entram em `published_posts`.
- **Correção:** Marcar explicitamente como "Não implementado" OU remover do dispatcher.

### 🟠 GRAVE-04: Spotify "Publicação" É Um Stub

- **Arquivo:** `supabase/functions/_shared/platforms/spotify.ts`
- **Comportamento:** Cria playlist vazia com o título do post como nome, como privada. NÃO adiciona faixas.
- **Impacto:** Publicar "Música do Spotify" cria uma playlist vazia e privada.
- **Correção:** Integrar com Spotify API para adicionar tracks OU retornar erro claro.

### 🟠 GRAVE-05: Story Editor — Restauração de Rascunho Quebrada

- **Arquivo:** `src/components/dashboard/StoryEditor.tsx` (linhas 268-272)
- **Descrição:** O bloco `if` que deveria perguntar "Deseja restaurar o rascunho?" está **vazio**. O draft é salvo no localStorage mas **nunca é oferecido para restauração**.
- **Impacto:** Se o usuário fechar o editor, o rascunho é perdido silenciosamente.
- **Correção:** Implementar prompt de restauração no carregamento do editor.

---

## 5. ERROS MÉDIOS (MELHORIAS NECESSÁRIAS)

### 🟡 MEDIO-01: NENHUMA Plataforma Suporta Marcação de Localização

- **Descrição:** Nenhum adapter de plataforma (Instagram, Facebook, X, etc.) aceita ou envia dados de localização. O StoryEditor possui sticker de localização (Google Places) mas os dados são **ignorados na publicação**.
- **Plataformas que suportam API:** Instagram (Graph API `location_id`), Facebook (place tagging), Foursquare.
- **Impacto:** Stickers de localização aparecem na preview mas são removidos no envio.

### 🟡 MEDIO-02: NENHUMA Plataforma Suporta Marcação de Perfis (@mentions)

- **Descrição:** Nenhum adapter envia menções/perfis marcados. O StoryEditor não possui UI para isso.
- **Plataformas que suportam API:** Instagram (GraphQL `usertags`), Facebook (tagged_users), X (mentions in text).
- **Impacto:** Não é possível marcar outros perfis em stories/publicações.

### 🟡 MEDIO-03: Giphy Não É Embedado Nativamente

- **Descrição:** GIFs do Giphy são detectados como `image` por extensão de arquivo. Não há integração com Giphy Embed API para stories interativos.
- **Impacto:** GIFs funcionam como imagens estáticas (sem animação em stories).

### 🟡 MEDIO-04: Spotify Não É Embedado em Outras Plataformas

- **Descrição:** Embeds do Spotify (para compartilhar músicas em stories do Instagram/Facebook) não são suportados. O Spotify só é tratado como plataforma standalone.
- **Impacto:** Não é possível compartilhar "ouvindo no Spotify" em stories.

### 🟡 MEDIO-05: Estatísticas do Facebook São MOCKADAS

- **Arquivo:** `supabase/functions/collect-social-analytics/index.ts` (linha ~93)
- **Código:** `views_count: 500 + Math.floor(Math.random() * 1000)`
- **Impacto:** Métricas de visualização do Facebook são completamente inventadas.

### 🟡 MEDIO-06: Estatísticas do X/Twitter São MOCKADAS (Views)

- **Arquivo:** `supabase/functions/collect-social-analytics/index.ts` (linha ~615)
- **Código:** `views_count: followers_count * 1.5` (cálculo fake)
- **Impacto:** Views do Twitter não refletem dados reais.

### 🟡 MEDIO-07: Métricas Post-Individualizadas Só Existem para Instagram

- **Descrição:** A tabela `post_metrics` com dados por post é populada APENAS para Instagram (via Insights API). Outras plataformas não têm métricas individualizadas por publicação.
- **Impacto:** Não é possível ver likes/compartilhamentos de um post específico no Facebook, X, LinkedIn, etc.

---

## 6. ERROS LEVES (CÓDIGO MORTO / WARNINGS)

### 🔵 LEVE-01: Toast Duplicado em StoriesLivesView

- **Arquivo:** `src/components/dashboard/StoriesLivesView.tsx` (linha 423)
- **Descrição:** `toast({ title: "Live agendada!" })` chamado duas vezes.
- **Correção:** Remover chamada duplicada.

### 🔵 LEVE-02: `publish-post/server.ts` Importa Arquivo Inexistente

- **Arquivo:** `supabase/functions/publish-post/server.ts`
- **Descrição:** Importa `./api/publish` que não existe no disco. Código morto.
- **Correção:** Remover arquivo ou implementar.

### 🔵 LEVE-03: `publish-post/config/env.ts` Pode Crashar no Cold Start

- **Arquivo:** `supabase/functions/publish-post/config/env.ts`
- **Descrição:** Usa `!` (non-null assertion) em todas as variáveis de ambiente. Se qualquer uma não estiver configurada, a função crasha.
- **Correção:** Usar lookup dinâmico como os adapters `_shared/`.

### 🔵 LEVE-04: Transcoder Quebrado

- **Arquivo:** `supabase/functions/publish-post/workers/transcoder.ts`
- **Descrição:** Usa `Deno.run()` depreciado e tem bug de sintaxe no comando ffmpeg. Nunca é chamado.
- **Correção:** Remover ou reescrever.

### 🔵 LEVE-05: `upload-media` Usa Anon Key (RLS)

- **Arquivo:** `supabase/functions/upload-media/index.ts`
- **Descrição:** Usa `SUPABASE_ANON_KEY` em vez de `SUPABASE_SERVICE_ROLE_KEY`. Pode falhar por RLS.
- **Correção:** Usar service role key.

---

## 7. MATRIZ DE SUPORTE POR PLATAFORMA

### 7.1 Tipos de Conteúdo

| Plataforma | Texto | Foto | Vídeo | Áudio | Doc | Carrossel | Story | Reels | Live |
|-----------|-------|------|-------|-------|-----|-----------|-------|-------|------|
| Instagram | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (até 10) | ✅ STORIES | ✅ REELS | ⚠️ Stub |
| Facebook | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (fotos) | ✅ /story | ✅ | ⚠️ Stub |
| X/Twitter | ✅ | ✅ (até 4) | ✅ (1) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| TikTok | ⚠️ Título | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| YouTube | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ Shorts | ⚠️ Stub |
| LinkedIn | ✅ | ✅ | ✅ | ❌ | ✅ PDF/DOC | ❌ | ❌ | ❌ | ❌ |
| Telegram | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Album | ❌ | ❌ | ❌ |
| WhatsApp | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Threads | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pinterest | ⚠️ Title | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Snapchat | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kwai | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Rumble | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Spotify | ⚠️ Stub | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legenda:** ✅ Funcional | ⚠️ Parcial/Stub | ❌ Não implementado

### 7.2 Funcionalidades Especiais

| Plataforma | Localização | @Mencions | Editar | Deletar | Permalink | Agendamento |
|-----------|-------------|-----------|--------|---------|-----------|-------------|
| Instagram | ❌ | ❌ | ❌ | ❌ | ✅ shortcode | ✅ |
| Facebook | ❌ | ❌ | Texto | ✅ | ✅ post URL | ✅ |
| X/Twitter | ❌ | ❌ | ❌ | ✅ | ✅ tweet URL | ✅ |
| TikTok | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| YouTube | ❌ | ❌ | ❌ | ❌ | ✅ video URL | ✅ |
| LinkedIn | ❌ | ❌ | ❌ | ❌ | ✅ post URL | ✅ |
| Telegram | ❌ | ❌ | Texto | ✅ | ❌ | ✅ |
| WhatsApp | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Threads | ❌ | ❌ | ❌ | ❌ | ✅ post URL | ✅ |
| Pinterest | ❌ | ❌ | ❌ | ❌ | ✅ pin URL | ✅ |

### 7.3 Privacidade / Visibilidade

| Plataforma | Visibilidade Atual | Visibilidade Real Desejada |
|-----------|-------------------|---------------------------|
| TikTok | 🔒 **PRIVADO** (SELF_ONLY) | 🌐 Público |
| YouTube | 🔒 **PRIVADO** (testes) | 🌐 Público |
| Kwai | 🌐 "Público" (simulado) | ❌ Não publica de verdade |
| Rumble | 🌐 "Público" (simulado) | ❌ Não publica de verdade |
| Snapchat | 🌐 "Público" (stub) | ❌ Não publica de verdade |

---

## 8. AUDITORIA DE ESTATÍSTICAS POR REDE

### 8.1 Fluxo de Coleta

```
pg_cron (a cada 6h) → collect-social-analytics
   │
   ├── Facebook Graph API → social_accounts, account_metrics
   │   └── ❌ views = ALEATÓRIO (500 + random(1000))
   │   └── ❌ likes = 10% dos followers (estimativa fake)
   │   └── ❌ shares = 5% dos followers (estimativa fake)
   │
   ├── Instagram Graph API → social_accounts, account_metrics, post_metrics
   │   └── ✅ followers = API real
   │   └── ✅ views (profile_views) = API real via Insights
   │   └── ✅ likes/comments por post = API real
   │
   ├── YouTube Data API → social_accounts, youtube_analytics
   │   └── ✅ subscribers, videos, views = API real
   │   └── ✅ Métricas por vídeo (likes, comments, watch time)
   │
   ├── X/Twitter API v2 → social_accounts, account_metrics
   │   └── ✅ followers, posts = API real
   │   └── ❌ views = followers × 1.5 (falso)
   │
   ├── TikTok API → social_accounts, account_metrics
   │   └── ✅ followers, videos, likes = API real
   │
   ├── LinkedIn API → social_accounts
   │   └── ⚠️ Apenas fallback para dados da tabela (stale)
   │
   ├── Threads API → social_accounts
   │   └── ✅ followers = API real
   │
   ├── WhatsApp Business API → messaging_channels
   │   └── ✅ Dados reais da tabela messages
   │
   ├── Telegram → messaging_channels
   │   └── ❌ views = msgCount × 10 (falso)
   │
   ├── Spotify Web API → social_accounts
   │   └── ✅ followers = API real
   │   └── ❌ views = ALEATÓRIO (5000 + random(2000))
   │
   ├── Kwai → social_accounts
   │   └── ❌ TUDO MOCKADO com valores aleatórios
   │
   ├── Rumble → social_accounts
   │   └── ❌ TUDO MOCKADO com valores aleatórios
   │
   ├── Gettr → social_accounts
   │   └── ❌ TUDO MOCKADO com valores aleatórios
   │
   └── Truth Social → social_accounts
       └── ❌ TUDO MOCKADO com valores aleatórios
```

### 8.2 Métricas Individualizadas por Post

| Plataforma | Métricas por Post | Métricas Detalhadas | Fonte |
|-----------|-------------------|-------------------|-------|
| Instagram | ✅ likes, comments, impressions, reach | ✅ Salvo em `post_metrics` + `post_metrics_details` | Graph API Insights |
| Facebook | ❌ Nenhuma | ❌ | — |
| X/Twitter | ❌ Nenhuma | ❌ | — |
| YouTube | ✅ views, likes, comments, watch_time | ✅ Salvo em `youtube_analytics` + `youtube_traffic_sources` | Data API v3 |
| TikTok | ❌ Nenhuma | ❌ | — |
| LinkedIn | ❌ Nenhuma | ❌ | — |
| Threads | ❌ Nenhuma | ❌ | — |
| WhatsApp | ❌ Nenhuma (individual) | ❌ (apenas aggregates) | — |
| Telegram | ❌ Nenhuma | ❌ | — |
| Pinterest | ❌ Nenhuma | ❌ | — |

**Conclusão:** Apenas **Instagram** e **YouTube** possuem métricas individualizadas por publicação. As outras 8 plataformas com API real **não coletam dados por post**.

### 8.3 Tabelas com Migration Ausente

| Tabela Consultada | Consultada Em | Migration Encontrada? |
|------------------|---------------|----------------------|
| `video_retention` | `get-analytics` | ❌ NÃO |
| `format_reach_data` | `get-analytics` | ❌ NÃO |
| `viral_potential` | `get-analytics` | ❌ NÃO |
| `demographics_data` | `get-analytics` | ❌ NÃO (diferente de `audience_demographics`) |
| `social_analytics` | `x-twitter.ts` collector | ❌ NÃO |

**Impacto:** Essas queries falham silenciosamente via `Promise.allSettled`. Os dados retornam como arrays vazios.

---

## 9. PLANO DE CORREÇÃO — PRIORIZADO

### FASE 1 — BLOQUEIOS CRÍTICOS (Imediato)

| # | Issue | Arquivo(s) | Esforço | Prioridade |
|---|-------|-----------|---------|-----------|
| 1 | Stories agendados não são publicados | `process-scheduled-posts/index.ts` + `stories_lives` trigger | Médio | 🔴 P0 |
| 2 | ContentType "story" perdido no cron | `process-scheduled-posts/index.ts` | Baixo | 🔴 P0 |
| 3 | YouTube publicando como privado | `_shared/platforms/youtube.ts` | Baixo | 🔴 P0 |

### FASE 2 — GARGALOS (Semanal)

| # | Issue | Arquivo(s) | Esforço | Prioridade |
|---|-------|-----------|---------|-----------|
| 4 | TikTok publicando como privado | `_shared/platforms/tiktok.ts` | Baixo | 🟠 P1 |
| 5 | 6 plataformas com falso sucesso | 6 arquivos `_shared/platforms/*.ts` | Baixo | 🟠 P1 |
| 6 | Spotify stub (playlist vazia) | `_shared/platforms/spotify.ts` | Médio | 🟠 P1 |
| 7 | Restauração de draft quebrada | `StoryEditor.tsx` | Baixo | 🟠 P1 |
| 8 | toast duplicado | `StoriesLivesView.tsx` | Trivial | 🟠 P1 |

### FASE 3 — MÉTRICAS REAIS (Quinzenal)

| # | Issue | Arquivo(s) | Esforço | Prioridade |
|---|-------|-----------|---------|-----------|
| 9 | Facebook views/likes fake | `collect-social-analytics/index.ts` | Médio | 🟡 P2 |
| 10 | X/Twitter views fake | `collect-social-analytics/index.ts` | Médio | 🟡 P2 |
| 11 | Telegram views fake | `collect-social-analytics/index.ts` | Baixo | 🟡 P2 |
| 12 | Spotify views fake | `collect-social-analytics/index.ts` | Baixo | 🟡 P2 |
| 13 | Métricas por post só para IG/YT | Todos os adapters | Alto | 🟡 P2 |

### FASE 4 — FUNCIONALIDADES AUSENTES (Mensal)

| # | Issue | Arquivo(s) | Esforço | Prioridade |
|---|-------|-----------|---------|-----------|
| 14 | Localização em stories | adapters + StoryEditor | Alto | 🟡 P3 |
| 15 | @Mencions/marcação de perfis | adapters + editor | Alto | 🟡 P3 |
| 16 | Giphy embed nativo | adapters + editor | Médio | 🟡 P3 |
| 17 | Spotify embed em stories | adapters + editor | Médio | 🟡 P3 |
| 18 | Migração 50-post limit | `useScheduledPosts.ts` | Baixo | 🟡 P3 |

### FASE 5 — CÓDIGO MORTO (Limpeza)

| # | Issue | Arquivo(s) | Esforço | Prioridade |
|---|-------|-----------|---------|-----------|
| 19 | `publish-post/server.ts` import fantasma | `server.ts` | Trivial | 🔵 P4 |
| 20 | `publish-post/config/env.ts` crash | `config/env.ts` | Baixo | 🔵 P4 |
| 21 | Transcoder quebrado | `workers/transcoder.ts` | Baixo | 🔵 P4 |
| 22 | `upload-media` anon key | `upload-media/index.ts` | Trivial | 🔵 P4 |
| 23 | 5 tabelas sem migration | migrations | Médio | 🔵 P4 |

---

## 10. ANEXO: ARQUIVOS AFETADOS

### Edge Functions

| Caminho | Ação |
|---------|------|
| `supabase/functions/process-scheduled-posts/index.ts` | FIX CRÍTICO — adicionar monitor stories_lives + contentType |
| `supabase/functions/publish-post/index.ts` | REVISAR — garantir que contentType chega ao dispatcher |
| `supabase/functions/_shared/platforms/youtube.ts` | FIX — privacyStatus → "public" |
| `supabase/functions/_shared/platforms/tiktok.ts` | FIX — privacy_level (aguardar API auditada) |
| `supabase/functions/_shared/platforms/snapchat.ts` | FIX — retornar erro claro em vez de falso sucesso |
| `supabase/functions/_shared/platforms/kwai.ts` | FIX — retornar erro claro em vez de falso sucesso |
| `supabase/functions/_shared/platforms/rumble.ts` | FIX — retornar erro claro em vez de falso sucesso |
| `supabase/functions/_shared/platforms/truthsocial.ts` | FIX — retornar erro claro em vez de falso sucesso |
| `supabase/functions/_shared/platforms/gettr.ts` | FIX — retornar erro claro em vez de falso sucesso |
| `supabase/functions/_shared/platforms/googlenews.ts` | FIX — retornar erro claro em vez de falso sucesso |
| `supabase/functions/_shared/platforms/spotify.ts` | FIX — implementar ou retornar erro |
| `supabase/functions/collect-social-analytics/index.ts` | FIX — dados mockados (FB, X, TG, Spotify) |
| `supabase/functions/get-analytics/index.ts` | FIX — tabelas ausentes |
| `supabase/functions/publish-post/server.ts` | DELETE — código morto |
| `supabase/functions/publish-post/config/env.ts` | FIX — lookup dinâmico |
| `supabase/functions/publish-post/workers/transcoder.ts` | DELETE ou REESCREVER |
| `supabase/functions/upload-media/index.ts` | FIX — service role key |

### Frontend

| Caminho | Ação |
|---------|------|
| `src/components/dashboard/StoryEditor.tsx` | FIX — restauração de draft |
| `src/components/dashboard/StoriesLivesView.tsx` | FIX — toast duplicado |
| `src/components/dashboard/CreatePostPanel.tsx` | REVISAR — fluxo de story |
| `src/hooks/useScheduledPosts.ts` | FIX — limite de 50 posts |

### Migrations

| Caminho | Ação |
|---------|------|
| Nova migration | Criar trigger/cron para `stories_lives` OU migrar para `scheduled_posts` |
| Nova migration | Criar tabelas `video_retention`, `format_reach_data`, `viral_potential`, `demographics_data` |
| Nova migration | Criar tabela `social_analytics` |

---

## MAPA DE RISCO

```
RISCO ALTO ──────────────────────────────────────
│ Stories agendados NUNCA publicam              │ ← CRIT-01
│ ContentType story PERDIDO no cron             │ ← CRIT-02
│ YouTube/TikTok publicam PRIVADO               │ ← GRAVE-01, GRAVE-02
│ 6 plataformas FINGEM sucesso                 │ ← GRAVE-03
│ ──────────────────────────────────────────────│
│ Facebook views = random(500,1500)             │ ← MEDIO-05
│ X/Twitter views = followers × 1.5             │ ← MEDIO-06
│ Métricas por post só para 2 de 10 plataformas│ ← MEDIO-07
│ ──────────────────────────────────────────────│
│ Nenhuma plataforma aceita localização        │ ← MEDIO-01
│ Nenhuma plataforma aceita @mentions          │ ← MEDIO-02
RISCO BAixo ─────────────────────────────────────
│ Código morto e warnings                       │ ← LEVE 01-05
└───────────────────────────────────────────────┘
```

---

**Próximo passo:** Executar FASE 1 (3 correções críticas) que destravam o fluxo completo de publicação de stories agendados.
