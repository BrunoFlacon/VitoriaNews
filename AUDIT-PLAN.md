
# Plano de Auditoria — Correção de Erros

## 🔴 Crítico (bloqueante)

### 1. 400 Bad Request em `account_metrics`
**Sintoma:** `GET ... account_metrics?select=... 400 (Bad Request)` no console.
**Causa:** A query usa `select('collected_at, platform, followers, views, likes, comments, shares, posts_count')` mas o banco de dados remoto pode não ter todas essas colunas, ou o RLS está rejeitando.
**Correção aplicada:**
- `AdvancedAnalytics.tsx:328` — `select('*')` + `.eq('user_id', userId)`
- `AdvancedAnalytics.tsx:323` — queryKey alterado para `['account_metrics', userId, 'v3']` para forçar novo observer
- `useAnalytics.ts:246` — invalidação atualizada para `['account_metrics', user?.id, 'v3']`
**Ação necessária:** O usuário precisa dar **Ctrl+F5** (hard refresh). O HMR do Vite não atualiza corretamente closures do React Query.

---

## 🟠 Alta Prioridade

### 2. Popover "Todas as Redes" abre/fecha rapidamente
**Sintoma:** Ao passar o mouse ou clicar, o menu abre e fecha sozinho, às vezes abaixo da logo.
**Causa:** `onMouseEnter` + `onMouseLeave` conflitando com o `onOpenChange` do Popover.
**Correção aplicada:**
- `AdvancedAnalytics.tsx:784` — removido `onMouseEnter`
- `AdvancedAnalytics.tsx:793` — removido `onMouseLeave`
- `Dashboard.tsx:453` — removido `onMouseEnter`
- `Dashboard.tsx:462` — removido `onMouseLeave`
- Adicionado `sideOffset={4}` para posicionamento correto

### 3. Dashboard — gráfico zerado
**Sintoma:** Gráfico "Performance dos últimos 7 dias" mostra 0 em todas as métricas.
**Causa:** `analyticsData?.chartData` está vazio porque a Edge Function não retorna dados (fallback vazio).
**Correção aplicada:**
- `Dashboard.tsx:149-170` — novo `useMemo` `dashboardChartData` que computa dados dos `localStats` quando `analyticsData?.chartData` está vazio
- Quando `platform !== 'all'`, filtra `localStats` pela plataforma selecionada
- Distribui o total pelos 7 dias da semana

### 4. Dashboard — stats cards ignoram filtro de plataforma
**Sintoma:** Cards de Total Posts, Visualizações, Engajamento mostram sempre o total global mesmo com plataforma selecionada.
**Causa:** Valores de fallback usavam `localTotalPosts` e `localStats` sem filtro.
**Correção aplicada:**
- `Dashboard.tsx:498-544` — todos os 4 StatsCards agora filtram `localStats` por `platform` quando `analyticsData` não está disponível

---

## 🟡 Média Prioridade

### 5. Intelligence Hub mostra 0 em todos os campos
**Sintoma:**
- Performance Ads & Web: R$ 0, 0 impressões, 0 cliques, 0 sessões
- Crescimento YouTube: 0 visualizações, 0 engajamento, 0 inscritos
- Tempo de Resposta: mostra "1.2m" (hardcoded)

**Causa raiz:** No modo fallback (`shouldUseLocalFallback = true`):
- `adsStats` = `{ impressions: 0, reach: 0, clicks: 0, spend: 0 }`
- `gaStats` = `{ views: 0 }`
- `youtubeStats` = apenas contagem de stats com platform='youtube' (pode ser 0)
- Tempo de Resposta é mock estático

**Possíveis correções:**
| Item | Dados disponíveis | Ação |
|---|---|---|
| AdsStats | Nenhum no banco local | Manter 0 até Edge Function rodar |
| GA Stats | Nenhum no banco local | Manter 0 até Edge Function rodar |
| YouTube Views | `stats.filter(platform='youtube').views_count` | ✅ Já computado |
| YouTube Inscritos | `followerData.filter(platform='youtube').growth` | ✅ Já foi corrigido |
| Tempo Resposta | Nenhum | Substituir mock por "N/D" ou remover card |

### 6. Melhores Horários não aparecem
**Sintoma:** Seção "Melhores Horários" mostra "Sem métricas de horários capturadas".
**Causa:** `bestTimes` = `[]` no fallback. Edge Function calcula isso, mas fallback não tem dados de horário.
**Correção necessária:** Depende de deploy da Edge Function `get-analytics`.

### 7. Melhores Publicações não aparecem
**Sintoma:** Seção "Melhores Publicações" mostra "Nenhuma publicação encontrada".
**Causa:** `topContent` = `[]` no fallback.
**Correção necessária:** Depende de deploy da Edge Function.

---

## 🔵 Prioridade Regular

### 8. Mensageria — Entrega por Plataforma incorreta
**Sintoma:**
- WhatsApp: 0% (deveria mostrar dados reais)
- Telegram: 100% (deveria ser ~91%)
- Mensagens individuais: sem dados reais de timestamp/status

**Causa:** `platformStats` é populado com `members_count` dos `messagingChannels`, mas:
- Se WhatsApp não tem channels em `messagingChannels`, mostra 0%
- A conta de "entregues" usa `members_count` que não reflete entrega real
- Mensagens individuais usam `created_at: new Date().toISOString()` (sempre "agora")

**Correção aplicada:**
- `AdvancedAnalytics.tsx:437-444` — `platformStats` agora populado dos `messagingChannels`
- `AdvancedAnalytics.tsx:442` — `status: 'sent'` (era 'active')

**Correção necessária adicional:**
- Criar tabela `message_delivery_logs` no banco para armazenar métricas reais de entrega
- Ou buscar dados de entrega da Edge Function

### 9. Account_metrics query — erro não tratado graciosamente
**Sintoma:** Query falha mas o warning só aparece no console.
**Correção aplicada:**
- `AdvancedAnalytics.tsx:331-333` — `console.warn` com o objeto de erro completo

### 10. AdvancedAnalytics — chart não varia por plataforma sem account_metrics
**Sintoma:** Quando account_metrics falha (400), o gráfico mostra os MESMOS valores para todas as plataformas.
**Causa:** O código anterior usava `existing?.views || (i === 0 ? totalViews : 0)` que só preenchia o último dia com o total AGREGADO de todas as plataformas — não havia variação por plataforma.
**Correção aplicada:**
- `AdvancedAnalytics.tsx:394-403` — computa `pfViews`, `pfLikes`, `pfComments` etc. filtrando `stats` por `platform`
- `AdvancedAnalytics.tsx:426-427` — detecta se `dateMap` tem dados (account_metrics funcionou)
- `AdvancedAnalytics.tsx:435-456` — se tem time-series → usa dados reais; senão → distribui `pfViews/daysCount` por dia
- Agora o gráfico varia por plataforma MESMO com account_metrics falhando

---

## ✅ Já Corrigido

| Item | Arquivo | Status |
|---|---|---|
| TDZ `shouldUseLocalFallback` | AdvancedAnalytics.tsx:308 | ✅ |
| TDZ `accountMetrics` | AdvancedAnalytics.tsx:322 | ✅ |
| Filtro gráfico por plataforma | AdvancedAnalytics.tsx:387-390 | ✅ |
| "Todas as Métricas" dropdown | AdvancedAnalytics.tsx:194-201 | ✅ |
| Message status 'active'→'sent' | AdvancedAnalytics.tsx:442 | ✅ |
| platformStats populado | AdvancedAnalytics.tsx:437-444 | ✅ |
| `data?.messageStats` → `messageStats` | AdvancedAnalytics.tsx:1637-1724 | ✅ |
| `data?.followerData` → `followerData` | AdvancedAnalytics.tsx:1082 | ✅ |
| Dashboard chart fallback | Dashboard.tsx:149-170 | ✅ |
| Dashboard stats por plataforma | Dashboard.tsx:498-544 | ✅ |
| Popover hover removido | Ambos | ✅ |
| queryKey 'v3' para forçar observer | AdvancedAnalytics.tsx:323 | ✅ |

---

### 11. Sync não refresca social_stats_all
**Sintoma:** Após clicar em "Sincronizar", os gráficos não atualizam.
**Causa:** `syncMutation.onSuccess` invalidava vários queryKeys mas NÃO invalidava `['social_stats_all', user?.id]` (usado por `useSocialStats`).
**Correção aplicada:**
- `useAnalytics.ts:247` — adicionado `queryClient.invalidateQueries({ queryKey: ['social_stats_all', user?.id] })`
- Agora o sync refresca: analytics, social_connections, social_accounts, account_metrics, messaging_channels E social_stats_all

### 12. Popover mobile não fecha
**Sintoma:** No Dashboard, o popover de seleção de plataforma (mobile) abre mas nunca fecha.
**Causa:** `onClick={() => setIsPlatformMenuOpen(true)}` no trigger SEMPRE seta para `true`, sobrescrevendo o toggle do Popover.
**Correção aplicada:**
- `Dashboard.tsx:412` — removido `onClick` do trigger mobile
- Agora o Popover funciona como toggle (clica abre, clica de novo fecha)

---

## 👣 Próximos Passos

1. **Ctrl+F5** no navegador — sem isso, as correções não têm efeito
2. Verificar console — o 400 deve sumir e o warning customizado deve aparecer
3. Clicar em "Sincronizar" — deve carregar dados das plataformas E atualizar todos os gráficos
4. Testar popover mobile — deve abrir/fechar corretamente no clique
5. Testar seleção de plataforma no gráfico — deve mostrar dados por plataforma
6. Testar dropdown "Todas as Métricas" — deve mostrar todas as linhas
7. Verificar Dashboard — gráfico e cards devem refletir plataforma selecionada
8. Verificar mensageria — mensagens devem mostrar "Entregue" e plataformas com dados reais
9. Se 400 persistir: rodar `SELECT column_name FROM information_schema.columns WHERE table_name = 'account_metrics'` no SQL Editor do Supabase
