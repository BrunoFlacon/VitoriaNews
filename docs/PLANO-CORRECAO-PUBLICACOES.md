# 🔧 Plano de Auditoria — Correção de Erros de Publicação + Sincronização Editar/Apagar Posts

> **Projeto:** Social Canvas Hub · **Data:** 2026-08-14 · **Base:** [RELATORIO-AUDITORIA-PUBLICACOES.md](./RELATORIO-AUDITORIA-PUBLICACOES.md)
> **Objetivo:** (1) corrigir os erros de publicação por formato de arquivo/plataforma detectados nos testes reais; (2) criar ferramenta para **editar e apagar posts já publicados** de forma que a alteração/exclusão no dashboard seja refletida automaticamente nas plataformas.

---

## 1. Contexto (resultados da auditoria de 2026-08-13)

### 1.1 Publicações que FUNCIONAM (testes reais, IDs reais)
| Rede | Formatos OK | Evidência |
|---|---|---|
| Facebook | Texto, Foto | `323348644425052_1677918014333813`, `1677918074333807` |
| Instagram | Foto, Reels, Story | `18016307753863772`, `18140823175561092`, `18170868304446768` |
| Telegram | Texto, Foto | messageId `14`, `15` |

### 1.2 Erros de publicação por formato/plataforma (a CORRIGIR)
| # | Rede | Formato | Erro capturado | Tipo | Correção necessária |
|---|---|---|---|---|---|
| E01 | Facebook | Vídeo | `Invalid parameter` | Código | Implementar `POST /{page}/videos` (upload com `file_url`) |
| E02 | Facebook | Áudio MP3 | `Invalid parameter` (vai p/ `/photos`) | Código | Rota de áudio ou `file_url` + tipo de mídia |
| E03 | Facebook | PDF | `Invalid parameter` (vai p/ `/photos`) | Código | Rota de documento/conteúdo |
| E04 | Telegram | Áudio MP3 | `wrong type of the web page content` (vai p/ `sendPhoto`) | Código | Implementar `sendAudio` |
| E05 | Telegram | PDF | `wrong type of the web page content` | Código | Implementar `sendDocument` |
| E06 | Telegram | Vídeo | não suportado | Código | Implementar `sendVideo` |
| E07 | Instagram | Carrossel | **Publica N posts separados** (`18075299789414139` + `18119325616687348`) + resposta corrompida `{0:…,1:…}` | Código | Implementar `media_type=CAROUSEL` com `children` + aplainar arrays no publish-post |
| E08 | Instagram | Vídeo Shorts (vertical) | só REELS é suportado | Código | Validar/definir comportamento |
| E09 | Threads | Todos | `401 Cannot parse access token` | **Config** | **Reautenticar OAuth** (token corrompido no banco) |
| E10 | Threads | Vídeo | adapter só envia `media_type=IMAGE` | Código | Suportar `media_type=VIDEO` |
| E11 | WhatsApp | Todos | `(#133010) Account not registered` | **Config Meta** | Ativar número na WABA (`107006452268135` vs `104471639297435`) |
| E12 | YouTube | Vídeo/Short | stub (não faz upload) | Código | Implementar upload real (resumable + categorias Shorts) |
| E13 | TikTok | Vídeo | stub (`implementation pending`) | Código | Implementar Content Posting API |
| E14 | X/Twitter | Mídia | URL anexada como texto | Código | Chunked upload v1.1 + `media_ids` |
| E15 | X/Twitter | Publicação com conta desconectada | tweet real publicado por bug | Código | ✅ **já corrigido** (validação `isConnected`) |

### 1.3 Classificação de prioridade
- **P0 (config, sem código):** E09 Threads reauth, E11 WhatsApp Meta
- **P1 (código, alto impacto):** E07 carrossel, E12 YouTube, E13 TikTok
- **P2 (código, médio):** E01/E02/E03 Facebook mídia, E04/E05/E06 Telegram mídia, E10 Threads vídeo, E14 X mídia

---

## 2. Fase 1 — Correções de Adapters (formato × plataforma)

### 2.1 Facebook (`_shared/platforms/facebook.ts`)
- [ ] `POST /{page_id}/videos?file_url=...&description=...` para vídeo
- [ ] Áudio/PDF: verificar suporte da Graph API (`/videos` não aceita áudio) → mapear ou retornar erro explícito "formato não suportado" (nunca `Invalid parameter` silencioso)

### 2.2 Telegram (`_shared/platforms/telegram.ts`)
- [ ] `sendAudio` (MP3) · `sendDocument` (PDF) · `sendVideo` (MP4) — usando `mediaUrls[0]` + caption
- [ ] Fallback de chatId (channel username) já existente

### 2.3 Instagram (`_shared/platforms/instagram.ts`)
- [ ] **Carrossel**: se `contentType === 'carousel'` e `mediaUrls.length > 1` → criar N containers de imagem/vídeo, depois `media_publish` do carrossel com `children` (IDs dos containers)
- [ ] Aplainar resultados (array) para o publish-post não corromper a resposta

### 2.4 Threads (`_shared/platforms/threads.ts`)
- [ ] Suportar `media_type=VIDEO` (e `AUDIO`, se a API permitir)
- [ ] (config) Reautenticação OAuth — token novo em `social_connections.access_token`

### 2.5 YouTube / TikTok (stubs)
- [ ] YouTube: upload resumable (`/upload/videos?uploadType=resumable`) + `videos.insert` com snippet (título/descrição/categoria) — diferenciar Shorts (`#Shorts` no título ou `videoCategoryId`)
- [ ] TikTok: Content Posting API (`/v2/post/publish/content/init/` + `content/upload/`) com vídeo real

### 2.6 X (`_shared/platforms/x.ts`)
- [ ] Upload de mídia (chunked v1.1) → `media_ids` no POST /2/tweets
- [ ] Manter validação `isConnected`

### 2.7 WhatsApp (config, fora de código)
- [ ] Ativar número de envio na WABA no Meta Business → revalidar E11

---

## 3. Fase 2 — Ferramenta Editar/Apagar Posts Publicados (NOVO)

### 3.1 Persistência — tabela `published_posts` (migração)
Colunas atuais: `id, user_id, post_id, platform, platform_post_id, published_at, created_at`
**Adicionar:**
- [ ] `status text NOT NULL DEFAULT 'active'` (`active` | `edited` | `deleted`)
- [ ] `url text` — link público do post na plataforma (quando a API retorna)
- [ ] `edited_at timestamptz` · `deleted_at timestamptz` · `last_sync_at timestamptz`
- [ ] `metadata jsonb` — chatId (Telegram), page_id (Facebook), etc. p/ operações futuras
- [ ] Índice `(post_id, platform)` e `(user_id, status)`
- [ ] RLS (owner-only)

**publish-post passa a gravar uma linha por plataforma publicada com sucesso** (é o elo que faltava p/ analytics + sync).

### 3.2 Novas Edge Functions
| Função | Entrada | Saída |
|---|---|---|
| `update-post` | `{ postId, content?, mediaUrls?, platforms?, userId? }` | `{ results: [{platform, success, error?}] }` |
| `delete-post` | `{ postId, platforms?, userId? }` | `{ results: [{platform, success, error?}] }` |

Fluxo comum (ambas):
1. Autentica (JWT ou service role)
2. Lê `published_posts` do `post_id` (filtra por `platforms` se enviado)
3. Para cada plataforma → chama adapter de update/delete
4. Atualiza `published_posts` (`status`, `edited_at`/`deleted_at`, `last_sync_at`)
5. Atualiza `scheduled_posts` (`status='deleted'` no delete; `content` atualizado no update)
6. Grava auditoria em `post_sync_log` (nova tabela) + `system_logs`
7. Retorna resultado por plataforma (honesto quando a API não suporta)

### 3.3 Matriz de suporte por plataforma (update/delete)
| Plataforma | Editar (API) | Apagar (API) | Observação |
|---|---|---|---|
| **Telegram** | ✅ `editMessageText` (texto) | ✅ `deleteMessage` | Suporte total p/ texto; mídia = texto da legenda |
| **Facebook** | ⚠️ parcial (`POST /{post_id}` message) | ✅ `DELETE /{post_id}` | Edição só de texto da legenda |
| **X/Twitter** | ❌ sem API de edição | ✅ `DELETE /2/tweets/{id}` | Apagar funciona com token OAuth |
| **LinkedIn** | ❌ (integração pending) | ⚠️ `DELETE /rest/posts/{urn}` | Depende de `person_urn` (P0) |
| **YouTube** | ⚠️ `videos.update` | ✅ `DELETE /youtube/v3/videos` | Apagar com token OAuth |
| **Instagram** | ❌ API não permite editar/apagar posts publicados | ❌ | Retornar aviso honesto |
| **Threads** | ❌ | ❌ | Retornar aviso honesto |
| **WhatsApp** | ❌ | ❌ | Mensagens não são editáveis/apagáveis via API |
| **TikTok** | ❌ | ❌ | Retornar aviso honesto |

> Plataformas sem suporte retornam `{ success: false, unsupported: true, message: "..." }` — **nunca sucesso falso** (padrão da auditoria).

### 3.4 Integração com o Dashboard
- [ ] Botão **Editar** em post publicado → chama `update-post` → mostra resultado por plataforma
- [ ] Botão **Apagar** em post publicado → confirmação → chama `delete-post` → mostra resultado por plataforma
- [ ] Endpoint de listagem de `published_posts` (para UI exibir "Publicado em: FB, IG, TG" + link)

---

## 4. Fase 3 — Testes de Validação (reais)

| # | Teste | Critério de aceite |
|---|---|---|
| T30 | Publicar texto no Telegram → **editar** → verificar no canal | Mensagem editada no canal + `published_posts.status='edited'` |
| T31 | Publicar texto no Telegram → **apagar** → verificar no canal | Mensagem removida + `status='deleted'` + `scheduled_posts.status='deleted'` |
| T32 | Publicar foto no Facebook → **apagar** → verificar na página | Post removido da página |
| T33 | Apagar post do X (tweet real legado) | Tweet apagado via `DELETE /2/tweets/{id}` |
| T34 | Apagar post do Instagram | Retorna aviso honesto `unsupported:true` (sem quebrar o fluxo) |
| T35 | Editar post com mídia no Telegram | Texto da legenda editado OU aviso honesto |
| T36 | Revalidar E01-E15 após correções | Cada caso publica/erro esperado conforme a matriz |
| T37 | Carrossel IG (após Fase 1) | 1 post único com N mídias (não N posts) |

---

## 5. Fase 4 — Relatórios (entregáveis)

| Relatório | Conteúdo |
|---|---|
| `docs/RELATORIO-CORRECAO-PUBLICACOES.md` | Erros E01–E15 → status (corrigido/parcial/pendente) + evidências |
| `docs/RELATORIO-SYNC-EDITAR-APAGAR.md` | Resultados T30–T35 (IDs reais), matriz de suporte, exemplos de resposta |
| Logs em `post_sync_log` | Auditoria de cada operação edit/delete (quando, quem, plataforma, resultado) |

---

## 6. Definição de Pronto (UAT)
- [ ] Nenhum adapter retorna `success:true` sem confirmação real da plataforma (ID ou erro explícito)
- [ ] Editar/Apagar no dashboard → refletido nas plataformas com suporte; aviso claro nas sem suporte
- [ ] `published_posts` populado automaticamente a cada publicação
- [ ] Todos os testes T30–T37 executados com arquivos reais e resultados documentados

---

## 7. Ordem de execução sugerida
1. **P0 config:** Threads reauth (E09) + WhatsApp Meta (E11) — paralelo, sem código
2. **Base:** migração `published_posts` + gravação no publish-post (destrava sync + analytics)
3. **Nova ferramenta:** `delete-post` e `update-post` (Fase 2) — Telegram/Facebook/X/YouTube reais
4. **P1 código:** Carrossel IG (E07) → YouTube (E12) → TikTok (E13)
5. **P2 código:** Facebook mídia (E01-E03), Telegram mídia (E04-E06), Threads vídeo (E10), X mídia (E14)
6. **Testes + relatórios** (Fases 3 e 4)

---
*Plano gerado em 2026-08-14 — baseado em evidências reais da auditoria de 2026-08-13.*
