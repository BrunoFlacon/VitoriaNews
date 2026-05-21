# Correções de Analytics, Dados e SEO

## 1. Edge Function `collect-social-analytics`
Trocar o `INSERT social_metrics_history` (tabela inexistente — falha silenciosa) por `INSERT account_metrics` com `social_account_id`, `platform`, `followers`, `posts_count`, `views`, `likes`, `shares`, `comments`, `engagement_rate` e `collected_at`. Filtrar `fetchedPosts` para descartar itens sem `external_id` antes do upsert em `post_metrics` (NULL contorna o índice único e gera duplicatas).

## 2. Limpeza e proteção do banco (migração)
- `DELETE FROM post_metrics WHERE external_id IS NULL` — remove os 77.952 registros duplicados acumulados.
- Criar índice único parcial `(user_id, platform, external_id) WHERE external_id IS NOT NULL` em `post_metrics` para reforçar a dedupe.
- Criar índice em `account_metrics (user_id, social_account_id, collected_at DESC)` para acelerar consultas de crescimento.

## 3. SEO
- Criar `public/sitemap.xml` com rotas estáticas (`/`, `/news`, `/manual`, `/terms`, `/privacy`, `/profile/bruno-flacon`).
- Criar `public/llms.txt` descrevendo o portal para LLMs.
- Atualizar `public/robots.txt` adicionando linha `Sitemap:` apontando para o domínio público.
- Criar `scripts/generate-sitemap.ts` que regenera `sitemap.xml` lendo `articles` com `status = 'published'` (uso manual/pré-build).

## 4. Validação pós-deploy
- Disparar `collect-social-analytics` manualmente e verificar que `account_metrics` recebe linhas novas.
- Reconferir `post_metrics`: contagem deve estabilizar e novas linhas devem ter `external_id`.
- Conferir `/sitemap.xml`, `/llms.txt` e `/robots.txt` retornando 200.

## Fora de escopo
- Scripts de publicação (`publish-post/platforms/*`) — sem falhas reportadas, manter inalterados.
- UI `AdvancedAnalytics.tsx` — já consome `chartData`/`platformBreakdown`/`followerData`; voltará a renderizar crescimento assim que `account_metrics` for populada.
