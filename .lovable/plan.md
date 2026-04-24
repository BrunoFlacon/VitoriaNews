## Problemas identificados faça uma analize nos erros abaixo e monte uma atualização do plano de correção de segurança

### 1. Erro crítico em produção: "supabaseKey is required"

O arquivo `src/integrations/supabase/client.ts` faz fallback para a URL `ghtkdkauseesambzqfrd.supabase.co` (projeto antigo), mas o projeto Lovable Cloud atual é `yttsmficdfnbvvuhhdmw`. Quando `VITE_SUPABASE_PUBLISHABLE_KEY` não está injetado no build publicado, o cliente quebra. Além disso o fallback aponta para um projeto errado.

Faça backup do banco de dados do lovable `yttsmficdfnbvvuhhdmw de todos os dados armazenados e envie para o github e crie uma pasta` de backup do banco de dados com a data do backup esta pasta ficará arquivada para que possamos usar quando precisar usar caso tiver erros no sistema.....

copie os dados do backup e faça uma analise e se tivertabelas iguais ao do backup adicione os dados da tabela do backup na tabela igual ao do novo banco de dados  `ghtkdkauseesambzqfrd.supabase.com`  se não existir a tabela no novo banco de dados crie a tabela no novo banco de dados mas nunca delete nada se os dados forem iguais iguinore os dados da tabela do banco de dados antigo banco de dados `yttsmficdfnbvvuhhdmw`  que for igual identica. depois que finalizar as analises e implementações direcione e passe apartir das correções carregar do novo banco de dados vindo do supabase e integre ao sistema o novo banco de dados sem apagar nada.... 

### 2. Storage DELETE policy permite apagar arquivos de outros usuários

Política `Users can delete own media files` permite DELETE quando o primeiro segmento da pasta é `auth.uid()` **OU** uma das pastas compartilhadas (`avatars`, `messages`, `stories`, `documents`). Qualquer usuário autenticado pode deletar qualquer arquivo nessas pastas.

### 3. Tabela `social_publish_log` com RLS habilitado mas sem políticas

Corrija a tabela tem RLS ligado mas zero políticas e nenhuma coluna `user_id` — fica inacessível para qualquer cliente e não pode ser escopada por usuário, faça a tabela funcionar com base novo banco de dados

---

## Correções (sem deletar dados)

### A. Corrigir o fallback do client.ts

Substituir a URL (`https://yttsmficdfnbvvuhhdmw.supabase.com`) hardcoded errada pela nova URL (`https://ghtkdkauseesambzqfrd.supabase.com`) correta no projeto atual e adicionar fallback se não tiver a regra novo banco de dados junto com a nova chave anon publicável        (e públicar o design). Isso garante que o app funcione mesmo se o `.env` não estiver populado no build.

```ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yttsmficdfnbvvuhhdmw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '<anon key publicável>';
```

### B. Migration SQL (apenas alterações de policy — sem DROP de dados)

```sql
-- Fix 1: DELETE policy do storage restringir SOMENTE à pasta do próprio usuário
DROP POLICY IF EXISTS "Users can delete own media files" ON storage.objects;
CREATE POLICY "Users can delete own media files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 2: social_publish_log — restringir a service_role (escrito por edge functions / triggers)
REVOKE ALL ON public.social_publish_log FROM anon, authenticated;
GRANT ALL ON public.social_publish_log TO service_role;
CREATE POLICY "service_role_full_access"
ON public.social_publish_log FOR ALL TO service_role
USING (true) WITH CHECK (true);
-- Leitura para o dono do post associado (via join com scheduled_posts)
CREATE POLICY "users_read_own_publish_logs"
ON public.social_publish_log FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scheduled_posts sp
    WHERE sp.id = social_publish_log.post_id
      AND sp.user_id = auth.uid()
  )
);
```

Nenhum `DROP TABLE`, `DELETE FROM`, ou `TRUNCATE`. Apenas reconfiguração de políticas.

### C. Marcar findings como corrigidos

Após aplicar a migration, marcar os 2 findings de segurança como `mark_as_fixed`. se não tiver esta regra no novo banco de dados se já existir iguinore 

---

## Arquivos alterados

1. `src/integrations/supabase/client.ts` — corrigir URL/key de fallback
2. Nova migration SQL — fixes A e B acima