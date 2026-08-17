# PLANO DE AUDITORIA E CORREÇÃO — PUBLICAÇÃO DE ARQUIVOS (X, Threads, LinkedIn, WhatsApp, TikTok)

> Data: 14/08/2026 — Projeto: Social Canvas Hub (`ghtkdkauseesambzqfrd`)
> Baseado na auditoria real de `supabase/functions/_shared/platforms/*.ts` + estado do banco (conexões/tokens) em 14/08/2026.
> Contexto: Facebook, Instagram, Telegram, YouTube já publicam arquivos reais (corrigidos nos planos anteriores).

---

## 1. RESUMO EXECUTIVO

O usuário quer publicar **arquivos (imagem, vídeo, áudio, PDF) com descrição e título do vídeo**
nas plataformas que ainda não conseguem: **X (Twitter), Threads, LinkedIn, WhatsApp e TikTok**.

Auditoria real do código e do banco mostra que:

| Plataforma | Texto | Foto | Vídeo | Áudio | PDF/Doc | Conexão no banco |
|---|---|---|---|---|---|---|
| **X / Twitter** | ✅ `POST /2/tweets` | ❌ cola a URL no texto | ❌ cola a URL no texto | ❌ não suportado pela API | ❌ não suportado pela API | ⚠️ `is_connected=false`, token aparentemente expirado |
| **Threads** | ✅ | ✅ `IMAGE` | ✅ `VIDEO` (já implementado) | ❌ API não suporta | ❌ API não suporta | ⚠️ conectado, mas `access_token=null` na conexão (fallback via `api_credentials.threads`) |
| **LinkedIn** | ✅ `/rest/posts` | ✅ upload 2-passos | ❌ **precisa** `/rest/videos` | ❌ API não suporta | ❌ **precisa** `/rest/documents` | ✅ conectado (`75b990f3`, person_urn resolvida) |
| **WhatsApp** | ✅ | ✅ via `link` | ✅ via `link` | ✅ via `link` | ✅ via `link` | ✅ conectado (phone_number_id OK) |
| **TikTok** | n/a (API só vídeo/foto) | ❌ `photo/init` não implementado | ✅ `FILE_UPLOAD` — **bloqueado por política** (app não auditado) | ❌ API não suporta | ❌ API não suporta | ✅ conectado (token válido até 15/08) |

**Problemas confirmados nesta auditoria:**

1. **X/Twitter (`x.ts:22-25`)**: mídia é **falsa** — anexa `mediaUrls[0]` como texto no corpo do tweet.
2. **LinkedIn (`linkedin.ts:160-163`)**: vídeo/documento lançam erro "ainda não suportado" — falta upload real.
3. **TikTok (`tiktok.ts`)**: vídeo implementado (`FILE_UPLOAD`), mas **nenhum teste de foto** e bloqueado por `unaudited_client_can_only_post_to_private_accounts`.
4. **Título de vídeo**: o frontend tem campo `videoTitle` (CreatePostPanel), mas ele **só alimenta o preview** — não é salvo nem enviado ao `publish-post` (o backend usa `content` como título).
5. **WhatsApp**: usa `link` (URL) em vez de `media_id` — funciona, mas depende da URL estar acessível no momento do download do Meta (risco com signed URLs expirando).
6. **Threads**: vídeo já existe; falta testar E2E e verificar validade do token (expiração 27/07, token real em `api_credentials`).

---

## 2. AUDITORIA DETALHADA POR PLATAFORMA

### 2.1 X / Twitter — `x.ts` (2.047 bytes)

**Código atual:**
- Texto: `POST https://api.twitter.com/2/tweets` com `{ text }` — ✅ funciona.
- Mídia (linhas 22-25): `body.text = content + "\n\n" + mediaUrls[0]` — **não faz upload**, apenas cola a URL.
- Retorna `{ success, tweetId, profileId, url }` — permalink ✅.

**Estado da conexão (banco):**
- `social_connections` platform `twitter`: `id=514d7df2-...`, `is_connected=false`, `is_primary=true`, username `WebRadi0Vitoria`.
- `access_token` presente (`VnlCSVlDOHFycUlSSHBtazI2...:1786682955226:1:0:at:1`) mas `token_expires_at=2026-08-14T06:49` (aparentemente expirado).
- `api_credentials.twitter`: `client_id` (client-key) + `access_token` (app-only Bearer `AAAAAAAAAAAAAAAAAAAAADLW7wE...`) — app-only Bearer **não publica** tweets (só leitura).

**Plano:**
- [ ] Implementar **Media Upload API v1.1** (`upload.twitter.com/1.1/media/upload.json`):
  - Imagens/GIFs: INIT (com `media_type` e `total_bytes`) → APPEND (chunks base64) → FINALIZE → `media_id_string`.
  - Vídeos: INIT → APPEND (chunks ≤ 5 MB) → FINALIZE → **poll** `media/upload` (status de processamento) até `succeeded`.
- [ ] `POST /2/tweets` com `media: { media_ids: [media_id] }` + texto.
- [ ] Áudio/PDF → **erro honesto** ("X não suporta áudio/documentos; publique como texto/link").
- [ ] Truncar caption do X a 280 chars (limite da API v2).
- [ ] Verificar validade do token: testar `GET /2/users/me` com o token da conexão. Se inválido → manter erro de reconexão claro (não há como publicar sem token de usuário).
- [ ] Teste E2E: texto (deve funcionar se token válido), imagem (após upload real).

### 2.2 Threads — `threads.ts` (3.408 bytes)

**Código atual:**
- Texto: container `{ text }` → publish — ✅.
- Imagem: `media_type: IMAGE` + `image_url` + poll `waitForContainerReady` — ✅.
- Vídeo: `media_type: VIDEO` + `video_url` + poll — ✅ (já implementado).
- Áudio/PDF: cairiam em IMAGE com URL inválida → erro confuso. Precisa erro honesto.
- Carousel: não implementado (API v1.0 suporta `CAROUSEL` com containers children, até 10 itens).

**Estado da conexão (banco):**
- `social_connections` platform `threads`: `id=1694f354-...`, `is_connected=true`, `platform_user_id=27340023768916761`, mas **`access_token=null`** e `token_expires_at=2026-07-27`.
- `api_credentials.threads`: **tem `access_token`** (`EAANe0ZAy...`) → `getThreadsCredentials` usa o fallback (linhas 131-156) e retorna o token do api_credentials. **Pode funcionar ainda.**

**Plano:**
- [ ] Adicionar erro honesto para áudio/documento ("Threads aceita apenas imagem e vídeo").
- [ ] (Opcional) Carousel via `CAROUSEL` + children containers.
- [ ] Teste E2E: texto, imagem, vídeo (valida token real do `api_credentials`).
- [ ] Se token expirado → orientar reconexão (não é bug de código).

### 2.3 LinkedIn — `linkedin.ts` (6.795 bytes)

**Código atual:**
- Texto: `POST /rest/posts` (version `202601`, `x-restli-id`) — ✅ testado (`[LI-REAL3]`).
- Imagem única: `initializeUpload` (`/images?action=initializeUpload`) → upload binário → `content.media.id` — ✅.
- Vídeo (linhas 160-163): **erro honesto** "vídeo ainda não suportado" — ❌ falta implementação.
- Documento: **erro honesto** "documento ainda não suportado" — ❌ falta implementação.
- Carrossel (linha 156-158): erro "carrossel não suportado".

**Plano:**
- [ ] **Vídeo** — endpoint `POST /rest/videos?action=initializeUpload` (mesma versão `202601`):
  1. `initializeUpload` → `value.uploadUrl` + `value.video` (URN) + `value.uploadToken`.
  2. Upload em chunks (5-10 MB) para `uploadUrl` com headers `part` e `media-type: video/mp4`.
  3. `POST /rest/videos?action=finalizeUpload` com `{ video: urn, uploadToken }`.
  4. `POST /rest/posts` com `content.media = { id: videoUrn, title, description }`.
- [ ] **Documento** — `POST /rest/documents?action=initializeUpload` (PDF/DOC/PPT/XLS):
  1. init → uploadUrl; 2. upload binário; 3. finalize; 4. post com `content.media.id`.
- [ ] Áudio → erro honesto ("LinkedIn não suporta áudio em posts").
- [ ] **Título do vídeo** — usar `options.title` quando disponível (fallback: `content`).
- [ ] Teste E2E: vídeo (`[LI-VIDEO]`), PDF (`[LI-DOC]`).

### 2.4 WhatsApp — `whatsapp.ts` (6.566 bytes)

**Código atual:**
- Melhor inferência do codebase (`inferMediaType` por extensão) — ✅.
- Imagem/vídeo/áudio/documento via Cloud API com `{ link: mediaUrls[0] }` — ✅ implementado.
- Template messages com header media — ✅.
- Erro honesto se sem destinatário (`recipientPhone`/`chatId`) — ✅.

**Plano:**
- [ ] (Robustez) **Upload de mídia para o Meta** → `POST /{phone_number_id}/media` com bytes multipart → `media_id` → enviar com `{ id: media_id }`. Elimina dependência de URL pública (signed URL que expira).
- [ ] Truncar caption para 1024 chars (limite Cloud API) e validar extensões rejeitadas pelo WhatsApp (ex: `.svg` não é aceito como imagem).
- [ ] Nome de arquivo com caracteres inválidos sanitizado.
- [ ] Teste E2E: imagem, vídeo, áudio (mp3), PDF para o chat de teste (`-1001457950404`? não — WhatsApp precisa de telefone do destinatário; usar um número de teste conhecido ou erro honesto se não houver).

### 2.5 TikTok — `tiktok.ts` (6.606 bytes)

**Código atual:**
- Vídeo: `FILE_UPLOAD` (init → PUT bytes → poll status) — ✅ implementado, testado, **bloqueado por política** `unaudited_client_can_only_post_to_private_accounts` (app não revisado só posta para conta privada) — erro acionável já adicionado.
- Foto: **não implementado**.
- Áudio/PDF: cairiam no fluxo de vídeo → erro confuso.

**Estado da conexão (banco):**
- `social_connections` platform `tiktok`: `id=8062240b-...`, conectado, token válido até **15/08/2026** (expira amanhã).

**Plano:**
- [ ] **Foto** — `POST /v2/post/publish/photo/init/` com `source_info.source=FILE_UPLOAD`, `photo_size`, `photo_index`; múltiplas fotos (carousel de até 35); depois upload e `status/fetch/`. Mesmo bloqueio de política provavelmente se aplica.
- [ ] Áudio/PDF → erro honesto ("TikTok aceita apenas vídeo ou fotos").
- [ ] Título do vídeo: `post_info.title = options.title || content`.
- [ ] Teste E2E: foto (esperado: mesmo 403 de política ou sucesso se a conta estiver privada).

### 2.6 Transversal — Título do vídeo e fluxo de dados

**Problema:** `videoTitle` existe no `CreatePostPanel.tsx` (linha 292) mas só vai para o `PostPreview` (prévia). O `usePublisher.ts` (linhas 58-63) envia só `{ postId, platforms, content, mediaUrls }`; o `publish-post/index.ts` (linhas 178-193) não desestrutura `title`; nenhum adapter recebe título separado.

**Plano:**
- [ ] `publish-post/index.ts`: aceitar `title` no body → `options.title`.
- [ ] `dispatcher.ts`: documentar `options.title` no `PublishPayload`.
- [ ] `youtube.ts`: `snippet.title = options.title || content` (linha 71).
- [ ] `tiktok.ts`: `post_info.title = options.title || content` (linha 122).
- [ ] `linkedin.ts`: `content.media.title = options.title || content` (vídeo).
- [ ] Frontend `CreatePostPanel.tsx`: salvar `metadata.videoTitle` no post (`createPost`/`updatePost`) e enviar `title` no body de publicação imediata.
- [ ] Frontend `usePublisher.ts`: `publishPost(..., title?)` + `publishNow(..., title?)`.

---

## 3. MATRIZ FINAL ESPERADA (após correções)

| Plataforma | Texto | Foto | Vídeo | Áudio | PDF/Doc | Story | Carrossel | Reels/Shorts | Live |
|---|---|---|---|---|---|---|---|---|---|
| X / Twitter | ✅ | ✅ upload v1.1 | ✅ upload v1.1 (≤ 512 MB) | ❌ honesto | ❌ honesto | n/a | ❌ honesto | n/a | n/a |
| Threads | ✅ | ✅ | ✅ | ❌ honesto | ❌ honesto | n/a | ✅ (fase 2) | n/a | n/a |
| LinkedIn | ✅ | ✅ | ✅ upload real | ❌ honesto | ✅ documentos | n/a | ❌ honesto | n/a | n/a |
| WhatsApp | ✅ | ✅ media_id | ✅ media_id | ✅ media_id | ✅ media_id | ❌ (API) | n/a | n/a | n/a |
| TikTok | n/a | ✅ photo | ✅ FILE_UPLOAD* | ❌ honesto | ❌ honesto | n/a | ✅ fotos (fase 2) | ✅ | n/a |

\* TikTok: vídeo funciona tecnicamente; **bloqueado até** conta virar privada OU App Review. Fora do escopo de código.

---

## 4. EXECUÇÃO (ordem de implementação)

1. **Fase A — título de vídeo (transversal, baixo risco):** publish-post + dispatcher + youtube + tiktok + linkedin + frontend.
2. **Fase B — X/Twitter:** Media Upload v1.1 (imagem + vídeo) + media_ids + erros honestos.
3. **Fase C — LinkedIn:** vídeo (initializeUpload/finalizeUpload) + documento + título.
4. **Fase D — TikTok:** foto (`photo/init`) + erros honestos + título.
5. **Fase E — WhatsApp:** media_id upload + caption 1024 + sanitização.
6. **Fase F — Threads:** erros honestos áudio/doc + (opcional carousel) + teste de token.
7. **Validação E2E** (via `publish-post` direto e via cron `process-scheduled-posts`):
   - X: `[X-MIDIA]` foto + vídeo (se token válido).
   - LinkedIn: `[LI-VIDEO]` vídeo + `[LI-DOC]` PDF.
   - TikTok: `[TK-PHOTO]` foto (esperado 403 política) + `[TK-VIDEO]` (esperado 403 política).
   - WhatsApp: `[WA-MIDIA]` imagem/vídeo/áudio/PDF (precisa destinatário real).
   - Threads: `[TH-MIDIA]` imagem/vídeo (valida token api_credentials).
   - Título: `[YT-TITLE]` vídeo no YouTube com título customizado.
8. **Deploy:** `supabase functions deploy publish-post` (empacota `_shared`).
9. **Relatório:** atualizar `docs/RELATORIO-AUDITORIA-PUBLICACOES.md` com a nova matriz.

---

## 5. BLOCKERS E RISCOS (honestos)

- **X/Twitter:** sem conexão de usuário ativa (`is_connected=false`, token expirado). Publicação real exige **reconexão OAuth** do usuário (fora do escopo de código). A implementação do upload estará pronta e testável quando houver token.
- **TikTok:** política `unaudited_client_can_only_post_to_private_accounts` bloqueia vídeo e foto para conta pública. Requer conta privada ou App Review.
- **WhatsApp:** publicação exige **destinatário** (`recipientPhone`/`chatId`) — sem ele, erro honesto (já implementado).
- **Threads:** token de usuário pode estar expirado (27/07). Validação no teste E2E; se expirado, reconexão necessária.
- **LinkedIn vídeo:** formato deve ser MP4 (H.264), tamanho ≤ 200 MB, duração 3 s–30 min (limites da API).
- **X vídeo:** limites de tamanho (512 MB / 2h20), processamento assíncrono → poll de status.
