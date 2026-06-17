# Plano de Auditoria Minuciosa — Social Canvas Hub

## Objetivo
Auditar TODO o sistema (src/, supabase/functions/, configs) para encontrar erros, bugs, falhas de segurança, dados de fallback/demo que precisam ser substituídos por dados reais, e código morto a ser removido.

---

## Fase 1: Erros e Bugs de Runtime

### 1.1 proxy-media 403 (WhatsApp CDN)
- **Arquivo**: `supabase/functions/proxy-media/index.ts`
- **Problema**: WhatsApp CDN (`pps.whatsapp.net`) rejeita requisições de proxy
- **Solução proposta**: Usar `SafeImage` com fallback para placeholder genérico + tentar `?format=webp` ou `&oe=` mais recente
- **Prioridade**: MÉDIA (cosmético, não quebra funcionalidade)

### 1.2 "Password field not in form" warning
- **Arquivo**: `src/components/dashboard/settings/APITab.tsx` (inputs de API key)
- **Problema**: Inputs password sem `<form>` — warning DOM não crítico mas indica falta de boas práticas
- **Solução proposta**: Envolver inputs em `<form>` ou adicionar `aria-label`
- **Prioridade**: BAIXA (cosmético)

### 1.3 Forced reflow violations
- **Arquivo**: Múltiplos (CronMonitorView, Dashboard, etc.)
- **Problema**: `useEffect` sem debounce causa reflow em cadeia (52ms+)
- **Solução proposta**: Substituir `useEffect` com `useLayoutEffect` onde necessário, adicionar `will-change: transform` em elementos animados, debounce handlers de resize/scroll
- **Prioridade**: MÉDIA (performance)

---

## Fase 2: Dados de Fallback/Demo

### 2.1 `useAnalytics.ts` — Seeded data quando Edge Function falha
- **Arquivo**: `src/hooks/useAnalytics.ts` (linhas 122-155)
- **Problema**: Quando `get-analytics` falha, retorna objetos com dados seeded (`dataSource: 'seeded'`). Isso mascara erros reais e mostra números falsos no dashboard.
- **Checklist de remoção**:
  - [ ] Remover objeto seeded nas linhas 138-154 (catch do fetchAnalyticsData)
  - [ ] Remover fallback "isEmpty" nas linhas 119-134 que injeta dados demo
  - [ ] Substituir por retorno de estrutura vazia: `{ overview: empty, engagement: empty, ... }`
  - [ ] Garantir que o frontend (DashboardHomeView, StatsCard) trate dados vazios graciosamente
- **Prioridade**: ALTA

### 2.2 `useSocialStats.ts` — Cache localStorage como initialData
- **Arquivo**: `src/hooks/useSocialStats.ts` (linhas 75-83, 402)
- **Problema**: `initialData: loadCache` carrega dados do localStorage que podem estar obsoletos. Útil como fallback mas pode mostrar dados antigos sem aviso.
- **Solução proposta**: Adicionar indicador visual de "dados offline" quando usando cached data
- **Prioridade**: MÉDIA

---

## Fase 3: Segurança

### 3.1 Hardcoded API keys / tokens
- **Arquivos**: `src/**/*.ts`, `supabase/functions/**/*.ts`
- **Problema**: Verificar se há API keys, tokens ou senhas hardcoded em arquivos de código
- **Checklist**:
  - [ ] Rodar `rg '(api[_-]?key|api[_-]?secret|token|password|secret)[\s]*[:=][\s]*["'"'"']'` em todo src/
  - [ ] Rodar `rg 'sk-[a-zA-Z0-9]{20,}'` (padrão OpenAI keys)
  - [ ] Rodar `rg 'ghp_[a-zA-Z0-9]{36}'` (padrão GitHub tokens)
- **Prioridade**: ALTA

### 3.2 Exposição de tokens no console
- **Problema**: Verificar se `console.log` ou `console.warn` expõem tokens/sessões
- **Arquivos suspeitos**: `useSocialConnections.ts`, `useApiCredentials.ts`
- **Solução**: Remover logs que expõem dados sensíveis
- **Prioridade**: ALTA

### 3.3 Row Level Security (RLS) no Supabase
- **Arquivo**: Configurações de banco
- **Problema**: Verificar se todas as migrations SQL têm políticas RLS ativas
- **Prioridade**: ALTA

### 3.4 CSP Headers
- **Arquivo**: `supabase/config.toml` ou vercel.json/netlify.toml
- **Problema**: Verificar se Content-Security-Policy está configurada
- **Prioridade**: MÉDIA

---

## Fase 4: Código Morto e Componentes Órfãos

### 4.1 Componentes não utilizados
- **Arquivos**:
  - `src/components/dashboard/settings/ConnectionCard.tsx` (314 linhas) — não importado por ninguém
  - `src/components/dashboard/settings/APIFields.tsx` (73 linhas) — não importado por ninguém
- **Checklist**:
  - [ ] Verificar se algum import dinâmico referência estes arquivos
  - [ ] Se não, mover para `_unused/`
- **Prioridade**: MÉDIA

### 4.2 Imports não utilizados
- **Checklist** (rodar `npx tsc --noEmit` já limpo, mas verificar lint):
  - [ ] Rodar `npx eslint src/` para detectar unused vars/imports
- **Prioridade**: BAIXA

### 4.3 Páginas órfãs
- **Arquivos**:
  - `src/pages/BrunoProfile1.tsx` — não referenciado em App.tsx
  - `src/pages/apresentation.jsx` — redundante vs BrunoProfile.tsx
- **Prioridade**: BAIXA

---

## Fase 5: Tratamento de Erros

### 5.1 Catch silenciosos
- **Problema**: Múltiplos `.catch(() => {})` e `.catch(e => console.warn(...))` sem tratamento adequado
- **Busca**: `rg '\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\)' --include '*.ts' --include '*.tsx'
- **Checklist**:
  - [ ] Substituir catches silenciosos por tratamento visível (toast ou indicador)
  - [ ] Adicionar fallback state no frontend para cada erro
- **Prioridade**: ALTA

### 5.2 Edge Functions sem error boundary
- **Problema**: `collect-social-analytics` retorna 546 HTTP — sistema precisa de error boundary no frontend
- **Solução**: Criar wrapper `safeInvoke` que trata erros de rede, 504, 546, etc.
- **Arquivo**: `src/utils/supabase-utils.ts` (já existe `safeInvoke` parcial)
- **Prioridade**: ALTA

---

## Fase 6: Type Safety

### 6.1 Casts `as any`
- **Problema**: Múltiplos `as any` em todo o código que eliminam type safety
- **Busca**: `rg 'as any' --include '*.ts' --include '*.tsx' src/ | wc -l`
- **Solução**: Substituir por tipos concretos ou `as const`
- **Prioridade**: BAIXA (longo prazo)

### 6.2 Tipos faltantes em props de componentes
- **Problema**: Muitas props são `any[]` ou `Record<string, any>`
- **Solução**: Definir interfaces para cada componente
- **Prioridade**: BAIXA

---

## Fase 7: Performance

### 7.1 Bundle size — imports pesados
- **Problema**: `lucide-react` importa muitos ícones em arquivos individuais
- **Solução**: Usar import seletivo: `import { Eye, Heart } from "lucide-react"` (já feito em DashboardHomeView)
- **Prioridade**: BAIXA

### 7.2 Lazy loading faltante
- **Problema**: Alguns componentes pesados não estão em lazy loading
- **Busca**: Verificar `Suspense` coverage em todas as rotas
- **Prioridade**: MÉDIA

---

## Resumo de Prioridades

| Prioridade | Itens |
|------------|-------|
| 🔴 ALTA | 2.1 (fallback seeded), 3.1 (security), 3.2 (token leak), 3.3 (RLS), 5.1 (catch silenciosos), 5.2 (error boundary) |
| 🟡 MÉDIA | 1.1 (proxy-media), 1.3 (reflow), 2.2 (cache obsol.), 3.4 (CSP), 4.1 (dead code), 7.2 (lazy loading) |
| 🟢 BAIXA | 1.2 (password form), 4.2 (unused imports), 4.3 (orphan pages), 6.1 (as any), 6.2 (types), 7.1 (bundle) |
