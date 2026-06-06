# Plano: Auditoria e Correção da Página de Analytics

## Objetivo
Corrigir violações de console (Forced Reflow, setTimeout), fazer todas as caixas/métricas/gráficos filtrados por rede social selecionada, mesclar abas Dashboard e API Feed, adicionar seletor de período por datas, e reposicionar seletor de rede social.

---

## 1. Corrigir Violações do Console

### 1.1 Forced Reflow — `scrollContainer`
**Arquivo:** `src/components/dashboard/AdvancedAnalytics.tsx`
**Linhas:** ~183, ~1959, ~2073

**Problema:** `scrollContainer` usa `requestAnimationFrame` com `behavior: 'instant'` (ignorado). Chama `document.getElementById` seguido de `.scrollBy()` + `.scrollLeft`, causando reflow forçado.

**Solução:**
- Substituir `document.getElementById` por `useRef` nos containers `audience-scroll` e `follower-scroll`
- Usar `element.scrollBy({ left: delta, behavior: 'smooth' })` direto, sem `requestAnimationFrame`
- Extrair `scrollContainer` para função memoizada que recebe ref

### 1.2 Forced Reflow — `<style>` inline no JSX
**Arquivo:** `src/components/dashboard/AdvancedAnalytics.tsx`
**Linhas:** ~1750

**Problema:** `<style>{`.pie-legend-container::-webkit-scrollbar { display: none; }`}</style>` injetado no JSX recria uma tag `<style>` em cada render, forçando reflow.

**Solução:**
- Mover o estilo para um arquivo CSS (ex: `src/index.css` ou `src/components/dashboard/analytics.css`)
- Ou usar `useMemo` + `useEffect` para injetar o style apenas uma vez

### 1.3 setTimeout — Export PDF
**Arquivo:** `src/components/dashboard/AdvancedAnalytics.tsx`
**Linha:** ~219

**Problema:** `await new Promise(r => setTimeout(r, 500))` bloqueia a UI por 500ms.

**Solução:**
- Substituir por `requestAnimationFrame` em loop com contador (~8 frames = ~133ms)
- Ou remover o delay se desnecessário (html2canvas já aguarda o próximo frame)

### 1.4 setTimeout Handler — Auto-sync + Animações
**Arquivo:** `src/components/dashboard/AdvancedAnalytics.tsx`
**Linhas:** ~18625 (chunk minificado refere-se a `useEffect` com `setTimeout`)

**Problema:** Efeitos colaterais pesados (auto-sync, animações framer-motion) disparam em loop.

**Solução:**
- Verificar se `hasAutoSynced`/`hasAutoSyncedChart` refs estão funcionando (não resetando em remounts)
- Garantir que `syncAnalytics()` seja chamado com `{ staleTime: Infinity }` para evitar re-fetch em mudanças de dependência
- Adicionar `scrollBehavior: 'instant'` removido — manter apenas `scrollBy`

---

## 2. Auditoria de Filtro por Rede Social

### Problema Atual
Quando o usuário seleciona "Facebook" no seletor de plataforma, algumas seções NÃO filtram corretamente:
- `demographicData` (linhas 1070-1104): **hardcoded**, nunca muda
- Cards "Response Time" (linhas 1858-1878): **hardcoded**, nunca muda
- "Ads & Web Performance": usa `adsStats` do Edge Function, pode não filtrar
- "YouTube Growth": usa `youtubeStats`, filtrado apenas da função local
- Mensagens: usa `hookMessageStats` que pode não filtrar por plataforma

### Solução

#### 2.1 Substituir Dados Hardcoded por Dados Reais
**`demographicData`** (linhas 1070-1104):
- Substituir por dados computados de `stats` (social_accounts)
- Agrupar por `platform` quando filtrado
- Exibir: faixas etárias simuladas baseadas em `followers_count`, top cidades do `metadata.location`, devices genéricos

**`Response Time`** (linhas 1858-1878):
- Substituir por métricas reais de mensagens por plataforma
- Se `hookMessageStats.platformStats` existir, calcular tempo médio de resposta
- Caso contrário, exibir "N/A" em vez de valores hardcoded

#### 2.2 Forçar todas as queries a respeitarem `platform`
- `youtubeStats`: já filtra por `normalizePlatform(s.platform) === 'youtube'` — OK
- `adsStats`: passar `platform` no body da Edge Function e garantir que o backend filtra
- `hookMessageStats`: adicionar filtro `platform` no hook `useMessageStats` ou no `useMemo`

#### 2.3 Estado Global `pieSelectedPlatform`
Já existe (linha ~1704). Quando o usuário clica em um item do gráfico de pizza, `pieSelectedPlatform` é setado. Esse estado DEVERIA filtrar as outras seções também, mas atualmente só afeta o destaque visual do pie chart.

**Solução:**
- Quando `pieSelectedPlatform !== null`, propagar para `platform` (via `setPlatform`)
- Ou adicionar badge "Filtrado por: [plataforma]" na seção de gráficos

---

## 3. Mesclar Abas "Dashboard" e "API Feed"

### Problema Atual
O toggle "Dashboard" / "API Feed" (linhas 1176-1194) só muda `source` de `'dashboard'` para `'api'`, enviado no body da Edge Function. O UI renderizado é **idêntico** em ambos os modos. Não há独 cards exclusivos de cada aba.

### Solução
1. **Remover o toggle** "Dashboard" / "API Feed" da UI
2. **Sempre enviar `source: 'all'`** (ou ambos os sources) na Edge Function
3. Atualizar a Edge Function `get-analytics` para aceitar `source: 'all'` e mesclar dados dos dois sources

### Alterações na Edge Function
**Arquivo:** `supabase/functions/get-analytics/index.ts`
- Adicionar suporte a `source === 'all'`: executar lógica de ambos os sources e mesclar
- Para `topContent`/`bestTimes`: concatenar arrays e deduplicar
- Para `overview`/`engagement`: usar valores máximos de cada source

---

## 4. Adicionar Seletor de Período por Data (Date Range Picker)

### Problema Atual
O seletor de período atual (linhas 1197-1213) tem opções fixas: `24h, 3d, 7d, 15d, 30d, ... 1825d`.

### Solução
Adicionar **Date Range Picker** ao lado do botão de período existente.

#### 4.1 Estado
```typescript
const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
```

#### 4.2 UI
- Botão "📅 Período Personalizado" ao lado do `DropdownMenu` de período
- Ao clicar, abrir `Popover` com dois inputs `<input type="date">` (start e end)
- Botão "Aplicar" que dispara refetch com datas customizadas
- Quando `dateRange` está ativo, o `DropdownMenu` de período mostra "Personalizado" com indicador visual

#### 4.3 Data Flow
- `dateRange` é enviado como `start_date`/`end_date` no body da Edge Function
- A Edge Function calcula métricas agregadas e chartData baseado nas datas
- O frontend usa `dateRange.start` / `dateRange.end` para calcular `pDays` no fallback

#### 4.4 Validação
- Start não pode ser depois de End
- End não pode ser depois de hoje
- Diferença máxima: 5 anos (1825 dias)

### 4.5 Componente
Criar `src/components/dashboard/DateRangePicker.tsx`:
```tsx
interface DateRangePickerProps {
  start: Date | null;
  end: Date | null;
  onChange: (range: { start: Date | null; end: Date | null }) => void;
  onApply: () => void;
  disabled?: boolean;
}
```

---

## 5. Reposicionar Seletor de Rede Social

### Problema Atual
O seletor de plataforma está em um `Popover` escondido entre outros botões (linhas 1226-1280). O usuário quer ele **ao lado do botão de período**, visível e proeminente.

### Solução
Mover o seletor de plataforma para o mesmo nível do seletor de período, lado a lado.

#### Layout do Header:
```
[Visão Geral] [Trends] | [📅 Período ▼] [📅 Data Range] | [🌐 Rede Social ▼] | [🔄 Sync] [📥 Export PDF]
```

#### 5.1 Substituir `Popover` por `Select` ou `DropdownMenu`
- Mudar de `Popover` com scroll para `DropdownMenuRadioGroup`, igual ao período
- Primeiro item: "Todas as Redes"
- Abaixo: lista de plataformas conectadas (com ícone + nome)
- Ao selecionar, o estado `platform` muda e todos os dados recarregam

#### 5.2 Indicador Visual
- Quando uma plataforma específica está selecionada, mostrar badge colorido ao lado do seletor
- Ex: `[🌐 Rede Social ▼ ● Facebook]`

---

## 6. Plano de Implementação (Ordem de Execução)

### Wave 1 — Correções Críticas (Console + Performance)
| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| 1 | Substituir `document.getElementById` por `useRef` nos scrolls | `AdvancedAnalytics.tsx` | Pequeno |
| 2 | Remover `requestAnimationFrame` do `scrollContainer` | `AdvancedAnalytics.tsx` | Pequeno |
| 3 | Mover `<style>` inline para CSS global | `AdvancedAnalytics.tsx` + `index.css` | Pequeno |
| 4 | Otimizar `setTimeout(500)` no Export PDF | `AdvancedAnalytics.tsx` | Pequeno |

### Wave 2 — Filtro por Rede Social
| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| 5 | Substituir `demographicData` hardcoded por dados de `stats` | `AdvancedAnalytics.tsx` | Médio |
| 6 | Substituir `Response Time` hardcoded por dados do hook | `AdvancedAnalytics.tsx` | Médio |
| 7 | Propagar `pieSelectedPlatform` para filtrar outras seções | `AdvancedAnalytics.tsx` | Pequeno |

### Wave 3 — Mesclagem Dashboard/API Feed
| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| 8 | Remover toggle "Dashboard"/"API Feed" da UI | `AdvancedAnalytics.tsx` | Pequeno |
| 9 | Atualizar Edge Function para `source: 'all'` | `get-analytics/index.ts` | Médio |
| 10 | Redeploy `get-analytics` | CLI | Pequeno |

### Wave 4 — Date Range Picker
| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| 11 | Criar componente `DateRangePicker.tsx` | Novo arquivo | Médio |
| 12 | Adicionar estado `dateRange` no hook `useAnalytics` | `useAnalytics.ts` | Pequeno |
| 13 | Adicionar suporte a `start_date`/`end_date` na Edge Function | `get-analytics/index.ts` | Médio |
| 14 | Integrar no header do AdvancedAnalytics | `AdvancedAnalytics.tsx` | Pequeno |

### Wave 5 — Seletor de Rede Social Aprimorado
| # | Tarefa | Arquivo | Esforço |
|---|--------|---------|---------|
| 15 | Substituir `Popover` por `DropdownMenuRadioGroup` | `AdvancedAnalytics.tsx` | Pequeno |
| 16 | Reposicionar ao lado do botão de período | `AdvancedAnalytics.tsx` | Pequeno |
| 17 | Adicionar badge indicador de plataforma ativa | `AdvancedAnalytics.tsx` | Pequeno |

---

## 7. Verificação

### Pré-requisitos
- `npm run build` sem erros
- `npm run dev` rodando

### Testes Manuais
1. Abrir console do navegador → verificar se violações de Forced Reflow reduziram >90%
2. Selecionar "Facebook" no seletor de redes → todas as caixas/cards/gráficos mostram dados do Facebook
3. Selecionar "Instagram" → tudo muda para Instagram
4. Clicar em fatia do gráfico de pizza → destaca visualmente sem resetar
5. Verificar que toggle "Dashboard"/"API Feed" não existe mais
6. Abrir Date Range Picker → selecionar data → gráficos atualizam
7. Alternar entre período predefinido e personalizado → dados consistentes

### UAT Esperado
- Zero violações de Forced Reflow >50ms
- Todas as métricas nos cards correspondem aos dados da rede selecionada
- Dados demográficos e de resposta não são mais hardcoded
- Transição suave entre seleções de rede/período
