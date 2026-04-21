

# Plano: Auditoria Completa do Sistema — Verificação de APIs, Dados e Renderização

Realizei uma varredura completa em todas as páginas/menus/ferramentas, conferindo banco de dados, edge functions, jobs agendados e renderização nos gráficos. Abaixo o diagnóstico real e o que precisa ser corrigido para que **os dados que aparecem nos gráficos correspondam ao que está no layout**.

## Diagnóstico (estado atual)

### O que está saudável
- **Sidebar/menus** carregam corretamente (12 itens, fallback funciona)
- **RLS** está permissive em todas as 12 tabelas auditadas — usuários conseguem CRUD
- **Edge function `get-analytics`** está deployada e respondendo (healthy)
- **Tabelas existentes**: `scheduled_posts` (23), `messages` (6), `notifications` (44), `messaging_channels` (4), `media` (1)
- **Cron `analytics_worker`** roda a cada 6h (último: hoje 12:00)

### Problemas críticos que distorcem os gráficos

| # | Problema | Evidência | Impacto visual |
|---|----------|-----------|----------------|
| 1 | **`post_metrics` poluída com 313.949 linhas zeradas** | 5 posts antigos com 20–32 mil linhas cada, todas com likes=0, comments=0, impressions=0. Inseridas a cada 5min desde 15/03 por `collect_post_analytics()` antigo | Gráfico de engajamento aparece **completamente flat (zero)** mesmo havendo "dados reais" |
| 2 | **`account_metrics` está vazia (0 linhas)** | Cron `analytics_worker` só grava log, nunca chama `collect-social-analytics` | Card "Crescimento de Seguidores" não renderiza tendência |
| 3 | **`social_accounts` desatualizada** | Telegram e X com followers=0, posts_count=0, último update em 13–14/03 | Cards de "Redes Conectadas" mostram zeros |
| 4 | **9 jobs `publish_post` falharam/retry** sem `error_message` preenchido | Falhas silenciosas no worker | Posts não publicam, métricas não chegam |
| 5 | **Apenas 1 conexão social ativa** (Telegram) | Mas há `post_metrics` para X, Facebook, Threads, Twitter — deduplicação inconsistente entre `x` e `twitter` no banco | Breakdown de plataformas mostra plataformas não conectadas |
| 6 | **`articles=0`, `live_sessions=0`, `live_clips=0`** | Tabelas vazias por design (sem dados de teste) | Telas Notícias / Lives / Cortes aparecem vazias mas funcionais |
| 7 | **Warning React**: `BulkUploadDialog` recebe ref sem `forwardRef` | Console runtime | Warning visível em DevTools, sem impacto funcional |

## Plano de Correção

### Etapa 1 — Limpar lixo de métricas (migration)
- Apagar todas as linhas de `post_metrics` com `likes=0 AND comments=0 AND shares=0 AND impressions=0` (libera ~313k linhas).
- Desabilitar/remover a função antiga `collect_post_analytics()` que gerava as inserções vazias e qualquer cron que a chamava em loop.

### Etapa 2 — Corrigir cron `analytics_worker`
- Substituir o stub atual (que só grava log) por uma chamada real via `pg_net` ao edge function `collect-social-analytics`, passando o JWT do service role.
- Manter periodicidade de 6h.
- Resultado: `social_accounts` e `account_metrics` voltam a ser atualizadas com dados reais das APIs (Telegram + futuras conexões).

### Etapa 3 — Sincronizar dados imediatamente (manual trigger)
- Após corrigir o cron, invocar `collect-social-analytics` uma vez para popular `social_accounts` e `account_metrics` com o estado atual das APIs.
- Invocar `sync-telegram-chats` para atualizar contagem de membros dos canais.

### Etapa 4 — Limpar jobs zumbi e exibir erro real
- Marcar como `failed` os 3 jobs em `retry` há semanas.
- Atualizar `worker_process_jobs()` para gravar `error_message` quando o job falha (hoje grava string vazia).

### Etapa 5 — Normalização de plataforma no banco
- Atualizar `post_metrics` setando `platform='twitter'` onde `platform='x'` (consolida com `normalizePlatform` já existente no frontend e edge function).
- Adicionar índice em `post_metrics(user_id, collected_at, platform)` para acelerar agregações.

### Etapa 6 — Corrigir warning React do `BulkUploadDialog`
- Envolver o componente `BulkUploadDialog` com `React.forwardRef` para aceitar a ref que o Dialog do Radix passa internamente.

### Etapa 7 — Verificação automatizada (após mudanças)
- Rodar `get-analytics` via curl autenticado e validar resposta:
  - `dataSource` deve ser `real` (não `seeded`)
  - `engagement.views > 0` apenas se houver impressões reais
  - `followerData` deve listar Telegram com `currentFollowers` real (32 do canal Tupã Livre)
  - `platformBreakdown` não deve ter chave `x` separada de `twitter`
- Comparar com o que o componente `AdvancedAnalytics` renderiza visualmente.

## Arquivos / Recursos afetados

**Banco de dados** (uma migração + um insert via tool):
- DELETE em `post_metrics` (linhas zeradas)
- DROP/REPLACE função `collect_post_analytics()`
- REPLACE função `collect_social_analytics()` para chamar `net.http_post` no edge function
- UPDATE jobs zumbis em `job_queue`
- UPDATE `post_metrics` para normalizar `x → twitter`
- CREATE INDEX em `post_metrics`

**Edge functions** (sem mudanças de código — só re-invocar):
- `collect-social-analytics` (trigger manual pós-correção)
- `sync-telegram-chats` (trigger manual pós-correção)

**Frontend** (1 arquivo):
- `src/components/dashboard/BulkUploadDialog.tsx` — adicionar `React.forwardRef`

## Resultado esperado após execução

- Gráficos do **AdvancedAnalytics** deixam de mostrar zeros achatados e passam a refletir métricas reais agregadas.
- Card **Crescimento de Seguidores** começa a mostrar tendência (após 2 ciclos do cron, ~12h).
- **Redes Conectadas** mostra o canal Telegram com 32 membros (dados reais).
- **Breakdown por plataforma** não duplica X/Twitter.
- **Console** sem o warning de ref.
- **Jobs falhados** ficam visíveis com mensagem de erro real para debugging.
- Demais áreas (Notícias, Lives, Cortes) continuam vazias por ausência de conteúdo cadastrado — **funcionando corretamente**, apenas sem dados de teste.

