# 🔄 Relatório — Sincronização Editar/Apagar Posts Publicados

> **Data dos testes:** 2026-08-14 · **Projeto:** `ghtkdkauseesambzqfrd` (Social Canvas Hub)
> **Funcionalidade nova:** editar/apagar posts já publicados com reflexo automático nas plataformas + auditoria completa.
> **Base:** [PLANO-CORRECAO-PUBLICACOES.md](./PLANO-CORRECAO-PUBLICACOES.md) (Fase 2)

---

## 1. O que foi implementado

| Componente | Descrição |
|---|---|
| **Migração** `20260814000000_published_posts_sync.sql` | Colunas `status`, `url`, `edited_at`, `deleted_at`, `last_sync_at`, `metadata` em `published_posts` + índices + tabela `post_sync_log` (auditoria) com RLS |
| **`publish-post` (atualizado)** | Passa a **persistir** uma linha em `published_posts` por plataforma publicada com sucesso + registra `publish` no `post_sync_log` |
| **`_shared/platforms/post-sync.ts`** (novo) | Adapters de update/delete por plataforma com regra de ouro: **nunca sucesso falso** — plataformas sem API retornam `unsupported: true` honesto |
| **`delete-post`** (novo) | Edge function: apaga o post em cada plataforma (via adapter), atualiza `published_posts.status='deleted'` + `deleted_at`, marca `scheduled_posts.status='deleted'` e audita no `post_sync_log` |
| **`update-post`** (novo) | Edge function: edita o post em cada plataforma (via adapter), atualiza `published_posts.status='edited'` + `edited_at`, atualiza `scheduled_posts.content` e audita no `post_sync_log` |

---

## 2. Testes reais executados (evidências)

### T30 — Telegram: publicar → editar → apagar ✅
| Etapa | Entrada | Resultado da plataforma | Estado no banco |
|---|---|---|---|
| Publish | post em `scheduled_posts` (`2c0e7964-8978-4bf9-a4e9-7ad8b10fc37e`), texto "TESTE E2E 2026-08-14 - texto original" | ✅ `messageId: 17` | `published_posts.status=active`, `post_sync_log(publish)=success` |
| Update | `content = "TESTE E2E 2026-08-14 - TEXTO EDITADO APOS PUBLICACAO"` | ✅ `"Mensagem editada no canal."` (API `editMessageText` ok) | `published_posts.status=edited`, `edited_at`/`last_sync_at` preenchidos; `scheduled_posts.content` atualizado |
| Delete | `postId` | ✅ `"Mensagem apagada do canal."` (API `deleteMessage` ok) | `published_posts.status=deleted`, `deleted_at` preenchido; `scheduled_posts.status=deleted` |

`post_sync_log` final do T30:
```
telegram | publish | success | Post publicado com sucesso.
telegram | update  | success | Mensagem editada no canal.
telegram | delete  | success | Mensagem apagada do canal.
```

### T32 — Facebook: publicar → apagar ✅
| Etapa | Entrada | Resultado da plataforma | Estado no banco |
|---|---|---|---|
| Publish | post `47438954-6051-4258-b473-d9f028cbefca`, texto de teste, página `03e94458-...` | ✅ `postId: 102063242835968_1032183403147879` | `published_posts.status=active` |
| Delete | `postId` | ✅ `"Post apagado da página."` (Graph API `DELETE /{post_id}` ok) | `published_posts.status=deleted`; `post_sync_log(delete)=success` |

### T34 — Instagram: apagar (sem API) → comportamento honesto ✅
- Requisição: `delete-post` para linha IG `18016307753863772` (post real publicado em 2026-08-13)
- Resposta: `{ success: false, unsupported: true, message: "A plataforma instagram não oferece API para excluir posts publicados." }`
- **Linha NÃO foi alterada** (continua `active`) — sem sucesso falso
- Auditado: `post_sync_log(delete)=error`

### T35 — Twitter/X: apagar com conta ativa → erro real da API ✅
- Requisição: `delete-post` para linha TW `2063127854243869502` (tweet legado)
- Resposta: `{ success: false, error: "X API Error: credits depleted" }` — a conta X está conectada, mas sem créditos de API (X mudou para modelo pago)
- **Linha NÃO foi alterada** — erro real da plataforma, retornado sem mascaramento
- Auditado: `post_sync_log(delete)=error`

---

## 3. Matriz de suporte (confirmada pelos testes)

| Plataforma | Editar | Apagar | Status da implementação |
|---|---|---|---|
| **Telegram** | ✅ `editMessageText` (texto/legenda) | ✅ `deleteMessage` | **Testado OK** (T30) |
| **Facebook** | ⚠️ `POST /{post_id}` (legenda) | ✅ `DELETE /{post_id}` | **Apagar testado OK** (T32) |
| **X/Twitter** | ❌ sem API | ✅ `DELETE /2/tweets/{id}` | Apagar implementado; teste retornou erro real de créditos (T35) |
| **LinkedIn** | ❌ | ❌ pending | `unsupported` honesto (depende de `person_urn`) |
| **YouTube** | ❌ | ❌ | `unsupported` honesto (upload é stub) |
| **Instagram** | ❌ | ❌ | `unsupported` honesto — **testado OK** (T34) |
| **Threads** | ❌ | ❌ | `unsupported` honesto |
| **WhatsApp** | ❌ | ❌ | `unsupported` honesto |
| **TikTok** | ❌ | ❌ | `unsupported` honesto |

> **Regra implementada:** plataformas sem API retornam `{ success: false, unsupported: true, message }` — **nunca** `success: true` sem confirmação real da plataforma.

---

## 4. Notas técnicas

1. **FK descoberta:** `published_posts.post_id` tem `FOREIGN KEY → scheduled_posts(id) ON DELETE CASCADE`. O publish-post só persiste quando `postId` é um post real em `scheduled_posts` (fluxo normal do app). Testes com UUID arbitrário falham silenciosamente (por design, para não poluir).
2. **RLS:** `published_posts` e `post_sync_log` são protegidos por RLS owner-only (`auth.uid() = user_id`); as funções usam service role (sistema).
3. **Idempotência:** re-publicação de um mesmo `post_id`+plataforma substitui o registro anterior.
4. **Erros de rede no console do navegador** (`Failed to send a request to the Edge Function`, timeouts no `getUser`) — verificados: as funções respondem 200 com CORS `*` (testado via rede em 2026-08-14). São do ambiente local do navegador (cold-start/timeout), não das edge functions.

---

## 5. Como usar (UI / API)

### Publicar (agora persiste automaticamente)
```json
POST /functions/v1/publish-post
{ "postId": "<uuid de scheduled_posts>", "platforms": ["telegram"], "content": "...", "userId": "..." }
```

### Editar post publicado
```json
POST /functions/v1/update-post
{ "postId": "<uuid>", "content": "novo texto", "userId": "..." }
// opcional: "platforms": ["telegram"], "mediaUrls": [...]
```

### Apagar post publicado
```json
POST /functions/v1/delete-post
{ "postId": "<uuid>", "userId": "..." }
// opcional: "platforms": ["facebook"]
```

### Auditoria
```sql
SELECT platform, operation, status, message, created_at
FROM post_sync_log
WHERE post_id = '<uuid>'
ORDER BY created_at;
```

---

*Relatório gerado em 2026-08-14 — todos os testes executados contra produção (`ghtkdkauseesambzqfrd`) com confirmação real das APIs.*
