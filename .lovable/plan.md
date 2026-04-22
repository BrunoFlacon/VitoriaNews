

# Plano de Correção de Segurança Completa

Vou corrigir todos os 17 findings de segurança em uma única migração + ajustes pontuais de código.

## 1. Habilitar RLS em 14 tabelas desprotegidas

Tabelas hoje com `rowsecurity = false` (acessíveis sem proteção via API pública):

| Tabela | Estratégia |
|---|---|
| `platform_tokens` | RLS on, **revogar acesso** de `anon`/`authenticated`. Apenas service_role. Migrar bearer token X para secret. |
| `social_comments`, `social_inbox`, `social_leads` | RLS on, policies `SELECT/INSERT/UPDATE/DELETE` por `auth.uid() = user_id` |
| `social_webhooks`, `social_publish_log`, `platform_api_logs`, `system_audit`, `auto_reply_rules`, `post_analytics` | RLS on, **sem policies para clientes** (apenas service_role acessa via edge functions) |
| `platform_hourly_performance`, `platform_rate_limits`, `social_platforms` | RLS on, `SELECT` para `authenticated` (dados de leitura compartilhada), escrita só service_role |
| `api_keys` | RLS on, policy estrita: `auth.uid() = user_id` para SELECT/DELETE; INSERT só via função `create_api_key()` |

## 2. Bearer Token Exposto (`platform_tokens`)

- Mover token X atual para o secret `TWITTER_BEARER_TOKEN` (Lovable Cloud). Vou pedir o valor via add_secret.
- Remover registros sensíveis da tabela após migração.
- Atualizar edge functions que liam de `platform_tokens` para `Deno.env.get("TWITTER_BEARER_TOKEN")`.

## 3. Views (Security Definer / Sensitive Exposure)

8 views em `public` rodam com privilégios do owner (postgres). Vou recriar todas as 7 que faltam com `WITH (security_invoker = true)`, igual já está em `social_connections_safe`. Isso faz a view respeitar RLS do usuário consultando.

## 4. Materialized View na API (`dashboard_metrics`)

Revogar `SELECT` de `anon` e `authenticated`. Acesso só via função wrapper se necessário.

## 5. Funções com search_path mutável (37 funções)

Adicionar `SET search_path = public` em todas as funções `public.*` que ainda não têm. Migração `ALTER FUNCTION ... SET search_path = public` em massa.

## 6. Trigger `handle_new_user` — validação de input

Sanitizar `name`: trim, truncar em 100 chars, remover `<>"'\``. Mantém SECURITY DEFINER (necessário) com search_path fixo.

## 7. Storage — bucket `media`

- **Bucket privado**: `UPDATE storage.buckets SET public = false WHERE id = 'media'`.
- **Policy UPDATE**: corrigir para checar `(storage.foldername(name))[1] = auth.uid()::text` (hoje qualquer authenticated sobrescreve qualquer arquivo).
- **Policy SELECT pública**: remover (impede listagem anônima).
- **Refatorar `useMediaUpload.ts`**: usar `createSignedUrl(path, 3600)` em vez de `getPublicUrl`. Salvar o path no DB; gerar signed URL on-demand.
- Criar hook `useSignedMediaUrl(path)` para componentes que exibem mídia.

## 8. Realtime — falta authorization

Adicionar policy em `realtime.messages`:
```sql
CREATE POLICY "users_own_topic" ON realtime.messages
FOR SELECT TO authenticated
USING (realtime.topic() LIKE 'user:' || auth.uid()::text || ':%');
```
E padronizar nomes de canais no frontend (`user:{uid}:notifications`, etc.). Vou auditar `useRealtime` calls e renomear.

## 9. Extensão `pg_net` em `public`

Mover para schema `extensions`:
```sql
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_net SET SCHEMA extensions;
```
Atualizar funções que referenciam `net.http_post` para usar `extensions.http_post` (ou search_path apropriado).

## 10. Validação de input em Settings

`src/components/dashboard/SettingsView.tsx`:
- Adicionar zod schema (name 2-100, bio ≤500, website URL https com max 200).
- Validar no `handleSaveProfile` antes de chamar `updateProfile`.
- Adicionar contador de caracteres no textarea bio.
- Constraints no DB: `CHECK (char_length(bio) <= 500)`, `CHECK (char_length(name) BETWEEN 2 AND 100)`.

## 11. Leaked Password Protection

Habilitar via `configure_auth` com `password_hibp_enabled: true`.

## 12. Logging de info sensível em edge functions

Substituir `console.log('user:', user.id, ...)` por `console.log('operation completed')` (sem IDs) em: `publish-post`, `social-oauth-callback`, `get-analytics`, `generate-post-content`. Manter logs de erro.

---

## Ordem de execução

1. **Pedir secret** `TWITTER_BEARER_TOKEN` (bloqueia migração de platform_tokens).
2. **Migration 1**: RLS on em 14 tabelas + policies.
3. **Migration 2**: Recriar views com `security_invoker`, revogar acesso `dashboard_metrics`.
4. **Migration 3**: `ALTER FUNCTION ... SET search_path = public` em 37 funções; sanitização em `handle_new_user`; constraints em `profiles`.
5. **Migration 4**: Storage — privatizar bucket, corrigir policy UPDATE, remover SELECT público.
6. **Migration 5**: Mover `pg_net` para schema `extensions`; ajustar funções que usam `net.*`.
7. **Migration 6**: RLS policies em `realtime.messages`.
8. **`configure_auth`**: HIBP on.
9. **Frontend**:
   - `useMediaUpload.ts` → signed URLs
   - novo `src/hooks/useSignedMediaUrl.ts`
   - componentes que exibem media (audit + replace)
   - `SettingsView.tsx` → validação zod
   - canais Realtime → renomear para `user:{uid}:*`
10. **Edge functions**: trocar `platform_tokens` por env; remover logs com user.id.

## Detalhes técnicos relevantes

- Policies seguem o padrão já vigente: `FOR <op> TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`.
- `platform_tokens` ficará sem nenhuma policy → service_role bypassa RLS automaticamente; clientes recebem 0 rows.
- `security_invoker = true` em views faz Postgres avaliar RLS na ótica do usuário, eliminando o finding `SUPA_security_definer_view`.
- Mover `pg_net` requer atualizar `publish_to_x` e `publish_to_telegram` (usam `net.http_post`).
- Hook `useSignedMediaUrl` usa cache + refresh antes de expirar para não quebrar UX.

## Arquivos modificados

**Migrações novas** (6 arquivos SQL).

**Frontend**:
- `src/hooks/useMediaUpload.ts`
- `src/hooks/useSignedMediaUrl.ts` (novo)
- `src/components/dashboard/SettingsView.tsx`
- componentes de exibição de mídia (audit pontual)
- arquivos com `supabase.channel(...)` (rename de tópicos)

**Edge functions**:
- `supabase/functions/publish-post/index.ts` (logs)
- `supabase/functions/social-oauth-callback/index.ts` (logs)
- `supabase/functions/get-analytics/index.ts` (logs)
- `supabase/functions/generate-post-content/index.ts` (logs)
- qualquer função que leia `platform_tokens` → trocar por `Deno.env.get('TWITTER_BEARER_TOKEN')`

**Auth config**: HIBP enabled.

