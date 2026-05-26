# Plano de Auditoria e Consolidação — Perfil Threads Duplicado

## 1. Diagnóstico do Problema
O print enviado mostra três entradas no seletor de perfil do Threads:
- **@Threads User** (0 seguidores, 93 posts)
- **@webradiovitoriaa** (0 seguidores, 1 post)
- **@Threads User** (0 seguidores, 93 posts)

Isso indica que o banco de dados possui registros fragmentados. Provavelmente existem múltiplas entradas na tabela `social_connections` e/ou `social_accounts` que não foram devidamente vinculadas pelo `platform_user_id`.

## 2. Passos da Auditoria

### 2.1 Inspeção de Dados (Forense de Banco)
Precisamos verificar o conteúdo atual das tabelas para o seu `user_id`:
- **Consulta A**: Listar todas as conexões do Threads em `social_connections`.
- **Consulta B**: Listar todos os registros de métricas em `social_accounts` para a plataforma Threads.
- **Objetivo**: Verificar se o `platform_user_id` é o mesmo ou se existem IDs nulos/manuais.

### 2.2 Verificação da Lógica de Mapeamento (Frontend)
Analisar o arquivo `src/components/dashboard/SocialNetworksView.tsx` (linhas 180-207) para ver como ele une `connections` e `stats`. Se houver 3 conexões, ele mostrará 3 cards.

### 2.3 Auditoria da Edge Function de Sincronização
Verificar `supabase/functions/collect-social-analytics/index.ts` para entender por que ela está criando entradas de 93 posts separadas da entrada de 1 post.

## 3. Proposta de Consolidação

### 3.1 Unificação na Limpeza (SQL)
Proponho um script de migração que:
1. Identifique duplicatas baseadas no `username` ou `platform_user_id`.
2. Mantenha a conexão mais recente (que possui o `access_token` válido).
3. Transfira as métricas (posts, seguidores) para o registro principal.
4. Delete as conexões órfãs ou duplicadas.

### 3.2 Reforço da Lógica de "Single Source of Truth"
1. **Unique Constraint**: Adicionar uma restrição única no banco para `(user_id, platform, username)` na tabela `social_connections` se possível, ou garantir que o OAuth sempre faça `upsert`.
2. **Frontend Filter**: Modificar o `SocialNetworksView.tsx` para agrupar conexões que compartilham o mesmo `platform_user_id` ou `username` antes de renderizar a lista.

## 4. Próxima Ação Imediata
Vou realizar a inspeção dos dados agora para confirmar a causa raiz antes de aplicar o script de limpeza.
