# Plano de Auditoria — Sincronização GitHub → Desktop

## Visão Geral
Comparar o estado atual do repositório local com o branch `origin/main` (GitHub) para identificar recursos perdidos ou quebrados durante modificações recentes, e restaurar/copiar o que estiver faltando.

---

## Fase 1 — Diagnóstico de Divergências

### 1.1 Arquivos com diferenças críticas (por feature)

| Feature | Arquivo | Status | Ação |
|---------|---------|--------|------|
| Seletor de datas no gráfico | `AnalyticsChart.tsx` | ❌ Perdido | Substituir pelo original do GitHub |
| Calendário (exibição de datas) | `CalendarView.tsx` | ❌ Perdido | Substituir pelo original do GitHub |
| Analytics (métricas/boxes) | `AdvancedAnalytics.tsx` | ⚠️ Modificado | Mesclar recursos originais |
| Redes Sociais | `SocialNetworkCard.tsx` | ⚠️ Modificado | Mesclar recursos originais |
| Barra de Pesquisa | `Header.tsx` | ⚠️ Modificado | Verificar funcionalidade |
| Abas Config (Notificações, APIs, Dev, Segurança) | `SettingsView.tsx` + `settings/*.tsx` | ⚠️ Modificado | Comparar abas e recursos |

### 1.2 Checklist de Verificação

- [ ] `AnalyticsChart.tsx` — tem seletor 7/15/30/45/60/90 dias?
- [ ] `CalendarView.tsx` — datas corretas? Feriados? Posts agendados?
- [ ] `AdvancedAnalytics.tsx` — todas as métricas do GitHub presentes?
- [ ] `Header.tsx` — search bar funciona?
- [ ] `SettingsView.tsx` — abas: Profile, Notifications, APIs, Security, Dev, Brands, SEO, Portal?
- [ ] Pastas `settings/*` — todos os componentes existem? (NotificationsTab, DevTab, etc.)

---

## Fase 2 — Correções por Feature

### 2.1 Gráfico — Seletor de Datas
**Arquivo:** `src/components/dashboard/AnalyticsChart.tsx`
- [ ] Restaurar `<select>` com opções 7d, 15d, 30d, 45d, 60d, 90d
- [ ] Prop `onPeriodChange` para notificar pai sobre mudança
- [ ] Prop `periodDays` para controle externo

### 2.2 Calendário — Exibição de Datas
**Arquivo:** `src/components/dashboard/CalendarView.tsx`
- [ ] Restaurar lógica de geração de dias do mês (primeiro dia, último dia, dias do mês anterior/próximo)
- [ ] Indicadores visuais de posts agendados/publicados por dia
- [ ] Diálogo de detalhes ao clicar em data

### 2.3 Analytics — Métricas e Boxes
**Arquivo:** `src/components/dashboard/AdvancedAnalytics.tsx`
- [ ] Comparar boxes de métricas entre GitHub e local
- [ ] Adicionar métricas faltantes (engagement rate, reach, etc.)

### 2.4 Redes Sociais — Cards e Recursos
**Arquivo:** `src/components/dashboard/SocialNetworkCard.tsx`
- [ ] Comparar layout e ações disponíveis entre GitHub e local
- [ ] Adicionar recursos faltantes (conexão OAuth, métricas, etc.)

### 2.5 Barra de Pesquisa
**Arquivo:** `src/components/dashboard/Header.tsx`
- [ ] Verificar implementação do search (dropdown, filtro, API)
- [ ] Garantir que `Search` ícone + input funcionam

### 2.6 Configurações — Abas e Recursos
**Arquivo:** `src/components/dashboard/SettingsView.tsx`
- [ ] Comparar abas: GitHub vs local
- [ ] Adicionar abas faltantes (NotificationsTab, BrandsTab expandido, etc.)
- [ ] Verificar conteúdo de cada aba (API credentials, webhooks, segurança)

---

## Fase 3 — Estratégia de Merge

Para cada arquivo, decidir:
1. **Substituição total** (`git checkout origin/main -- <file>`) — quando as alterações locais são pequenas ou não-críticas
2. **Merge manual** — quando as alterações locais são significativas e precisam ser preservadas

### Arquivos candidatos a substituição total:
- `AnalyticsChart.tsx` (local tem 206 linhas diferentes, mas a feature principal está no GitHub)
- `CalendarView.tsx` (local tem 333 linhas diferentes)

### Arquivos para merge manual:
- `AdvancedAnalytics.tsx` (3145 linhas de diferença, muitas mudanças locais)
- `SettingsView.tsx` (1654 linhas de diferença)
- `SocialNetworkCard.tsx` (149 linhas de diferença)

---

## Fase 4 — Riscos

1. **Perda de correções recentes** (Vite 8, Weather, CSP) ao substituir arquivos
2. **Dependências quebradas** se componentes do GitHub importam hooks/contextos que não existem mais
3. **Regressão de performance** se o código do GitHub não tiver as melhorias de CLS/LCP
