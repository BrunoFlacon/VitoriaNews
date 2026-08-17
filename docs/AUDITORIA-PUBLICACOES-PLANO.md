# 📋 Plano de Auditoria — Publicações & Analytics

> **Projeto:** Social Canvas Hub
> **Data:** 2026-08-13
> **Autor:** Auditoria técnica automatizada
> **Status:** Plano aprovado para execução

---

## 1. Objetivo

Auditar o fluxo **completo de publicação** do Social Canvas Hub: desde os posts criados
no dashboard (rascunho → programado → publicado → arquivado/falha), passando pelos
adapters de publicação por rede social, até a **coleta de analytics e monetização** por
post/rede.

A auditoria responde 3 perguntas:

1. **O que está publicado** — inventário real de posts por status (publicado, arquivado,
   rascunho, programado, falha), com data/hora, perfil/rede, arquivo/mídia e motivo de falha.
2. **A publicação funciona de verdade?** — teste real por rede × formato (texto, foto,
   vídeo, áudio, PDF) usando posts do próprio dashboard.
3. **O analytics existe?** — curtidas, compartilhamentos, comentários, alcance, impressões,
   engajamentos, views, reposts, monetização (RPM, ganhos, retenção, previsão) por post e rede.

---

## 2. Escopo

### 2.1 Redes sociais conectadas (produção)
| Rede | Contas conectadas | Perfis |
|---|---|---|
| Facebook | 15 | Bruno Flacon, Tupã Notícias, Tupã Livre, Ricardo do Val, Web Rádio Vitória, etc. |
| Instagram | 10 | brunoflacon, ricardo_doval, webradiovitoriaa, tupanoticias, etc. |
| YouTube | 2 | Bruno Flacon, Web Rádio Vitória |
| WhatsApp | 1 | Web Rádio Vitória |
| Telegram | 1 | WebRadioVitoria_Newsbot |
| Threads | 1 | webradiovitoriaa |
| TikTok | 1 | webradiovitoria |
| LinkedIn | 1 | brunoflacon@gmail.com |
| **Não conectadas** | — | Twitter/X, Google (desconectadas → falha esperada) |

### 2.2 Adapters de publicação (código)
`supabase/functions/_shared/platforms/` — 18 adapters:
`telegram, whatsapp, x, facebook, instagram, threads, tiktok, linkedin, pinterest,
snapchat, youtube, site, kwai, rumble, truthsocial, gettr, googlenews, spotify`.

> ⚠️ Achado preliminar: pelo menos 8 adapters são **stubs** (retornam `success:true` sem
> chamar API real): tiktok, pinterest, snapchat, site, linkedin, kwai, rumble,
> truthsocial, gettr, googlenews, youtube (parcial).

### 2.3 Tabelas-fonte (produção)
| Tabela | Papel na auditoria |
|---|---|
| `scheduled_posts` | Posts do dashboard: rascunho, programado, publicado, falha |
| `published_posts` | Registro de publicação por plataforma (post_id da rede) |
| `media` | Arquivos (foto, vídeo, áudio, PDF) usados nas publicações |
| `social_connections` | Perfis conectados, tokens, IDs de página/usuário |
| `api_credentials` | Credenciais por plataforma |
| `post_metrics` / `post_metrics_details` | Métricas por post (curtidas, comentários, etc.) |
| `analytics_posts` | Métricas consolidadas por post |
| `account_metrics` | Métricas por conta |
| `youtube_analytics` | Analytics do YouTube |
| `facebook_daily_metrics` / `facebook_daily_earnings` | Métricas/ganhos diários do Facebook |
| `social_monetization_metrics` | Monetização (RPM, ganhos acumulados) |
| `fb_metricas_video_periodo` | Retenção/views de vídeo |
| `system_logs` | Logs de execução |

---

## 3. Matriz de Testes de Publicação

Cada caso = 1 chamada real ao endpoint `/functions/v1/publish-post` (produção), com
`userId` do dono do dashboard, usando **conteúdo e mídia já existentes no dashboard**.

| # | Rede | Formato | Mídia | Critério de sucesso |
|---|---|---|---|---|
| T01 | Facebook | Texto | — | `postId` real do Graph API |
| T02 | Facebook | Foto | JPEG existente | `postId` real do Graph API |
| T03 | Facebook | Vídeo (Reels/FB) | MP4 existente | upload real (adapter não implementa → capturar erro) |
| T04 | Instagram | Foto | JPEG existente | `postId` real (IG Business) |
| T05 | Instagram | Reels (vídeo) | MP4 existente | upload real (adapter usa `image_url` → capturar bug) |
| T06 | Instagram | Story | JPEG existente | publicação real em story |
| T07 | Threads | Texto | — | `postId` real |
| T08 | Threads | Foto | JPEG existente | `postId` real |
| T09 | WhatsApp | Texto | — | `messageId` real |
| T10 | WhatsApp | Foto | JPEG existente | `messageId` real |
| T11 | WhatsApp | Vídeo | MP4 existente | `messageId` real |
| T12 | WhatsApp | Áudio | MP3 de teste | `messageId` real |
| T13 | WhatsApp | PDF | PDF de teste | `messageId` real |
| T14 | Telegram | Texto | — | `messageId` real (canal @TupaNoticias) |
| T15 | Telegram | Foto | JPEG existente | `messageId` real |
| T16 | YouTube | Vídeo longo | MP4 existente | upload real (adapter é stub → capturar sucesso falso) |
| T17 | YouTube | Short | MP4 existente | upload real (idem) |
| T18 | TikTok | Vídeo | MP4 existente | upload real (stub → capturar) |
| T19 | LinkedIn | Texto | — | post real (stub → capturar) |
| T20 | Twitter/X | Texto | — | conta desconectada → falha esperada documentada |

**Saída por caso:** `{ platform, success, postId/messageId, error, tempo, URL usada }`.

---

## 4. Métricas a verificar por post/rede

Para cada publicação detectada (via `published_posts`/resposta do adapter), verificar se
existe linha em `post_metrics`/`analytics_posts` com:

- Curtidas, comentários, compartilhamentos
- Alcance e impressões
- Engajamentos (total e taxa)
- Views, reposts
- Monetização: RPM do post, ganhos acumulados, previsão de monetização
- Retenção de vídeo (média, pós-30s) — `fb_metricas_video_periodo`, `youtube_analytics`
- Histórico temporal (`social_metrics_history`)

**Aceite:** ≥1 métrica por post publicado nas redes que suportam analytics; monetização
preenchida para redes com programa ativo (FB/YouTube).

---

## 5. Procedimento

### Fase A — Inventário (estático)
1. Contar `scheduled_posts` por status (publicado/arquivado/rascunho/programado/falha).
2. Listar falhas com `error_message` (motivo) e mídia associada.
3. Contar `published_posts`, `post_metrics`, `analytics_posts`, `account_metrics`,
   `youtube_analytics`, `social_monetization_metrics`.
4. Detectar posts com status inconsistente (ex.: `published_at` preenchido mas status
   `pending`).

### Fase B — Testes de publicação (dinâmico)
1. Para cada caso T01–T20, invocar `publish-post` com payload real.
2. Comparar resposta vs. chamada real à API da rede (detectar stubs).
3. Registrar resultados em `docs/RELATORIO-AUDITORIA-PUBLICACOES.md`.

### Fase C — Verificação de analytics
1. Após publicações, aguardar coleta (`collect-social-analytics`).
2. Verificar presença/ausência de métricas por post/rede.
3. Reportar lacunas (ex.: tabelas vazias, campos não preenchidos).

### Fase D — Relatório final
Documentar: ✅ o que funciona · ❌ o que não funciona · 🔧 correções aplicadas ·
⏳ pendências.

---

## 6. Critérios de aceite da auditoria

| Critério | Meta |
|---|---|
| Publicação real (não-stub) | 100% das redes conectadas com adapter real |
| Motivo de falha registrado | 100% dos casos de falha |
| Rastreabilidade post→rede→métricas | 100% dos posts publicados no período |
| Analytics por post | ≥1 linha por post nas redes com suporte |
| Monetização | Valores presentes onde o programa existe |
| Relatório final | Documentado com evidências (IDs reais das postagens) |
