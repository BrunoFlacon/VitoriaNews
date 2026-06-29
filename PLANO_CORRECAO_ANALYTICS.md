# Plano de Correção — Painel Analytics

> Auditoria completa realizada em 29/06/2026. ~30 arquivos auditados entre frontend React, edge functions Deno, hooks e configuração.

---

## Fase 1 — 🔴 Críticos (bugs que causam crash, dado incorreto ou falha silenciosa)

### 1. TrendsView crash ao acessar `platformMeta.icon` em undefined
- **Arquivo:** `src/components/dashboard/TrendsView.tsx`
- **Linha:** ~210
- **Problema:** `socialPlatforms.find()` retorna `undefined` quando o ID da plataforma não está cadastrado, e o código acessa `.icon` diretamente.
- **Correção:** Adicionar guard antes de renderizar:
  ```ts
  if (!platformMeta) return null;
  ```

### 2. StatsGrid — 4 sparkFields exibindo o mesmo growth
- **Arquivo:** `src/components/dashboard/analytics/StatsGrid.tsx`
- **Linhas:** 78–82
- **Problema:** Todos os campos (views, engagement, reach, shares) usam `engagement.growth` como trend value. Cada um deveria ter sua própria métrica de crescimento.
- **Correção:** Extrair growth individual para cada métrica (ex: `viewsGrowth`, `engagementGrowth`, `reachGrowth`, `sharesGrowth`) a partir dos dados históricos disponíveis.

### 3. APITab — form submit quebrado
- **Arquivo:** `src/components/dashboard/settings/APITab.tsx`
- **Linhas:** 786, 976
- **Problema:** O `<form>` fecha na linha 822, mas o botão "Salvar" está fora dele (linha 976). Pressionar Enter em qualquer input não dispara o submit.
- **Correção:** Mover o botão "Salvar" para dentro do `<form>`, ou substituir `<form>` por `<div>` e conectar o botão via `onClick`.

### 4. APITab — dados falsos gerados em todo render
- **Arquivo:** `src/components/dashboard/settings/APITab.tsx`
- **Linha:** ~916
- **Problema:** `Math.floor(Math.random() * 5000 + 1200)` gera números aleatórios de hit count para pixels Meta a cada render, enganando o usuário.
- **Correção:** Remover a geração aleatória e mostrar estado real da API ou placeholder "Aguardando dados".

### 5. FollowersGrowth — key={pIdx} quebra reconciliação
- **Arquivo:** `src/components/dashboard/analytics/FollowersGrowth.tsx`
- **Linha:** ~168
- **Problema:** `key={pIdx}` (array index) em lista que pode ser reordenada por filtros.
- **Correção:** Usar `prof.platform + '-' + (prof.username || prof.platform_user_id)` como key.

### 6. AudienceTracking — key={idx} quebra reconciliação
- **Arquivo:** `src/components/dashboard/analytics/AudienceTracking.tsx`
- **Linha:** ~149
- **Problema:** Mesmo problema de array index em lista filtrada.
- **Correção:** Usar `ch.id || idx` como key.

### 7. AnalyticsDetailedReports — key={i} quebra reconciliação
- **Arquivo:** `src/components/dashboard/analytics/AnalyticsDetailedReports.tsx`
- **Linha:** ~88
- **Problema:** Array index em lista ordenada.
- **Correção:** Usar `bt.day + bt.time` como key.

---

## Fase 2 — 🟠 Altos (dados incorretos, UX degradada, segurança)

### 8. Dashboard principal sem skeleton de carregamento
- **Arquivo:** `src/components/dashboard/Dashboard.tsx`
- **Linhas:** ~388–416
- **Problema:** `DashboardSkeleton.tsx` existe mas nunca é usado. O dashboard renderiza layout completo com zeros em vez de mostrar um skeleton durante o loading.
- **Correção:** Envolver o conteúdo do dashboard em conditional: se `loading`, renderizar `<AnalyticsSkeleton />`.

### 9. AudienceMetricsPanel — badge exibe "NaN%"
- **Arquivo:** `src/components/dashboard/analytics/AudienceMetricsPanel.tsx`
- **Linhas:** ~122–128
- **Problema:** `messageSuccessRate.toFixed(1)` sem guard `isNaN`. Quando 0 mensagens, `0/0` = NaN, exibindo "NaN%" na badge.
- **Correção:**
  ```ts
  const displayRate = isNaN(messageSuccessRate) ? 0 : messageSuccessRate;
  {displayRate.toFixed(1)}%
  ```

### 10. TrendsView — `||` em vez de `??` substitui score 0 por 50
- **Arquivo:** `src/components/dashboard/TrendsView.tsx`
- **Linha:** ~86
- **Problema:** `t.score || 50` trata score = 0 como falsy e substitui por 50.
- **Correção:** `t.score ?? 50`

### 11. TrendsView — missing dependency no useEffect
- **Arquivo:** `src/components/dashboard/TrendsView.tsx`
- **Linhas:** ~44–51
- **Problema:** `activePlatform` usado dentro do effect mas não no array de dependências.
- **Correção:** Adicionar `activePlatform` ao array de dependências do useEffect.

### 12. SettingsView — memo cascade quebrado
- **Arquivo:** `src/components/dashboard/SettingsView.tsx`
- **Linhas:** 244, 277, 310, 717, 724
- **Problema:** `UNIQUE_PLATFORM_CONFIGS` é recriado em todo render (sem `useMemo`), e todos os handlers são funções inline. Isso quebra `React.memo(APITab)`.
- **Correção:**
  - Envolver `UNIQUE_PLATFORM_CONFIGS` em `useMemo`
  - Envolver handlers (`syncSocialStats`, `getBrandLogo`, `updateFormField`, `handleSaveCreds`, etc.) em `useCallback`

### 13. AudienceTracking — null return esconde UI de filtros
- **Arquivo:** `src/components/dashboard/analytics/AudienceTracking.tsx`
- **Linha:** ~53
- **Problema:** Se `audienceBreakdown` é vazio/null, retorna `null` e todos os filtros/buscas somem.
- **Correção:** Renderizar filtros e buscar input mesmo sem dados, mostrar "Nenhum resultado" em vez de null.

### 14. platform-metadata — CSS class inválida para meta_ads
- **Arquivo:** `src/components/icons/platform-metadata.ts`
- **Linha:** 203
- **Problema:** `textColor: "#0081FB"` sem prefixo `text-`. Todas as outras entry usam `"text-[#0081FB]"`.
- **Correção:**
  ```ts
  textColor: "text-[#0081FB]",
  ```

### 15. APITab — Tailwind class inválida `ring-500`
- **Arquivo:** `src/components/dashboard/settings/APITab.tsx`
- **Linhas:** ~806–807
- **Problema:** `ring-2 ring-500` não existe no Tailwind (precisa de cor específica como `ring-red-500`).
- **Correção:**
  ```tsx
  ring-2 ring-red-500
  ```

### 16. collect-google-analytics — GA4 property ID não validado
- **Arquivo:** `supabase/functions/collect-google-analytics/index.ts`
- **Linhas:** ~60–65
- **Problema:** Aceita formato G-XXXX mas GA4 Realtime API rejeita. Só aceita property ID numérico.
- **Correção:** Validar que o ID é numérico ou rejeitar com mensagem clara.

### 17. refresh-social-token — platform sem validação
- **Arquivo:** `supabase/functions/refresh-social-token/index.ts`
- **Linha:** ~36
- **Problema:** `const { platform } = await req.json()` sem validar tipo.
- **Correção:** Validar que `platform` é string não-vazia e suportada antes de usar.

### 18. Edge functions — erros fatais retornando HTTP 200
- **Arquivos:** `collect-google-analytics/index.ts`, `collect-google-ads/index.ts`
- **Problema:** Erros de API, auth, timeout estão retornando 200 com `status: "skipped"` ou `status: "error"` no body. Cliente não consegue distinguir "sem dados" de "explodiu".
- **Correção:** Retornar HTTP 400/401/500 conforme o tipo de erro. Só retornar 200 em caso de sucesso real.

### 19. sync-google-contacts — sem rate-limit
- **Arquivo:** `supabase/functions/sync-google-contacts/index.ts`
- **Linha:** ~87
- **Problema:** Loop sequencial de até 10k chamadas à People API.
- **Correção:** Adicionar batching (max 100 por lote) + AbortController + timeout.

### 20. Social connections form submit sem feedback
- **Arquivo:** `src/components/dashboard/SettingsView.tsx`
- **Linha:** ~773
- **Problema:** `wa_bot_active` armazenado como string `'true'`/`'false'` em vez de boolean.
- **Correção:** Usar boolean no upsert.

---

## Fase 3 — 🟡 Médios (performance, type safety, manutenibilidade)

### 21. Adicionar AbortController em todos os fetch() de edge functions
- **Arquivos:** `collect-google-analytics`, `collect-search-console-data`, `collect-google-ads`, `sync-google-contacts`, `refresh-social-token`
- **Problema:** Nenhuma função tem timeout configurável. Uma API externa lenta segura a execução até o timeout do Edge Function (60s).
- **Correção:** Envolver todo `fetch()` com `AbortSignal.timeout(15000)`.

### 22. Adicionar Access-Control-Max-Age
- **Arquivos:** Todas as edge functions
- **Problema:** Sem cache de preflight OPTIONS, gerando requisições extras.
- **Correção:** Adicionar `"Access-Control-Max-Age": "86400"` nos headers CORS.

### 23. Tipar EngagementChart chartData
- **Arquivo:** `src/components/dashboard/analytics/EngagementChart.tsx`
- **Linha:** ~24
- **Problema:** `chartData: any[]` — sem type safety.
- **Correção:** Importar e usar `ChartDataPoint` de `useAnalytics.ts`.

### 24. FormatRecommendations — dados reais ou remover prop
- **Arquivo:** `src/components/dashboard/analytics/FormatRecommendations.tsx`
- **Problema:** Todas as 12 recomendações são hardcoded. A prop `data` só muda o subtitle.
- **Correção:** Usar dados reais para gerar recomendações ou remover a prop e deixar o componente puramente estático.

### 25. Adicionar aria-labels nos gráficos
- **Arquivos:** `EngagementChart.tsx`, `PlatformDistribution.tsx`
- **Problema:** Gráficos invisíveis para leitores de tela.
- **Correção:** Adicionar `role="img"` e `aria-label` nos containers dos gráficos recharts.

### 26. Substituir `(supabase as any)`
- **Arquivo:** `src/hooks/useApiCredentials.ts`
- **Linha:** ~282
- **Problema:** Acessa `(supabase as any).supabaseKey` — propriedade interna não documentada que quebra em upgrades.
- **Correção:** Usar `Deno.env.get("SUPABASE_ANON_KEY")` na edge function, ou adicionar os tipos gerados do Supabase.

### 27. useSocialStats — messageStats dedup
- **Arquivo:** `src/hooks/useSocialStats.ts`
- **Linhas:** ~391–424
- **Problema:** `messageStats` e `messageDeliveryStats` contêm dados quase idênticos. Qualquer novo campo precisa ser adicionado em ambos.
- **Correção:** Extrair lógica compartilhada em função auxiliar, reduzir duplicação.

### 28. PlatformDistribution — COLORS empty crash
- **Arquivo:** `src/components/dashboard/analytics/PlatformDistribution.tsx`
- **Linha:** ~71
- **Problema:** `COLORS[entryIndex % COLORS.length]` crasha se COLORS for array vazio.
- **Correção:**
  ```ts
  const safeColors = COLORS.length > 0 ? COLORS : ['#3b82f6'];
  ```

### 29. AudienceDemographics — icon: any
- **Arquivo:** `src/components/dashboard/analytics/AudienceDemographics.tsx`
- **Linhas:** ~12, 21
- **Problema:** `icon: any` em vez de `React.ComponentType<{ className?: string }>`.
- **Correção:** Tipar corretamente as props.

### 30. extractSparkData performance
- **Arquivo:** `src/components/dashboard/analytics/StatsGrid.tsx`
- **Linha:** ~97
- **Problema:** `extractSparkData()` é chamado 4x por render dentro de `.map()`, sem memoização.
- **Correção:** Envolver em `useMemo`.

### 31. useSocialStats — module-level Map persiste HMR
- **Arquivo:** `src/hooks/useSocialStats.ts`
- **Linhas:** ~7–11
- **Problema:** `sharedChannels` Map mantém referências stale entre hot reloads.
- **Correção:** Mover para dentro do hook ou limpar no cleanup.

### 32. get-analytics — BigInt não serializável
- **Arquivo:** `supabase/functions/get-analytics/index.ts`
- **Problema:** (Já corrigido) — verificar se há outros `BigInt` ou `Number()` sem guard que possam produzir NaN.

---

## Fase 4 — 🟢 Baixos (cosméticos, informativos, boas práticas)

### 33. pt-BR hardcoded
- **Impacto:** Sem suporte a i18n.
- **Solução:** Extrair strings para constantes/dicionário.

### 34. Skeleton cards sem h- fixo
- **Arquivo:** `src/components/dashboard/analytics/AnalyticsSkeleton.tsx`
- **Linhas:** 3–17
- **Solução:** Adicionar `h-*` classes que correspondam à altura real dos cards.

### 35. Loading states faltando
- **Componentes:** `AudienceTracking`, `AudienceDemographics`, `AudienceMetricsPanel`, `FormatRecommendations`
- **Solução:** Adicionar variante shimmer/skeleton durante carregamento.

### 36. `display: contents` no Dashboard
- **Arquivo:** `src/components/dashboard/Dashboard.tsx`
- **Linha:** ~389
- **Solução:** Substituir por `flex flex-1` para evitar hydration mismatch em SSR.

---

## Resumo de Esforço

| Fase | Itens | Tipo | Esforço Estimado |
|------|-------|------|------------------|
| 1 | 7 | 🔴 Críticos | 2–3 horas |
| 2 | 13 | 🟠 Altos | 4–6 horas |
| 3 | 12 | 🟡 Médios | 6–8 horas |
| 4 | 4 | 🟢 Baixos | 2–3 horas |
| **Total** | **36** | | **14–20 horas** |

> **Ordem sugerida:** Executar Fase 1 e Fase 2 antes de qualquer novo feature. Fase 3 pode ser feita em paralelo com desenvolvimento novo. Fase 4 é melhoria contínua.
