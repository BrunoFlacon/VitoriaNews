# Auditoria Dashboard - 25/08/2026

## Resumo Executivo

| Area | Status | Erros Encontrados | Corrigidos |
|------|--------|-------------------|------------|
| Edge Function get-analytics | CRITICO (500) | 1 | 1 (deploy pendente via GitHub) |
| Posts (useScheduledPosts) | ALTO | 2 | 2 |
| Stories (StoriesLivesView) | ALTO | 1 | 1 |
| Analytics Fallback (useAnalytics) | MEDIO | 1 | 1 |

---

## 1. Edge Function `get-analytics` — ERRO 500

### Erro
```
SyntaxError: Identifier 'demographicsData' has already been declared
at file:///var/tmp/sb-compile-edge-runtime/functions/get-analytics/index.ts:137:11
```

### Causa Raiz
O Supabase self-hosted (`supabase.webradiovitoria.com.br`) roda uma versao antiga da edge function que tinha `const demographicsData` declarado duas vezes (linhas 121 e 170 no codigo antigo).

### Correcao Aplicada
- Removido dead code: `credDemRes` (query desnecessaria a `demographics_data`), `demoDataFix` (variavel nao utilizada), `analyticsDemographicsData` (variavel nao utilizada)
- Removida query `demographics_data` do `Promise.allSettled` — era executada a cada request sem motivo
- **Deploy**: Codigo commitado no GitHub (`1e32e3c`). O self-hosted Supabase precisa ser atualizado via GitHub (metodo usado pela equipe)

### Status
- [x] Codigo corrigido localmente
- [x] Commitado no GitHub
- [ ] Deploy no self-hosted Supabase (pendente — aguarda pull no servidor)

---

## 2. Posts nao exibidos no Dashboard

### Erro Principal
Quando qualquer query secundaria (`post_metrics`, `post_metrics_details`, `media`, `published_posts`) falhava, a excecao nao era capturada e matava a funcao `fetchPosts` inteira. Resultado: posts carregados do banco eram descartados e o UI mostrava "Nenhuma publicacao ainda".

### Correcoes Aplicadas

#### 2a. Secondary queries sem try/catch (useScheduledPosts.ts)
- `post_metrics` e `post_metrics_details` agora rodam em `Promise.all()` dentro de `try/catch`
- Query `media` agora tem `try/catch` proprio
- Query `published_posts` agora tem `try/catch` proprio
- **Impacto**: Se metrics/media/published_posts falharem, os posts AINDA sao exibidos (sem metricas/detalhes)

#### 2b. refetch shadowed por fetchPosts raw (useScheduledPosts.ts)
- **Antes**: `refetch: fetchPosts` — chamadas manual nao atualizavam o cache do React Query
- **Depois**: `refetch` usa `queryClient.invalidateQueries()` + React Query's `refetch`
- **Impacto**: Delete/update de posts agora atualiza a UI imediatamente

#### 2c. Retry e error state
- Adicionado `retry: 1` e `retryDelay: 3000` ao useQuery
- Exposto `isError` e `error` do React Query para que o UI possa exibir erros

---

## 3. Stories nao exibidos no Dashboard

### Erro Principal
`StoriesLivesView.tsx` — as funcoes `fetchItems`, `fetchSessions`, `fetchClips`, `fetchMemories` tinham tratamento de erro deficiente:
- `fetchItems`: `if (!error && data)` silenciava erros — usuario ve estado vazio sem mensagem
- `fetchSessions`/`fetchClips`: desestruturavam `{ data }` sem checar `error`
- `fetchMemories`: mesma situacao

### Correcoes Aplicadas
- Todas as funcoes agora tem `try/catch` com `console.error`
- `fetchItems` exibe toast de erro quando a query falha
- Loading states agora resolvem em `finally` (garante que loading = false mesmo em excecao)

---

## 4. Analytics Fallback (useAnalytics.ts)

### Problema
Quando a edge function retornava 500, o fallback era `getDemoAnalyticsData()` — dados zeros sem valor real.

### Correcao Aplicada
- Novo `fetchFallbackLocalAnalytics()` que consulta `scheduled_posts` + `post_metrics` diretamente
- Retorna dados reais (posts count, likes, comments, shares, views) quando a edge function esta indisponivel
- Fallback final continua sendo `getDemoAnalyticsData()` se ate as queries diretas falharem

---

## 5. Diferenca Edge Functions: GitHub vs Self-Hosted

| Arquivo | GitHub (HEAD) | Self-Hosted (Deployado) |
|---------|---------------|------------------------|
| get-analytics/index.ts | Corrigido (dead code removido) | ERRO: `demographicsData` duplicado |
| _shared/credentials.ts | Mensagem de erro melhorada | Versao antiga |

**Acao necessaria**: Pull/redeploy no servidor `167.234.241.44` para atualizar as edge functions.

---

## Arquivos Alterados

| Arquivo | Mudancas |
|---------|----------|
| `src/hooks/useScheduledPosts.ts` | try/catch em queries, refetch correto, retry, isError |
| `src/components/dashboard/StoriesLivesView.tsx` | try/catch em todos os fetch*, error toasts, finally blocks |
| `src/hooks/useAnalytics.ts` | fetchFallbackLocalAnalytics com dados reais |
| `supabase/functions/get-analytics/index.ts` | Dead code removido (credDemRes, demoDataFix, demographics_data query) |

## Commits

- `1e32e3c` — fix: audit dashboard - protect posts/stories loading from query failures
