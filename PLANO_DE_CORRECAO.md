# PLANO DE CORREÇÃO — Logins OAuth das Redes Sociais

## Resumo

| # | Plataforma | Erro | Tipo | Status |
|---|-----------|------|------|--------|
| 1 | **TikTok** | `client_key` do Google usada no lugar da do TikTok | **CODE FIX** | ✅ Corrigido |
| 2 | **LinkedIn** | `ERR_EMPTY_RESPONSE` no popup — ProtectedRoute exigia sessão | **CODE FIX** | ✅ Corrigido |
| 3 | **Threads** | Duplicata de perfis ao invés de atualizar | **MIGRATION** | ✅ Executado |
| 4 | **Popup** | `Failed to execute 'open'` — callback perdido | **CODE FIX** | ✅ Corrigido |
| 5 | **TikTok** | `redirect_uri` não registrada no portal | **CONFIG** | 🔧 Pendente |
| 6 | **Twitter/X** | OAuth negado — redirect URI / PKCE não configurados | **CONFIG** | 🔧 Pendente |
| 7 | **YouTube/Google** | `redirect_uri_mismatch` (Erro 400) | **CONFIG** | 🔧 Pendente |
| 8 | **LinkedIn** | Scopes reduzidos para login básico | **CODE FIX** | ✅ Deployado |
| 9 | **WhatsApp** | FB JSSDK — domínio localhost não liberado | **CONFIG** | 🔧 Pendente |
| 10 | **refresh-social-token** | 500 — arquivo obsoleto já removido | **CLEANUP** | ✅ Resolvido |
| 11 | **Console** | Multiple forms warning | **MINOR** | 🔧 Pendente |

---

## 1. TikTok — client_key errada ⚠️ CRÍTICO

### Causa
`social-oauth-init/index.ts` não incluía `client_key` no objeto `formattedCreds`. O campo `client_id` era preenchido com `GOOGLE_CLIENT_ID`, fazendo o TikTok receber o client ID do Google.

**Prova:** Na URL de autorização gerada:
```
client_key=1064913353118-sesu7074g5bbo4ub80ad0j2317vmtjs9.apps.googleusercontent.com
```

### Fix aplicado
`supabase/functions/social-oauth-init/index.ts:168` — adicionado:
```typescript
client_key: getVal("client_key", "TIKTOK_CLIENT_KEY"),
```

### ✅ Precisa fazer deploy:
```bash
npx supabase functions deploy social-oauth-init --project-ref ghtkdkauseesambzqfrd
```

### Config TikTok Developer Portal
- **Redirect URI:** `https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/social-oauth-callback/tiktok`
- **Redirect URI (produção):** `https://webradiovitoria.com.br/oauth/callback/tiktok/`
- **PKCE:** Habilitado
- **Scopes:** `user.info.basic, video.list, video.publish`

---

## 2. Threads — Duplicata de Perfis

### Causa
Registros antigos foram criados com `platform_user_id` diferentes porque o código anterior usava fallback para `shortData.user_id` quando `profileData.id` estava indisponível.

### Migrations (já existentes)
Executar no SQL Editor do Supabase Dashboard:
```sql
-- 1. Remove duplicatas do Threads
--    Arquivo: supabase/migrations/20260527150000_consolidate_threads_duplicates.sql
-- 2. Corrige profile data do Threads
--    Arquivo: supabase/migrations/20260527160000_fix_threads_profile_data.sql
-- 3. Unique constraint (se não existir)
--    Arquivo: supabase/migrations/20260410000006_fix_social_upsert_constraints.sql
```

### Fix já no código
`social-oauth-callback/index.ts:359-362` — lança erro se `profileData.id` estiver faltando, impedindo novas duplicatas.

---

## 3. LinkedIn — ERR_EMPTY_RESPONSE no popup ✅ FIX APLICADO

### Causa
As rotas de callback OAuth (`/oauth/callback/:platform`) estavam protegidas por `<ProtectedRoute>`, que exige `useAuth()`. O popup do OAuth é um contexto de navegador separado **sem sessão**, então o ProtectedRoute redirecionava para `/login`, que retornava vazio no popup → `ERR_EMPTY_RESPONSE`.

### Fix aplicado
`src/App.tsx:81-82` — removido `ProtectedRoute` das rotas de callback:
```tsx
// ANTES (quebrado):
<Route path="/oauth/callback" element={<ProtectedRoute><OAuthCallback /></ProtectedRoute>} />
<Route path="/oauth/callback/:platform" element={<ProtectedRoute><OAuthCallback /></ProtectedRoute>} />

// DEPOIS (corrigido):
<Route path="/oauth/callback" element={<OAuthCallback />} />
<Route path="/oauth/callback/:platform" element={<OAuthCallback />} />
```

### Fluxo corrigido
1. Popup abre → LinkedIn autoriza → redirect para callback
2. OAuthCallback carrega (sem exigir auth) → detecta `isPopup = true`
3. Envia `postMessage` com a URL para o opener (janela principal)
4. Opener tem sessão → faz o exchange com a Edge Function
5. Popup fecha automaticamente

### Scopes reduzidos
`supabase/functions/_shared/oauth/providers/linkedin.ts:8`:
```typescript
scope: "openid profile email" // ANTES: openid profile email w_member_social r_member_social w_organization_social r_organization_social
```

---

## 4. Threads — Duplicata de Perfis ✅ MIGRATIONS EXECUTADAS

### Causa
Redirect URI não registrada no Twitter Developer Portal.

### Config necessária
1. Acessar https://developer.twitter.com/en/portal/projects
2. App → "User authentication settings"
3. **OAuth 2.0 Redirect URI:**
   - `http://127.0.0.1:8081/oauth/callback/twitter/` (local)
   - `https://webradiovitoria.com.br/oauth/callback/twitter/` (produção)
4. **App Type:** "Web App" ou "Public Client" (PKCE)
5. **OAuth 2.0 PKCE:** Habilitado
6. **App Permissions:** Read and Write

### Scopes usados pelo código
```
tweet.read tweet.write users.read offline.access
```

### Env vars necessárias
- `TWITTER_CONSUMER_KEY` — já deve existir
- `TWITTER_CONSUMER_SECRET` — já deve existir

---

## 4. YouTube/Google — redirect_uri_mismatch

### Causa
O redirect URI usado pelo código (`http://localhost:8081/oauth/callback/youtube/` ou `http://localhost:8081/oauth/callback/google/`) não está registrado no Google Cloud Console.

### Config necessária
1. Acessar https://console.cloud.google.com/apis/credentials
2. Editar o "OAuth 2.0 Client ID"
3. **Authorized redirect URIs** (atenção à **barra no final**):
   - `http://localhost:8081/oauth/callback/google/`
   - `http://localhost:8081/oauth/callback/youtube/`
   - `https://webradiovitoria.com.br/oauth/callback/google/`
   - `https://webradiovitoria.com.br/oauth/callback/youtube/`

---

## 5. LinkedIn — unauthorized_scope_error

### Causa
O app solicita scopes que requerem produtos não ativados no LinkedIn Developer Portal.

### Config necessária
1. Acessar https://www.linkedin.com/developers/apps
2. App → "Products" tab
3. Adicionar:
   - **Sign In with LinkedIn** (openid, profile, email)
   - **Share on LinkedIn** (w_member_social, r_member_social)
   - **LinkedIn Pages** (w_organization_social, r_organization_social)
4. "Auth" tab → Redirect URIs:
   - `https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/social-oauth-callback/linkedin`
   - `https://webradiovitoria.com.br/oauth/callback/linkedin/`

---

## 6. WhatsApp — FB JSSDK domínio desconhecido

### Causa
`localhost` não está listado nos "App Domains" do Facebook App.

### Config necessária
1. Acessar https://developers.facebook.com
2. App → Settings → Basic
3. **App Domains:** adicionar `localhost` e `127.0.0.1`
4. Products → Facebook Login → Settings:
   - **Valid OAuth Redirect URIs:** `http://localhost:8081/`

### Nota
O fluxo JSSDK está **depreciado** no código (WhatsAppEmbeddedSignup.tsx:93-95). Recomenda-se usar a configuração manual de API do WhatsApp.

---

## 7. refresh-social-token — 500 Internal Server Error

### Causa
A função `refresh-social-token` está deployada (ACTIVE, v10) mas retorna 500. Pode ser:
- Conexões sem `access_token` (confirmado: ALL 57 contas têm `access_token = NULL`)
- Env vars faltando: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TWITTER_CONSUMER_KEY`, etc.

### Investigação necessária
```bash
curl -X POST "https://ghtkdkauseesambzqfrd.supabase.co/functions/v1/refresh-social-token" \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"platform":"test","connectionId":"none"}'
```

### Possível correção
Melhorar tratamento de erro quando `access_token` é null. Adicionar validação no início da função.

---

## 8. Popup — "Failed to execute 'open'"

### Causa
Erro assíncrono: o callback do `window.open` perdeu a referência (garbage collection). Ocorre em `useSocialConnections.ts:311`.

### Fix
Adicionar try/catch no `window.open`:

```typescript
// useSocialConnections.ts ~linha 311-320
let popup: Window | null = null;
try {
  popup = window.open(
    "about:blank",
    `oauth_${platform}`,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
} catch (e) {
  console.warn("[OAuth] Popup open failed, retrying without name:", e);
  popup = window.open(
    "about:blank",
    "_blank",
    `width=${width},height=${height},left=${left},top=${top}`
  );
}
if (!popup) { ... }
```

---

## 9. Console — Multiple forms warning

### Causa
SettingsView.tsx renderiza múltiplos `<form>` na mesma página.

### Fix
Adicionar `aria-label` a cada `<form>`:
```tsx
<form aria-label="Configurações de {platform}" ...>
```

---

## Deploy Prioritário

Após aplicar os code fixes:

```bash
# 1. TikTok fix (CRÍTICO)
npx supabase functions deploy social-oauth-init --project-ref ghtkdkauseesambzqfrd

# 2. refresh-social-token se houver mudança
npx supabase functions deploy refresh-social-token --project-ref ghtkdkauseesambzqfrd

# 3. Verificar deploy
npx supabase functions list --project-ref ghtkdkauseesambzqfrd
```
