# Plano: Otimização Analytics, Publicação e SEO

## Diagnóstico (dados reais do banco)
- `post_metrics`: **77.952 linhas em 7 dias**, todas com `external_id = NULL` (Telegram 56k, Twitter 16k, Facebook/Threads 2.6k cada). O upsert em `(user_id, platform, external_id)` não deduplica porque NULL ≠ NULL no índice único — duplicação massiva está poluindo gráficos e queries.
- `account_metrics`: **0 linhas**. O collector grava em `social_metrics_history` (tabela inexistente) — o erro é silencioso. Resultado: gráficos de crescimento de seguidores ficam vazios.
- `social_connections` ativos: 1 · `social_accounts`: 2 → coleta funciona, persistência de série temporal não.
- SEO: faltam `sitemap.xml` e `llms.txt`; `robots.txt` não referencia sitemap.

## Correções

### 1. Edge Function `collect-social-analytics`
- Trocar `INSERT social_metrics_history` por `INSERT account_metrics` (com `social_account_id`, `platform`, `followers`, `posts_count`, `views`, `likes`, `shares`, `comments`, `engagement_rate`, `collected_at`).
- Filtrar `fetchedPosts` para descartar itens sem `external_id` antes do upsert em `post_metrics`.

### 2. Limpeza do banco (migração)
- Deletar linhas duplicadas: `DELETE FROM post_metrics WHERE external_id IS NULL`.
- Criar índice parcial para reforçar dedup: `CREATE UNIQUE INDEX ... ON post_metrics (user_id, platform, external_id) WHERE external_id IS NOT NULL`.

### 3. SEO
- Criar `public/sitemap.xml` com rotas estáticas (`/`, `/news`, `/manual`, `/terms`, `/privacy`, `/profile/bruno-flacon`).
- Criar `public/llms.txt` descrevendo o portal para LLMs.
- Atualizar `public/robots.txt` adicionando `Sitemap:` apontando para domínio público.
- Criar `scripts/generate-sitemap.ts` que regenera o `sitemap.xml` lendo artigos publicados da tabela `news_articles` (executável manual / pré-build).

### 4. Validação pós-deploy
- Disparar `collect-social-analytics` manualmente; conferir que `account_metrics` recebe novas linhas.
- Conferir que `post_metrics` para de crescer com duplicatas (count estável entre execuções).
- Verificar `/sitemap.xml` e `/llms.txt` retornando 200.

## Fora de escopo
- Scripts de publicação (`publish-post/platforms/*`) já estão em produção e o usuário não relatou falhas atuais; manter inalterados.
- Componente `AdvancedAnalytics.tsx` consome `chartData`/`platformBreakdown`/`followerData` que já existem na resposta — basta o backend popular `account_metrics` para os gráficos de crescimento voltarem a renderizar.
