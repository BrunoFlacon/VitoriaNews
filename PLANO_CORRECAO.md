# Plano de Correção — Analytics, Search & UI

## 1. **CRÍTICO: Edge Function zera YouTube/GA data para `source === "dashboard"`**

**Arquivo**: `supabase/functions/get-analytics/index.ts:248-249`

```ts
const gaViews = source === "dashboard" ? 0 : gaData.reduce(...)
const ytViews = source === "dashboard" ? 0 : ytData.reduce(...)
```

**Problema**: A Edge Function intencionalmente zera dados de YouTube e Google Analytics quando chamada pela página de analytics (`source === "dashboard"`), fazendo com que:
- `data.youtubeStats` fique sempre `{ views: 0, likes: 0, comments: 0 }`
- `data.gaStats` fique sempre `{ views: 0 }`
- Os cards "YouTube Analytics", "Google Ads" e "Google Analytics 4" sempre mostrem "Configure nas APIs"
- `ytSummaryData`, `ytPerformanceData`, `ytEngagementData`, `ytAgeData`, `ytTrafficData`, `ytShortsFunnel`, `ytShortsSpectators` todos fiquem `undefined` ou zeros

**Correção**: Remover a condição `source === "dashboard"` e sempre calcular gaViews/ytViews.

## 2. **CRÍTICO: Edge Function não retorna campos esperados por componentes**

**Problema**: Vários componentes no `AdvancedAnalytics` recebem dados de fontes diferentes, mas a Edge Function não retorna os campos que eles esperam:

| Componente | Campo Esperado | Origem Atual | Gap |
|---|---|---|---|
| `FormatReachChart` | `data.chartData` formatado | Derivado de `data.platformBreakdown` | OK (via `formatReachData` useMemo) |
| `ViralPotentialChart` | `data.viralPotentialData` | Derivado | OK (via `viralPotentialData` useMemo) |
| `RetentionFunnelChart` | `data.retentionFunnelData` | `usePlatformMetrics` | **Edge Function não query `video_retention`** |
| `FormatRecommendations` | `data.formatRecs` | `usePlatformMetrics` | **Edge Function não query `format_reach_data`** |
| `YouTubeSummaryCards` | `data.youtubeStats` | Edge Function | **Bug #1 faz ser sempre zero** |
| `AudienceDemographics` | `data.demographics` | `useSocialStats` | **Edge Function não query `demographics_data`** |

**Correção**: Expandir Edge Function para também consultar:
- `demographics_data` → retornar `demographics: { ageGroups, gender, devices, topCities, topCountries }`
- `video_retention` → retornar `retention` (para RetentionFunnelChart)
- `format_reach_data` → retornar `formatReachData` (para FormatReachChart)
- `viral_potential` → retornar `viralPotentialData` (para ViralPotentialChart)
- `top_content` → retornar `topContent` (já tem, mas complementar)
- `follower_growth_history` → retornar `followerGrowthHistory`

## 3. **MÉDIO: Pular validação de data inválida para períodos longos**

**Arquivo**: `supabase/functions/get-analytics/index.ts:82-85`

**Problema**: O cálculo de `startDate` pode produzir data inválida (`Invalid Date`) quando o período é `all` e não há `startDateParam`, especialmente em timezone onde o ajuste de dias extrapola. Isso joga erro 500.

**Correção**: Adicionar fallback: `if (isNaN(startDate.getTime())) { ... usar data padrão }` ou usar `luxon`/`date-fns`.

## 4. **MÉDIO: Search bar não faz live filtering (só no Enter)**

**Arquivo**: `src/components/dashboard/Header.tsx:39-61`

**Problema**: `executeSearch()` só é chamada no `onKeyDown` com `Enter`. Não há debounced search em cada keystroke.

**Correção**: Usar `handleSearchChange` com debounce (300ms) que dispara `system-search` com o termo atual. Manter Enter como fallback.

## 5. **MÉDIO: `AdvancedAnalytics` não reage a searchQuery em todas as seções**

**Arquivo**: `src/components/dashboard/AdvancedAnalytics.tsx`

**Problema**: O `searchQuery` é usado para filtrar `filteredTopContent` e `groupedFollowers`, mas NÃO filtra:
- `formatReachData`
- `bestTimes`
- `platformBreakdown` / PlatformDistribution
- IntegrationCards (YouTube, Ads, GA)

**Correção**: Aplicar filtro de busca também nesses componentes ou decidir explicitamente quais seções filtrar.

## 6. **MÉDIO: `useAnalytics` fallback dataSource = "demo" mostra banner amarelo mesmo com dados reais**

**Arquivo**: `src/hooks/useAnalytics.ts` e `src/components/dashboard/AdvancedAnalytics.tsx:364-368`

**Problema**: Quando Edge Function falha, o fallback usa `dataSource: "demo"`. O banner amarelo "Dados de conectividade indisponíveis" aparece mesmo quando há dados em cache.

**Correção**: Alterar condição para mostrar o banner apenas quando `dataSource === "demo"` E `!fetchedData` (sem dados em cache).

## 7. **MÉDIO: `AudienceTracking` não lista plataformas conectadas dinamicamente**

**Arquivo**: `src/components/dashboard/analytics/AudienceTracking.tsx:93-121`

**Problema**: Os filtros de rede (Select "Rede") têm apenas "Telegram" e "WhatsApp" hardcoded. Se o usuário conectar Instagram/Facebook, não aparece.

**Correção**: Popular os Selects dinamicamente baseado no `audienceBreakdown` recebido.

## 8. **MÉDIO: `messageStats.platformStats` pode conter plataformas inesperadas**

**Arquivo**: `supabase/functions/get-analytics/index.ts:334-347`

**Problema**: O código tenta normalizar plataformas, mas `messageStatsByPlatform` é inicializado apenas com WhatsApp e Telegram. Outras plataformas não serão exibidas.

**Correção**: Tornar `messageStatsByPlatform` dinâmico.

## 9. **MÉDIO: Dados de GA4 filtrados por `date` ao invés de `created_at`**

**Arquivo**: `supabase/functions/get-analytics/index.ts:112`

```ts
supabase.from("google_analytics_data").select(...).gte("date", startDate10)
```

A tabela `google_analytics_data` pode usar `created_at` para o filtro temporal. Se a coluna `date` for apenas a data dos dados (não de criação), o filtro está correto, mas pode não se alinhar com os demais.

**Correção**: Verificar schema e unificar estratégia de filtro.

## 10. **BAIXO: Export CSV/PDF não inclui dados de YouTube, Ads, GA**

**Arquivo**: `src/components/dashboard/AdvancedAnalytics.tsx:260-263`

**Problema**: `exportToXLSX(data, 'analytics')` exporta apenas `data`, mas não inclui dados de `demographics`, `retention`, etc. que estão em outros hooks.

**Correção**: Compilar payload completo no export.

---

## Ordem de Execução

1. **Corrigir #1** — Remover `source === "dashboard"` das linhas 248-249 do Edge Function (YouTube/GA zerados)
2. **Corrigir #2** — Adicionar queries para `demographics_data`, `video_retention`, `format_reach_data`, `viral_potential` no Edge Function  
3. **Corrigir #4** — Adicionar debounce no search bar para live filtering  
4. **Corrigir #5** — Aplicar searchQuery nos componentes que ainda não filtram  
5. **Corrigir #6** — Ajustar lógica do banner "demo"  
6. **Corrigir #3** — Adicionar fallback para data inválida  
7. **Corrigir #7** — Popular filtros de rede dinamicamente  
8. **Corrigir #8** — messageStatsByPlatform dinâmico  
9. **Corrigir #10** — Export completo  
