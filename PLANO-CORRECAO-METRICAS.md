# Plano de Correção — Auditoria de Métricas, Gráficos e Performance

## 🔍 Resumo da Auditoria

Foram auditados: `AdvancedAnalytics.tsx`, `DashboardHomeView.tsx`, `AnalyticsChart.tsx`, `StatsCard.tsx`, `StatsGrid.tsx`, `useAnalytics.ts`, `useSocialStats.ts`, `Dashboard.tsx`, e `DateTimeWeather.tsx`.

---

## 🚨 Problemas Encontrados

### 1. Métricas de Tendência (Alta/Baixa/Negativo) SEMPRE mostram 0%

**Arquivo:** `src/components/dashboard/AdvancedAnalytics.tsx:520`
**Causa:** `engagement.growth` é hardcoded como `"0"` no fallback local.
```ts
growth: "0",  // linha 520 — NUNCA é calculado
```
**Impacto:** O componente `renderTrend()` (linha 713) sempre renderiza neutro (0%) porque `growth` nunca é computado. O `StatsGrid.tsx` também sofre do mesmo problema.

**Correção:** Calcular o growth comparando o período atual com o período anterior nos dados de `account_metrics`. Se não houver dados históricos, usar `undefined` para não mostrar tendência.

---

### 2. Gráfico de Linha (AreaChart) exibe dados FALSOS (sintéticos)

**Arquivo:** `src/components/dashboard/AdvancedAnalytics.tsx:468-490` e `src/pages/Dashboard.tsx:180-192`
**Causa:** Quando não há dados reais, o código gera dados sintéticos usando `Math.sin()` com variações aleatórias que **aparentam ser reais**.
```ts
const variation = 0.2 * Math.sin(i * 1.7);  // DADO FALSO
```
**Impacto:** Engana o usuário mostrando variações que não existem.

**Correção:** Quando não houver dados reais, mostrar linhas retas (flat) com o valor médio OU exibir uma mensagem "Dados insuficientes para gráfico". Nunca gerar dados sintéticos.

---

### 3. Duplicação de Dados entre useAnalytics e useSocialStats

**Arquivos:** `src/hooks/useAnalytics.ts:325-342` vs `src/hooks/useSocialStats.ts:69-93`
**Causa:** Ambos os hooks buscam `account_metrics` e `social_accounts` da mesma tabela Supabase, mas com lógicas de transformação diferentes. O `AdvancedAnalytics.tsx:325` faz uma query separada de `account_metrics` para time-series, enquanto `useSocialStats` já busca `social_accounts` com todos os campos.

**Impacto:** Dados inconsistentes entre Dashboard e Analytics para a mesma métrica. Ex: seguidores totais podem divergir.

**Correção:** Unificar a fonte de dados. `useAnalytics` deve consumir os dados já normalizados do `useSocialStats` em vez de fazer query duplicada. Eliminar a query `account_metrics` separada.

---

### 4. PlatformBreakdown pode dobrar plataformas não normalizadas

**Arquivo:** `src/components/dashboard/AdvancedAnalytics.tsx:369-378`
**Causa:** O `normalizePlatform()` (linha 650) é chamado no agrupamento, mas a chave do objeto `pb` usa o valor normalizado. Se a mesma plataforma aparece com nomes diferentes no DB (ex: "Instagram" e "instagram"), serão somadas corretamente. Porém, se há contas duplicadas na tabela `social_accounts`, os valores serão somados em dobro.

**Impacto:** Métricas infladas no gráfico de pizza e nos cards.

**Correção:** Adicionar verificação de duplicidade por `platform_user_id` no agrupamento do `platformBreakdown`, similar ao que já é feito em `groupedFollowers` (linha 575).

---

### 5. Slow Loading — 5 queries paralelas em useSocialStats

**Arquivo:** `src/hooks/useSocialStats.ts:69-93`
**Causa:** Toda vez que o hook refetch (ex: ao mudar de plataforma), executa 5 consultas Supabase distintas em paralelo (`social_accounts`, `api_credentials`, `messaging_channels`, `messages`, `scheduled_posts`). Cada uma pode levar de 200ms a 2s.

**Impacto:** O loading total pode levar 3-5 segundos mesmo em conexão boa. Em conexão lenta, pode passar de 10s.

**Correção:** 
- Unificar em UMA query com joins ou usar `select(*)` com `or` filter
- Implementar cache persistente (localStorage) entre sessões
- Mostrar dados antigos imediatamente e atualizar em background (stale-while-revalidate)

---

### 6. Loading Spinner Infinito — tela branca com giratório

**Arquivo:** `src/components/dashboard/AdvancedAnalytics.tsx:694-705`
**Causa:** O componente retorna um spinner FULLSCREEN quando `loading = true`. Isso inclui o tempo de `syncMutation.isPending` (que pode levar 60s+).
```tsx
if (loading) {
  return (
    <div className="flex bg-background/50 h-[600px] items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p>Carregando analytics em tempo real...</p>
    </div>
  );
}
```

**Impacto:** Usuário vê spinner por minutos. Pior: quando `useAnalytics` está em staleTime, o spinner some, mas se clicar em "Sincronizar", volta por até 60s.

**Correção:** 
- Substituir por "Skeleton loading" inline sobre os dados existentes
- Nunca mostrar tela branca — sempre mostrar últimos dados conhecidos
- Usar `isFetching` (revalidação em background) em vez de `isLoading` para exibir indicador sutil

---

### 7. Dashboard — dados sintéticos no gráfico principal

**Arquivo:** `src/pages/Dashboard.tsx:157-193`
**Causa:** Mesmo problema do item 2 — gera dados falsos com `Math.sin()` e `Math.random()` quando não há dados reais.

**Correção:** Mesma do item 2 — nunca gerar dados sintéticos. Mostrar flat lines ou "Sem dados".

---

### 8. get-weather (Edge Function) retorna 500

**Arquivo:** `src/components/dashboard/DateTimeWeather.tsx:112`
**Causa:** A Edge Function `get-weather` está retornando 500 Internal Server Error. Isso gera console error constante.

**Correção:** O componente trata bem com fallback, mas seria melhor consertar a Edge Function ou desabilitar a chamada se falhar repetidamente (já tem retry, mas ainda polui o console).

---

## 📋 Plano de Implementação

### Fase 1: Correção de Métricas Distorcidas (Prioridade ALTA)

| Item | Arquivo | Ação |
|------|---------|------|
| 1 | `AdvancedAnalytics.tsx:520` | Calcular `growth` real a partir de `account_metrics` comparando períodos; se não houver dados, retornar `undefined` |
| 2 | `AdvancedAnalytics.tsx:468-490` | Remover geração de dados sintéticos; mostrar flat lines com valor médio ou "Sem dados" |
| 3 | `AdvancedAnalytics.tsx:325-342` | Remover query duplicada de `account_metrics`; usar dados já normalizados de `useSocialStats` |
| 4 | `AdvancedAnalytics.tsx:369-378` | Adicionar dedup por `platform_user_id` no `platformBreakdown` |
| 7 | `Dashboard.tsx:157-193` | Remover dados sintéticos do `dashboardChartData` |

### Fase 2: Performance e Loading (Prioridade ALTA)

| Item | Arquivo | Ação |
|------|---------|------|
| 5 | `useSocialStats.ts:69-93` | Reduzir de 5 queries para 1-2 queries; adicionar cache localStorage |
| 6 | `AdvancedAnalytics.tsx:694-705` | Substituir spinner fullscreen por skeleton inline + stale-while-revalidate |
| 6 | `useAnalytics.ts:387` | Separar `loading` de `syncMutation.isPending` — não travar UI durante sync |

### Fase 3: Dashboard HomeView (Prioridade MÉDIA)

| Item | Arquivo | Ação |
|------|---------|------|
| 3 | `DashboardHomeView.tsx:76-87` | Unificar `computeFollowerGrowth` com dados consistentes |
| 2 | `AnalyticsChart.tsx:27-35` | Remover dados placeholder falsos |

### Fase 4: Limpeza (Prioridade BAIXA)

| Item | Arquivo | Ação |
|------|---------|------|
| 8 | `DateTimeWeather.tsx:112` | Verificar Edge Function `get-weather` ou reduzir ruído no console |
| - | `StatsGrid.tsx` | Sincronizar com as mesmas métricas do AdvancedAnalytics |

---

## 🔧 Detalhamento das Correções

### Correção 1 — Calcular Growth Real

No `AdvancedAnalytics.tsx`, dentro do fallback local (linha 362), substituir:
```ts
// ANTES (linha 520)
growth: "0",

// DEPOIS
growth: (() => {
  if (accountMetrics.length < 2) return undefined;
  const sorted = [...accountMetrics].sort((a, b) => 
    new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime()
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const oldFollowers = Number(first.followers || 0);
  const newFollowers = Number(last.followers || 0);
  if (oldFollowers === 0) return undefined;
  return (((newFollowers - oldFollowers) / oldFollowers) * 100).toFixed(2);
})(),
```

### Correção 2 — Remover Dados Sintéticos

No `AdvancedAnalytics.tsx` (linha 467), quando não houver time-series:
```ts
// ANTES:
cd.push({ views: Math.max(1, Math.round((pfViews / daysCount) * perMetric.views)), ... });

// DEPOIS:
// Distribuir igualmente sem variação artificial
cd.push({
  name: key,
  views: Math.round(pfViews / daysCount),
  likes: Math.round(pfLikes / daysCount),
  comments: Math.round(pfComments / daysCount),
  shares: Math.round(pfShares / daysCount),
  engagement: Math.round(pfEng / daysCount),
  reach: Math.round((pfViews * 0.35) / daysCount),
  followers: Math.round(pfFollow / daysCount),
  posts: pfPosts > 0 ? Math.round(pfPosts / daysCount) : 0,
});
```

### Correção 3 — Unificar Queries useSocialStats

Substituir as 5 queries paralelas por 2 queries:
```sql
-- social_accounts com joins virtuais
supabase.from('social_accounts').select('*').eq('user_id', user.id)
supabase.from('messaging_channels').select('*').eq('user_id', user.id)
-- messages e scheduled_posts sob demanda (lazy load)
```

### Correção 5 — Cache Persistente

Adicionar no `useSocialStats`:
```ts
// Salvar no localStorage após cada fetch bem-sucedido
useEffect(() => {
  if (data) {
    localStorage.setItem('social_stats_cache', JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }
}, [data]);

// No initialData, carregar do cache
const cached = localStorage.getItem('social_stats_cache');
const initialData = cached ? JSON.parse(cached) : undefined;
```

### Correção 6 — Loading Inteligente

Substituir no `AdvancedAnalytics.tsx`:
```tsx
// ANTES:
if (loading) { return <Spinner />; }

// DEPOIS:
const showFullLoading = loading && !data; // só mostra spinner se não tem dados
if (showFullLoading) { return <SkeletonChart />; }
// Se tem dados, mostra com indicador sutil no topo
```

---

## ⏱ Estimativa de Esforço

| Fase | Descrição | Arquivos | Complexidade |
|------|-----------|----------|-------------|
| 1 | Métricas e dados falsos | 4 | Média |
| 2 | Performance e loading | 3 | Alta |
| 3 | Dashboard Home | 2 | Baixa |
| 4 | Limpeza | 2 | Baixa |

**Total estimado: 6-8 horas de desenvolvimento**
