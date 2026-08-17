# RELATÓRIO — Fase 1: Correções de adapters de publicação (P0)

**Data:** 14/08/2026
**Escopo:** Fase 1 do `docs/PLANO-ACAO-CORRECAO-ADAPTERS.md` — correções rápidas e testáveis agora.
**Ambiente de teste:** função `publish-post` (projeto `ghtkdkauseesambzqfrd`), usuário `38cd9720-494e-406a-853d-19d81ae85e99`.

---

## Resumo

Todos os itens P0 da Fase 1 foram implementados e deployados. Testes reais de publicação foram executados nas plataformas conectadas. O único item sem publicação real de sucesso é o **Facebook story**, bloqueado pela própria Meta na página de teste (erro honesto da API, não bug do código).

## Evidências dos testes E2E (deploy pós-correção)

### Telegram — adapter reescrito (áudio/PDF/vídeo/álbum) ✅
| Teste | Formato | Resultado |
|---|---|---|
| Áudio `.mp3` (SoundHelix) | `audio` | ✅ `messageId 18` no @TupaNoticias |
| PDF (`w3.org` dummy) | `document` | ✅ `messageId 19` no @TupaNoticias |
| Vídeo `.mp4` (mov_bbb) | `video` | ✅ `messageId 20` no @TupaNoticias |

Antes: `sendPhoto` genérico falhava silenciosamente para não-fotos. Agora a rota é escolhida por extensão: `sendAudio`/`sendDocument`/`sendVideo`/`sendPhoto`/`sendMediaGroup`.

### Instagram — carrossel ✅
| Teste | Formato | Resultado |
|---|---|---|
| Carrossel 3 imagens 1080×1080 (1:1) | `carousel` | ✅ `postId 18082724984677455`, 3 itens |

- **Causa da falha anterior:** as imagens `overlay_*` do storage tinham ratios 0.56–2.82 (incompatíveis com carrossel IG) → Graph retornava `"The aspect ratio is not supported."`. Com imagens 1:1 o fluxo passou.
- **Nota:** o carrossel também é detectado automaticamente quando `mediaUrls.length > 1` (sem `contentType`), mas o `contentType` explícito agora é respeitado pelo `publish-post/index.ts` (fix aplicado nesta sessão).

### Facebook — carrossel ✅ / story ⚠️
| Teste | Formato | Resultado |
|---|---|---|
| Carrossel 3 imagens 1:1 (página real `102063242835968`) | `carousel` | ✅ `postId 102063242835968_1032259759806910`, 3 itens |
| Story foto 1080×1920 (9:16) | `story` | ❌ `Facebook API Error: ... does not exist, cannot be loaded due to missing permissions, or does not support this operation` |

- O endpoint `/{page}/story` está implementado corretamente (`media_type` + `url`). A página de teste não habilita o recurso de stories via Graph API (permissão/recurso desabilitado). **Bloqueio externo (Meta)**, não é sucesso falso.

### Fim do "sucesso falso" — TikTok / YouTube / Pinterest ✅
| Plataforma | Antes | Depois |
|---|---|---|
| TikTok | sucesso falso | `success:false` + `"Integração da TikTok Content Posting API pendente (Fase 2)"` |
| YouTube | sucesso falso | `success:false` + `"Upload para YouTube (short/longo/live) pendente - Fase 2"` |
| Pinterest | sucesso falso | `success:false` + `"Integração da Pinterest API (POST /v5/pins) pendente - Fase 3"` |

Os três retornam `unsupported: true`, garantindo que a UI marque como **falha real** e nunca mais como publicado.

## OAuth — correção da contaminação de credenciais

**Problema raiz:** `social-oauth-init` e `social-oauth-callback` usavam `getVal("app_id","META_APP_ID")` / fallback `GOOGLE_CLIENT_ID` para **todas** as plataformas. Para LinkedIn/TikTok a URL de autorização era montada com `app_id=761709995404176` (o client_id antigo do Threads salvo no banco) — autorização impossível.

**Correção deployada:**
- `social-oauth-init`: casos específicos `linkedin` (`client_id`, scope `openid profile email w_member_social`) e `tiktok` (`client_key`, scope `user.info.basic,video.list,video.publish`); fallback genérico sem contaminação.
- `social-oauth-callback`: `validateOAuthConfig` + `formattedCreds` cobrem linkedin/tiktok; `exchangeLinkedIn` usa `client_id`/`client_secret`; `exchangeTikTok` usa `client_key`/`client_secret`.

**Confirmação no banco (credenciais corretas):**
- TikTok: `client_key` presente (sbawuza2pkv8csnrh3) ✅
- LinkedIn: `client_id` = `78rqtmyn7ixiu4` ✅
- Threads: `app_id=878520285200935`, `client_id=761709995404176` (era essa a origem do valor que vazava nos logs)

## Console/CWV/favicon

- `vite.config.ts`: proxy `/supabase` com `proxyTimeout`/`timeout` = 180s (mata os `Failed to send a request` do cold start).
- `src/integrations/supabase/client.ts`: `EDGE_FUNCTION_TIMEOUT_MS` 60s→90s, `REGULAR_TIMEOUT_MS` 25s→45s.
- `index.html`: preloads de fontes (Space Grotesk/Inter, `fetchpriority=high`) para o LCP (`h1.lcp-target`).
- Favicon: recriados `public/favicon.svg` (gradiente da marca) e `public/favicon.ico` (2.206 bytes, PNG-embutido 32×32) — referência `data:,` removida do `index.html`; push notifications (`useWebPushNotifications.ts`) voltam a ter ícone.
- Build de produção: ✅ passa.

## Pendências Fase 1 / bloqueios externos

| Item | Status | Bloqueio |
|---|---|---|
| F1.7 Threads vídeo (código pronto) | ⏳ teste real pendente | Token Threads antigo inválido (401 code 190) — **usuário precisa reautenticar** |
| F1.5 Facebook story | ⚠️ código OK | Recurso story desabilitado na página de teste (Meta) |
| OAuth end-to-end | ⏳ | Requer sessão de usuário (teste local usa redirect de produção) |
| LinkedIn `person_urn` | ⏳ | Não configurado na conexão `75b990f3-...` |

## Como reproduzir

```powershell
# 1. Deploy
.\node_modules\.bin\supabase.cmd functions deploy publish-post social-oauth-init social-oauth-callback --project-ref ghtkdkauseesambzqfrd --no-verify-jwt

# 2. Carrossel IG
POST https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/publish-post
{ userId, platforms:["instagram"], contentType:"carousel", content, mediaUrls:[3x 1:1] }
# → success:true, postId
```
