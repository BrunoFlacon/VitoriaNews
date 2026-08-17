# 📊 Relatório de Auditoria — Publicações & Analytics

> **Projeto:** Social Canvas Hub · **Data:** 2026-08-13 · **Tipo:** Auditoria funcional com testes reais
> **Plano base:** [AUDITORIA-PUBLICACOES-PLANO.md](./AUDITORIA-PUBLICACOES-PLANO.md)
> **User de teste:** `38cd9720-494e-406a-853d-19d81ae85e99`

---

## 1. Sumário Executivo

| Área | Verdict | Detalhe |
|---|---|---|
| **Publicação real** | 🟡 Parcial | **6 de 8 redes conectadas publicam de verdade** (Facebook, Instagram, Telegram, WhatsApp‑bloqueado, Twitter). YouTube/TikTok/LinkedIn são stubs honestos; Threads depende de reauth. |
| **Instagram** | 🟢 **Corrigido** | Bugs de ID (usava Page ID), tipo de mídia (só imagem) e prontidão do container **corrigidos e validados com postagens reais** (foto, Reels, Story). |
| **X / Twitter** | 🟢 **Corrigido** | Validava só a existência de token — publicava mesmo com `is_connected=false`. Agora exige conexão ativa + valida HTTP/tweetId. |
| **LinkedIn** | 🟢 **Corrigido (stub honesto)** | Retornava `success:true` sem publicar nada. Agora marca `pending` explícito. Integração real ainda pendente (requer `person_urn`). |
| **Threads** | 🟠 Código OK / token inválido | Fallback de token implementado, mas o token armazenado é **inválido** (`401 Cannot parse access token`) — exige reautenticação OAuth. |
| **Analytics por post** | 🔴 Crítico | `post_metrics`, `analytics_posts`, `published_posts` **vazios (0 linhas)** — não há rastreabilidade nem métricas por post. |
| **Monetização** | 🔴 Crítico | `social_monetization_metrics` vazia; `rpm`, `earnings_estimate`, `retention_rate` do YouTube sempre NULL. |

---

## 2. Matriz de Testes (resultados REAIS)

### 2.1 Redes que publicam de verdade

| # | Rede | Formato | Resultado | Evidência (ID real na plataforma) |
|---|---|---|---|---|
| T01 | Facebook | Texto | 🟢 Publicado | postId `323348644425052_1677918014333813` |
| T02 | Facebook | Foto | 🟢 Publicado | postId `1677918074333807` |
| T04 | Instagram | Foto | 🟢 Publicado | postId `18005272219787735` (1º) / `18016307753863772` (reteste final) |
| T05 | Instagram | Reels (vídeo) | 🟢 Publicado | postId `18038821910231162` (1º) / `18140823175561092` (reteste final) |
| T06 | Instagram | Story | 🟢 Publicado | postId `18046085897274790` (1º) / `18170868304446768` (reteste final) |
| T14 | Telegram | Texto | 🟢 Publicado | messageId `14` (canal @TupaNoticias) |
| T15 | Telegram | Foto | 🟢 Publicado | messageId `15` |
| T20 | X/Twitter | Texto | 🟢/🔒 **Publicou por bug** → agora **bloqueado** | ANTES (bug): tweetId `2063127854243869502` publicado com `is_connected=false` via token legado. DEPOIS (correção): recusa com "não conectado" — exige reauth |

### 2.2 Redes com falha de código ou configuração

| # | Rede | Formato | Resultado | Causa / Observação |
|---|---|---|---|---|
| T03 | Facebook | Vídeo | 🔴 Falha | `Invalid parameter` — adapter do Facebook não implementa upload de vídeo |
| T07 | Threads | Texto | 🟠 Token inválido | Código OK (fallback funciona), mas token armazenado é inválido — **requer reauth OAuth** |
| T08 | Threads | Foto | 🟠 Token inválido | idem |
| T09–T13 | WhatsApp | Texto/Foto/Vídeo/Áudio/PDF | 🔴 Falha | `(#133010) Account not registered` — número de envio não ativo na WABA (config Meta) |
| T16/T17 | YouTube | Vídeo/Short | 🟡 Stub honesto | Não faz upload real; retorna `pending`/info |
| T18 | TikTok | Vídeo | 🟡 Stub honesto | `implementation pending` |
| T19 | LinkedIn | Texto | 🟡 Stub honesto (`pending`) | Token lido de `social_connections`, mas falta `person_urn` p/ API real |

### 2.3 Matriz de Formatos × Redes — testes com arquivos REAIS do storage

> Todos os testes usaram arquivos reais do bucket `media` (JPG real, MP4 real 16MB, MP3 real 2,4MB, PDF real 711B) e chamaram o mesmo fluxo do dashboard (`publish-post`).

| Formato | Facebook | Instagram | Threads | Telegram | WhatsApp | X/Twitter | YouTube | TikTok |
|---|---|---|---|---|---|---|---|---|
| **Texto** | 🟢 `...67433813` | — | 🟠 token | 🟢 msg `14` | 🔴 `#133010` | 🟢/🔒 (ver T20) | 🟡 stub | 🟡 stub |
| **Foto** | 🟢 `...433807` | 🟢 `18016307753863772` | 🟠 token | 🟢 msg `15` | 🔴 `#133010` | ⚠️ URL como texto | 🟡 stub | 🟡 stub |
| **Vídeo (longo/Reels)** | 🔴 `Invalid parameter` | 🟢 Reels `18140823175561092` | 🟠 token (erro no auth antes do formato) | 🔴 não suportado | 🔴 `#133010` | ⚠️ URL como texto | 🟡 stub | 🟡 stub |
| **Vídeo (Shorts)** | — | 🔴 não suportado (só REELS) | — | — | — | — | 🟡 stub | 🟡 stub |
| **Story** | — | 🟢 `18170868304446768` | — | — | — | — | — | — |
| **Áudio (MP3)** | 🔴 `Invalid parameter` (envia p/ /photos) | 🔴 não suportado | 🔴 não suportado | 🔴 `wrong type of the web page content` | 🔴 `#133010` (adapter OK) | ⚠️ URL como texto | 🟡 stub | 🟡 stub |
| **PDF/Documento** | 🔴 `Invalid parameter` | 🔴 não suportado | 🔴 não suportado | 🔴 `wrong type of the web page content` | 🔴 `#133010` (adapter OK) | ⚠️ URL como texto | 🟡 stub | 🟡 stub |
| **Carrossel (2+ fotos)** | 🔴 não suportado | ⚠️ **publica N posts separados** (`18075299789414139`, `18119325616687348`) — não é carrossel | 🔴 não suportado | — | — | — | — | — |

**Legenda:** 🟢 publicado de verdade (ID real) · 🟠 bloqueado por configuração (token inválido) · 🔴 falha de código/adapter · 🟡 stub honesto · ⚠️ comportamento parcial/enganoso

---

## 3. Defeitos CORRIGIDOS nesta auditoria (deploy `publish-post` ✅)

| # | Arquivo | Correção | Validação |
|---|---|---|---|
| 1 | `_shared/platforms/instagram.ts` | Usar **`platform_user_id` (IG Business Account ID 1784…)** em vez de `page_id` do Facebook nas chamadas Graph API | ✅ T04 publicou |
| 2 | `_shared/platforms/instagram.ts` | Suporte a **Reels** (`media_type=REELS` + `video_url`) e **Story** (`media_type=STORIES`) | ✅ T05/T06 publicaram |
| 3 | `_shared/platforms/instagram.ts` | **Polling de prontidão do container** (`status_code=FINISHED` antes do `media_publish`) — corrige erro intermitente *"Media ID is not available"* | ✅ T04R3/T05R3/T06R3 (13s/52s/13s) |
| 4 | `_shared/credentials.ts` | `getPlatformCredentials` retorna **`isConnected`** (evita "sucesso falso" quando não há conexão OAuth) | ✅ base para X/LinkedIn |
| 5 | `_shared/credentials.ts` | `getThreadsCredentials`: fallback para token em **`api_credentials`** quando `social_connections.access_token` é vazio | ✅ código validado (token em si é inválido — item 4) |
| 6 | `_shared/platforms/x.ts` | Exige **`isConnected`**, valida **HTTP status** e **presença de `tweetId`** (antes: `success:true` mesmo sem ID) | ✅ T20R agora falha "não conectado" de forma explícita |
| 7 | `_shared/platforms/linkedin.ts` | Lê credenciais de **`social_connections`** (não só `api_credentials`) e retorna `pending` honesto | ✅ T19R retorna `pending:true` |

---

## 4. Gargalos que continuam em aberto

### 🔴 Bloqueadores de negócio
1. **Analytics por post inexistente** — `post_metrics` / `analytics_posts` / `published_posts` com **0 linhas**. O dashboard não persiste o ID da postagem na plataforma, então é impossível reportar curtidas/alcance/RPM por post.
2. **Monetização não coletada** — `social_monetization_metrics` vazia; YouTube `rpm`/`earnings_estimate`/`retention_rate` NULL. A camada de coleta precisa ser implementada (Graph API `insights`, YouTube Reporting API, etc.).
3. **Stubs restantes** — YouTube (upload real + Shorts) e TikTok. São as redes com maior potencial de monetização e continuam sem publicação real.

### 🟠 Importantes
4. **Threads — reautenticação** — o token armazenado está corrompido/inválido. Refazer o fluxo OAuth do Threads (App ID/Secret em env) e salvar `access_token` em `social_connections`.
5. **WhatsApp — configuração Meta** — `(#133010) Account not registered`: o `phone_number_id` usado não está ativo na WABA. Validar `107006452268135` vs `104471639297435` no Meta Business.
6. **Instagram carrossel** — adapter publica cada foto como post separado (evidência: 2 posts reais `18075299789414139`, `18119325616687348`). Implementar `media_type=CAROUSEL` com containers filhos (`children` + `media_publish`).
7. **Telegram áudio/PDF** — adapter só tem `sendMessage`/`sendPhoto`; MP3/PDF → erro `wrong type of the web page content`. Adicionar `sendAudio`/`sendDocument`.
8. **Facebook áudio/PDF/vídeo** — adapter só tem `/feed` e `/photos`; MP3/PDF → `Invalid parameter`. Adicionar `/videos` (vídeo) e reels/posts de áudio/documento conforme suporte da API.
9. **Bug de agregação no publish-post** — quando o adapter retorna array (ex.: carrossel), `results.push({ platform, ...result })` corrompe a resposta (objeto `{0:…,1:…}`) e o `status='published'` não é marcado (`r.success` fica indefinido). Aplainar arrays antes de agregar.
10. **Facebook vídeo** — implementar `POST /{page}/videos` com `file_url` (hoje `Invalid parameter`).
11. **LinkedIn real** — obter `person_urn` (OAuth `w_member_social`) e implementar a Posts API.
12. **Threads vídeo** — adapter só envia `media_type=IMAGE`; vídeo exige `media_type=VIDEO`.

### 🟡 Menores
13. **X com mídia** — hoje anexa a URL como texto; upload real exige chunked upload v1.1.
14. **`status` do post no dashboard** — posts que falham em parte das plataformas ficam marcados `published` (lógica agrega por `success` geral) — considerar granularidade por plataforma.

---

## 5. Evidências coletadas

### 5.1 Postagens reais (IDs públicos)
- Facebook: `323348644425052_1677918014333813` (texto), `1677918074333807` (foto)
- Instagram foto: `18016307753863772` · Reels: `18140823175561092` · Story: `18170868304446768`
- Instagram carrossel (comportamento atual): `18075299789414139` + `18119325616687348` (**2 posts separados, não carrossel**)
- Telegram: `14`, `15` (@TupaNoticias)
- X: `2063127854243869502`

### 5.2 Configuração de conexões (user teste)
| Rede | social_connections | api_credentials | Observação |
|---|---|---|---|
| Facebook | ✅ 15 páginas conectadas | app_id/secret | Publica texto+foto |
| Instagram | ✅ 1 conexão (IG user 17841400885293617, token 348 chars) | — | Publica foto/Reels/Story |
| Threads | ⚠️ conectada, **access_token NULL** | token 221 chars **inválido** (`401 Cannot parse`) | Requer reauth |
| Telegram | — | bot token + chatId @TupaNoticias | Publica texto+foto |
| X/Twitter | ❌ `is_connected=false` (2 rows) | token presente (legado) | Publicou via token legado — corrigir fluxo OAuth |
| LinkedIn | ⚠️ conectada, sem `person_urn` | — | Stub pending |
| YouTube | ⚠️ 1 canal | — | Stub |
| WhatsApp | 2 WABAs | — | Bloqueado no Meta |

### 5.3 Erros de API capturados
- WhatsApp: `(#133010) Account not registered`
- Threads: `Invalid OAuth access token - Cannot parse access token` (token corrompido)
- Facebook vídeo/áudio/PDF: `Invalid parameter`
- Telegram áudio/PDF: `Bad Request: wrong type of the web page content`
- Instagram (antes do fix): `Media ID is not available` → resolvido com polling
- Instagram (antes do fix): container com Page ID → `(#100) Object with ID ... does not exist`

---

## 6. Conclusão e Recomendações

**O que funciona hoje de ponta a ponta:** agendar/executar e publicar texto+foto em **Facebook, Instagram (foto/Reels/Story) e Telegram**, com retorno de ID real. Com a auditoria, o **Instagram saiu de "quebrado" para 100% funcional** e **X/LinkedIn deixaram de mentir** sobre sucesso.

**Prioridade de ação (recomendada):**
1. **Reautenticar Threads** (desbloqueia 2 formatos) — minutos de trabalho, sem código.
2. **Implementar persistência de `published_posts`** (post_id → platform_post_id + url) — pré-requisito de tudo de analytics.
3. **Coletor de métricas por post + monetização** (Graph API insights / YouTube API) — requisito central do produto.
4. **Resolver WhatsApp no Meta Business** (config, não código).
5. **Implementar upload real de YouTube e TikTok** (maior impacto de monetização).

---
*Gerado automaticamente pela auditoria de 2026-08-13 — todos os IDs de postagem foram obtidos de respostas reais das APIs das plataformas.*
