# Relatório de Análise — Perfil Threads Duplicado

## 1. Causa Raiz Identificada
A duplicação ocorre porque a tabela `social_connections` possui registros múltiplos para o mesmo usuário na plataforma Threads. Isso acontece quando o sistema não detecta que uma conexão já existe durante o processo de OAuth.

Atualmente, o frontend mapeia **cada conexão** para um item na lista de perfis. Como o Threads teve dados sincronizados em momentos diferentes (alguns antes da correção de nome, outros depois), os dados ficaram fragmentados:

## Observação: 
O nome do perfil era "Threads User" e foi alterado para "webradiovitoriaa" depois. O id do perfil é o mesmo em ambos os registros. só atualize o nome do perfil para o nome correto "webradiovitoriaa" e remova o nome "Threads User" mantenha os dois registros de posts porque o  que tem somente 1 é o teste que fizemos no sistema e não foi publicado mas está marcado como publicado e o outro tem 93 posts que é a quantidade de posts que o perfil tem na plataforma real

- **Registros Antigos**: "Threads User" (93 posts)
- **Registro Novo**: "webradiovitoriaa" (1 post)

## 2. Proposta de Correção — Parte 1: Frontend (Curativo Imediato)
Vou aplicar uma lógica de agrupamento no `SocialNetworksView.tsx`. Antes de gerar a lista de perfis, o sistema vai:
1. Verificar se existem múltiplas conexões para a mesma plataforma e `username`.
2. Somar os métricas (seguidores e posts) se forem o mesmo perfil.
3. Exibir apenas um item unificado.

## 3. Proposta de Correção — Parte 2: Backend (Consolidação de Dados)
Vou fornecer um script SQL para você rodar no Supabase que:
1. Identifica a conexão principal do Threads (a mais recente com token válido).
2. Atualiza as métricas desta conexão com o valor máximo encontrado nos duplicatas.
3. Remove as conexões duplicadas para limpar o banco de dados.

## 4. Proposta de Correção — Parte 3: Prevenção (Core Logic)
Atualizar a função de retorno de OAuth para que ela sempre faça um `upsert` baseado em `(user_id, platform, platform_user_id)`, impedindo que novas duplicatas sejam criadas no futuro.

---

### Proposta de Script SQL para Limpeza:

```sql
-- 1. Identificar as duplicatas e manter apenas a mais recente
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id, platform, platform_user_id ORDER BY updated_at DESC) as rank
    FROM public.social_connections
    WHERE platform = 'threads'
)
-- 2. Deletar as que não são rank 1
DELETE FROM public.social_connections
WHERE id IN (SELECT id FROM duplicates WHERE rank > 1);

-- 3. Opcional: Limpar social_accounts duplicadas também
WITH accounts_dupes AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id, platform, platform_user_id ORDER BY updated_at DESC) as rank
    FROM public.social_accounts
    WHERE platform = 'threads'
)
DELETE FROM public.social_accounts
WHERE id IN (SELECT id FROM accounts_dupes WHERE rank > 1);
```

**Deseja que eu prossiga com a aplicação da lógica de agrupamento no Frontend agora?**
