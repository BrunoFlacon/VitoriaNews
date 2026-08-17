# PLANO DE AÇÃO — CORREÇÃO DOS ADAPTERS DE PUBLICAÇÃO

> Data: 13/08/2026 · Projeto: Social Canvas Hub (`ghtkdkauseesambzqfrd`)
> Baseado na auditoria real de `supabase/functions/_shared/platforms/*.ts` (13/08/2026).

---

## 1. RESUMO EXECUTIVO

Os adapters atuais são majoritariamente **placeholders ("sucesso falso")** ou implementações
**parciais** que só suportam texto/foto. Os formatos que o dashboard oferece (story, carousel,
reels, shorts, lives, áudio, vídeo, documento) **não têm implementação real** em quase nenhuma
plataforma.

**Problema mais grave:** 4 plataformas retornam `success: true` sem publicar nada
(TikTok, YouTube, LinkedIn sem `person_urn`, Pinterest) — o relatório engana o usuário.

| Plataforma | Texto | Foto | Vídeo | Áudio | PDF/Doc | Story | Carrossel | Reels/Shorts | Live |
|---|---|---|---|---|---|---|---|---|---|
| Telegram | ✅ | ⚠️ sendPhoto | ❌ envia p/ photo | ❌ | ❌ | ✅ (nativo) | n/a | n/a | ✅ (nativo) |
| WhatsApp | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ status (não oficial) | n/a | n/a | n/a |
| Facebook | ✅ | ⚠️ 1 foto = 1 post | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ reels (não mapeado) | ⚠️ |
| Instagram | ✅ | ✅ | ⚠️ sempre REELS | ❌ | ❌ | ✅ | ❌ | ⚠️ não distingue | ⚠️ |
| Threads | ✅ | ✅ (1 imagem) | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a |
| TikTok | ❌ placeholder | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| YouTube | n/a | n/a | ❌ falso | ❌ | ❌ | n/a | n/a | ❌ falso | ❌ falso |
| LinkedIn | ✅ (sem URN: falso) | ❌ | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a |
| X/Twitter | ✅ | ❌ só URL no texto | ❌ | ❌ | ❌ | n/a | ❌ | n/a | ❌ (Space) |
| Pinterest | ❌ placeholder | ❌ | ❌ | ❌ | ❌ | n/a | ❌ | n/a | n/a |

---

## 2. AUDITORIA DETALHADA (ESTADO ATUAL — 13/08/2026)

### 2.1 Telegram — `telegram.ts`
- **O que tem:** `sendMessage` (texto) e `sendPhoto` (foto com caption).
- **Bugs:**
  - Áudio/PDF/vídeo caem no `sendPhoto` → erro `Telegram API Error: wrong file identifier/HTTP URL specified` (mídia E04-E06 das auditorias).
  - Só envia o **primeiro** `mediaUrls[0]`; múltiplos anexos ignorados.
- **Fix:** usar `sendAudio`/`sendDocument`/`sendVideo`/`sendAnimation` conforme extensão; múltiplos anexos em album (`sendMediaGroup`).

### 2.2 WhatsApp — `whatsapp.ts`
- **O que tem:** inferência de tipo por extensão (`inferMediaType`) — **melhor implementação do codebase**, serve de modelo.
- **Faltas:** story/status (API oficial não suporta); template header media OK.
- **Fix:** nenhum bloqueante. Reaproveitar `inferMediaType` → mover para módulo compartilhado.

### 2.3 X/Twitter — `x.ts`
- **O que tem:** texto via API v2 (`POST /2/tweets`); mídia = URL anexada ao texto (aceitável como fallback, porém não é upload real).
- **Bugs:** token usado como `Bearer` direto — para OAuth 2.0 user context o correto é `OAuth` header com token do tipo `access_token` (funciona se token for Bearer user token; a conta real retornou "credits depleted", ou seja, o fluxo chega à API).
- **Fix (fase 2):** upload de mídia real via `media/upload` (v1.1, chunked) + `POST /2/tweets` com `media_ids`; fotos e vídeos.

### 2.4 Facebook — `facebook.ts`
- **O que tem:** texto → `/{page}/feed`; fotos → `/{page}/photos` **cada foto como post separado** (sem álbum/carrossel).
- **Bugs:**
  - Vídeo URL → `/{page}/photos` (falha ou cria post errado). Precisa `/{page}/videos` (e reels via `/{page}/video_reels`).
  - Sem story: precisa `/{page}/story` com `media_type`.
  - Sem carrossel: precisa `/{page}/feed` com `attached_media` (children publicadas com `published=false`).
- **Fix:** ramificar por `contentType` + extensão; carrossel com container por item + `child_attachments`.

### 2.5 Instagram — `instagram.ts`
- **O que tem:** container por mídia com poll `waitForContainerReady`; vídeo sempre `REELS`; story via `STORIES`.
- **Bugs:**
  - Vídeo de feed (não-reel) não existe — precisa `media_type: VIDEO`.
  - **Carrossel não implementado** — precisa `media_type: CAROUSEL` + containers `children` (até 10) + publicação única.
  - Story de vídeo usa `video_url` — OK, mas sem `thumb_offset`/`share_to_feed` options.
- **Fix:** ramificar `contentType`/extensão → `REELS` (curto) vs `VIDEO` (feed) vs `CAROUSEL` (2+ imagens) vs `STORIES`.

### 2.6 Threads — `threads.ts`
- **O que tem:** texto e 1 imagem (`media_type: IMAGE`).
- **Faltas:** vídeo (`VIDEO` + `video_url`); carousel (`CAROUSEL` + children containers em `graph.threads.net`). API v1.0 suporta os 3.
- **Fix (fase 1/2):** adicionar `VIDEO` e `CAROUSEL`; poll de status do container (idêntico ao IG).

### 2.7 TikTok — `tiktok.ts` ⚠️ **placeholder (sucesso falso)**
- **O que tem:** NADA — retorna `success: true, info: 'TikTok API implementation pending.'`.
- **Bugs:** engana o relatório; credenciais corretas já existem (`client_key=sbawuza2pkv8csnrh3`, access_token OK).
- **Fix (fase 2, exige API real):** Content Posting API — `POST /v2/post/publish/init/` (obtém `publish_id` via upload de mídia com `POST /v2/post/publish/content/init/`), depois `POST /v2/post/publish/status/fetch/`. Foto: `photo_init`. Vídeo curto = formato padrão; vertical ≤ 10 min.

### 2.8 YouTube — `youtube.ts` ⚠️ **placeholder (sucesso falso)**
- **O que tem:** retorna `success: true` com metadata e `info: "requires raw file stream"` — **não publica**.
- **Bugs:** nenhuma chamada à YouTube Data API v3; sem distinção shorts/longo/live.
- **Fix (fase 2, exige download do arquivo + multipart):**
  - Short vertical (<60s, ≤1080x1920): `videos.insert` com `snippet` + `status.selfDeclaredMadeForKids` etc.
  - Vídeo longo: `videos.insert` com `privacyStatus` + `categoryId` (media via upload resumable).
  - Live: `liveBroadcasts.insert` + `liveStreams.insert` + `videos.insert` (bind), status `complete`/`testStarting`.

### 2.9 LinkedIn — `linkedin.ts` ⚠️ **pendente (sucesso falso)**
- **O que tem:** sem `person_urn` → `pendingUrn` (honesto); com URN → `pendingIntegration` (falso, não envia).
- **Fix (fase 2, exige `person_urn` e token `w_member_social`):** `POST /rest/posts` com `author=urn:li:person:{id}`, `lifecycleState=PUBLISHED`, `distribution` + `content`; mídia via `registerUpload` + `initializeUpload`.
- **Ação imediata:** preencher `person_urn` na conexão real (bloqueio externo do usuário).

### 2.10 Pinterest — `pinterest.ts` ⚠️ **placeholder (sucesso falso)**
- **Fix (fase 3):** `POST /v5/pins` com `media_source.type=image_url/video_url`, `board_id`, `description`.

### 2.11 Demais (Snapchat, Kwai, Rumble, TruthSocial, Gettr, GoogleNews, Spotify, Site)
- Placeholders ou integrações exóticas; fora do escopo prioritário. **Remover do cardápio ou marcar "em breve"** para evitar sucesso falso.

---

## 3. CORREÇÕES TRANSVERSAIS (TODAS AS PLATAFORMAS)

| ID | Correção | Impacto |
|---|---|---|
| T1 | **Criar `_shared/media.ts` com `detectMediaType(url)` + `detectKind(ext)`** (imagem/vídeo/áudio/documento; vertical/quadrado/horizontal) — hoje cada adapter infere do seu jeito | Padroniza e desbloqueia distinção reels/shorts/longo |
| T2 | **Remover todos os "sucesso falso"** (TikTok, YouTube, Pinterest, LinkedIn sem URN): placeholder deve retornar `unsupported: true`/`pending: true`, nunca `success` | Relatórios honestos |
| T3 | **`dispatcher.ts`:** mapear `contentType` declarado para cada plataforma; rejeitar combinação não suportada com erro claro | UX |
| T4 | **`getPlatformCredentials`:** expor também `client_key`/`client_id`/`app_id` por plataforma (para tokens/APIs que pedem o app) | OAuth + APIs |
| T5 | **Timeout/retry global** para chamadas às APIs externas (fetch com `AbortSignal.timeout`) | Robuster |
| T6 | **Upload de URL→bytes** para plataformas que exigem arquivo (YouTube/TikTok): baixar mídia do storage assinado, re-upload multipart; validar o 400 do `object/sign` | Desbloqueia YouTube/TikTok |

---

## 4. FASES DE EXECUÇÃO (COM TESTES/UAT)

### FASE 1 — Correções rápidas e testáveis agora (P0) ✅ em execução
| Item | O que | UAT |
|---|---|---|
| F1.1 | **Telegram:** `sendAudio`/`sendDocument`/`sendVideo`/`sendAnimation` por extensão; múltiplos anexos em `sendMediaGroup` | ✅ **FEITO** — áudio (msg 18), PDF (msg 19), vídeo (msg 20) publicados em @TupaNoticias |
| F1.2 | **`_shared/media.ts`:** `detectMediaType` + `detectOrientation` (reuso WhatsApp→todas) | ✅ **FEITO** — usado por publish-post, telegram, instagram, facebook, threads |
| F1.3 | **Instagram carrossel:** `media_type=CAROUSEL` com children (2-10 mídias) | ✅ **FEITO** — carrossel 3 imagens publicado (postId `18082724984677455`) |
| F1.4 | **Instagram vídeo de feed** vs REELS (por duração/orientação quando possível) | ✅ **FEITO** — `detectOrientation`: horizontal→VIDEO, vertical→REELS |
| F1.5 | **Facebook story:** `/{page}/story` (foto/vídeo) | ⚠️ **CÓDIGO FEITO** — Meta retorna "does not support this operation" para a página de teste (permissão/recurso desabilitado na página) |
| F1.6 | **Facebook carrossel:** `attached_media` com children `published=false` | ✅ **FEITO** — carrossel 3 imagens publicado (`102063242835968_1032259759806910`) |
| F1.7 | **Threads vídeo:** `media_type=VIDEO` + poll | ✅ **FEITO** — código pronto (teste real pendente: token Threads inválido — reauth) |
| F1.8 | **Remover sucesso falso** (TikTok/YouTube/Pinterest → `unsupported`) | ✅ **FEITO** — 3 plataformas retornam `success:false` honesto (testado) |

### FASE 2 — Integrações reais (P1, exige API keys/escopos)
| Item | O que | Pré-requisito |
|---|---|---|
| F2.1 | **YouTube:** upload resumable (short/longo) + lives | OAuth escopo `youtube.upload`; URL de mídia baixável |
| F2.2 | **TikTok:** Content Posting API (init/status) foto+vídeo | Access token com `video.publish` (já existe) |
| F2.3 | **LinkedIn:** Posts API com upload de imagem/vídeo | `person_urn` preenchido na conexão |
| F2.4 | **X:** upload de mídia v1.1 + `media_ids` em `POST /2/tweets` | OAuth1a token (ou Bearer) com permissão de mídia |
| F2.5 | **Threads carrossel:** `CAROUSEL` + children | API v1.0 carousel (liberado por app) |
| F2.6 | **Facebook reels/vídeo:** `/{page}/video_reels` e `/{page}/videos` | — |

### FASE 3 — Expansão (P2)
| Item | O que |
|---|---|
| F3.1 | Pinterest `POST /v5/pins` |
| F3.2 | WhatsApp status (via API não-oficial/limitações documentadas) |
| F3.3 | Lives IG/YouTube/FB com status e agendamento |

---

## 5. PRIORIZAÇÃO CONSOLIDADA (P0/P1/P2)

**P0 (fazer agora — erros reais ou sucesso falso):**
1. Telegram áudio/PDF/vídeo (E04-E06 das auditorias).
2. Remover sucesso falso de TikTok/YouTube/Pinterest/LinkedIn.
3. Instagram carrossel + vídeo de feed vs reels.
4. Facebook story + carrossel.
5. `_shared/media.ts` (detectMediaType/detectOrientation).

**P1 (próximas semanas — desbloqueia plataformas principais):**
6. YouTube upload real (short/longo/live).
7. TikTok Content Posting API.
8. LinkedIn Posts API (após preencher person_urn).
9. X upload de mídia.

**P2 (quando houver demanda):**
10. Pinterest; lives avançadas; WhatsApp status.

---

## 6. BLOQUEIOS EXTERNOS (AÇÕES DO USUÁRIO)

- **LinkedIn `person_urn`:** não configurado na conexão `75b990f3-...` → publicações ficam pendentes. Em Configurações → LinkedIn, salvar o URN `urn:li:person:...`.
- **Threads reauth:** token antigo inválido (401 code 190) → reconectar conta Threads.
- **X/Twitter créditos:** API retornou "credits depleted" na conta conectada → verificar plano de API X.
- **YouTube OAuth:** conectar conta Google com escopo `youtube.upload`.

---

## 7. COMO TESTAR (UAT RÁPIDO)

```bash
# Deploy das funções alteradas
.\node_modules\.bin\supabase.cmd functions deploy publish-post --project-ref ghtkdkauseesambzqfrd --no-verify-jwt

# Disparo real (ex.: Telegram áudio)
curl -X POST https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/publish-post ^
  -H "Authorization: Bearer <SRK>" -H "Content-Type: application/json" ^
  -d "{\"userId\":\"38cd9720-494e-406a-853d-19d81ae85e99\",\"platform\":\"telegram\",\"contentType\":\"audio\",\"content\":\"teste audio\",\"mediaUrls\":[\"<url assinada .mp3>\"],\"options\":{\"chatId\":\"@TupaNoticias\"}}"

# Conferir o relatório real (post_sync_log / published_posts)
```
