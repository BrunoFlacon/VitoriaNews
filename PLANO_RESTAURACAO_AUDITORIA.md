# Plano de Restauração e Auditoria

## 1. Situação Atual

### Backups Disponíveis
| Backup | Data/Hora | Conteúdo |
|--------|-----------|----------|
| `_conflict_backup/` | 09/06 21:20 | 50 arquivos flat (src + supabase functions) |
| `_restore_backup/` | 09/06 21:37 | Estrutura completa (src/, supabase/, configs) |
| `_system_backup_20260610_033738/` | 10/06 03:37 | Estado atual pós-correções (src/ + supabase/) |

### Último Commit no Git
- `4c814e6` — 08/06 23:33 ("fix: cloudinary-upload...")
- Nenhum commit no dia 09/06 — todas as alterações foram não-commitadas

## 2. Correções Aplicadas (Sessão Atual)

### Frontend (src/)
| Arquivo | Correção |
|---------|----------|
| `SettingsView.tsx` | Substituiu `fetchSocialStats()` → `refreshStats()` (função inexistente) |

### Supabase Edge Functions (supabase/functions/)
| Função | Merge Artifacts Removidos |
|--------|--------------------------|
| `collect-social-analytics/index.ts` | 2x `=======` (corsHeaders duplicado + implementação órfã de 300+ linhas) |
| `collect-google-analytics/index.ts` | 5x `=======` |
| `collect-meta-ads-analytics/index.ts` | 4x `=======` |
| `collect-youtube-analytics/index.ts` | 1x `=======` |
| `get-analytics/index.ts` | 3x `=======` |
| `sync-telegram-chats/index.ts` | 2x `=======` |
| `telegram-webhook/index.ts` | 1x `=======` |
| `social-oauth-callback/index.ts` | 2x `=======` |
| `radar-api/index.ts` | 2x `=======` |
| `_shared/media.ts` | 1x `=======` |

## 3. Comparação: Backup (09/06 21:20) vs Atual (10/06 03:37)

### Tamanhos de Arquivo
| Arquivo | Backup (09/06) | Atual | Diferença |
|---------|---------------|-------|-----------|
| `SettingsView.tsx` | 87.150 | 53.493 | -33.657 (-38,6%) |
| `APITab.tsx` | 83.391 | 70.147 | -13.244 (-15,9%) |
| `MessagingView.tsx` | 111.946 | 95.969 | -15.977 (-14,3%) |
| `CreatePostPanel.tsx` | 92.788 | 91.159 | -1.629 (-1,8%) |
| `StoriesLivesView.tsx` | 67.676 | 66.219 | -1.457 (-2,2%) |
| `ProfileTab.tsx` | 19.853 | 18.251 | -1.602 (-8,1%) |
| `Dashboard.tsx` | 36.201 | 23.655 | -12.546 (-34,7%) |
| `SubscribersView.tsx` | 14.788 | 11.173 | -3.615 (-24,4%) |

**Nota:** Reduções grandes (SettingsView -38%, Dashboard -35%, SubscribersView -24%) indicam que a versão atual perdeu funcionalidades completas devido à remoção de código duplicado durante a correção de merge artifacts. É necessário auditar se a funcionalidade foi preservada ou se seções legítimas foram removidas junto com os artifacts.

## 4. Erros no Console (Diagnóstico)

| Erro | Tipo | Causa | Status |
|------|------|-------|--------|
| `fetchSocialStats is not defined` | Runtime crash | Merge artifact | ✅ CORRIGIDO |
| `collect-social-analytics POST 546` | Backend crash | `=======` no código Deno | ✅ CORRIGIDO |
| `proxy-media 403 (Forbidden)` | CDN blocker | WhatsApp CDN rejeita proxy | ⚠️ EXTERNO |
| `Password field not in form` | DOM warning | Inputs password sem `<form>` | ⚠️ COSMÉTICO |
| `Forced reflow violations` | Performance | Layout shifts | ⚠️ BAIXA PRIORIDADE |

## 5. Plano de Restauração e Auditoria

### Fase 1: Auditoria de Funcionalidade (Prioridade: ALTA)
Comparar backup vs atual para cada arquivo alterado, restaurando seções que foram removidas incorretamente:

1. **Dashboard.tsx** (perdeu 35%)
   - Comparar `_conflict_backup/src_pages_Dashboard.tsx` vs `src/pages/Dashboard.tsx`
   - Verificar se `useSocialStats`, `useAnalytics`, listeners de realtime foram preservados
   - Restaurar blocos de analíticos removidos acidentalmente

2. **SettingsView.tsx** (perdeu 39%)
   - Comparar backup vs atual seção por seção
   - Verificar profile/sync/seo/system_portal tabs preservados
   - Verificar `handleDisconnectCustom`, `handleToggleBot`, `localBotActive`

3. **SubscribersView.tsx** (perdeu 24%)
   - Comparar e restaurar lógica de filtro/search/pagination removida

4. **APITab.tsx** (perdeu 16%)
   - Verificar se todos os 33 props ainda são passados corretamente de SettingsView

### Fase 2: Correção de Erros Remanescentes (Prioridade: MÉDIA)

1. **proxy-media 403**
   - Opção A: Adicionar `?format=webp` ou `&oe=` mais recente no proxy
   - Opção B: Usar `SafeImage` com fallback para placeholder
   - Opção C: Servir imagens WA via signed URL do Supabase Storage

2. **Password fields sem form**
   - Envolver inputs de API key em `<form>` tags no APITab.tsx
   - Ou adicionar `aria-label` para suprimir warning

3. **Forced reflow / performance**
   - Adicionar `will-change: transform` em elementos animados
   - Substituir `useEffect` com `useLayoutEffect` onde apropriado
   - Debounce handlers de resize/scroll

### Fase 3: Backup e Snapshot (Prioridade: BAIXA)

1. Backup atual já criado em `_system_backup_20260610_033738/`
2. Fazer um segundo backup após restauração confirmada
3. Atualizar `_restore_backup/` com o snapshot final

### Fase 4: Testes e Verificação (Prioridade: MÉDIA)

1. `npx tsc --noEmit` — zero erros
2. `npm run build` — sucesso
3. Navegar em todas as abas: Dashboard, Criar Post, Stories/Lives, Configurações
4. Verificar sincronização de stats manual
5. Verificar carregamento de imagens de perfil

## 6. Ferramentas e Comandos

```bash
# Comparar arquivo específico (backup vs atual)
code --diff _conflict_backup/src_components_dashboard_SettingsView.tsx src/components/dashboard/SettingsView.tsx

# Verificar merge artifacts no codigo atual
Select-String -Path "supabase\functions\*\*.ts" -Pattern "^=======$" -SimpleMatch

# Verificar erros de TypeScript
npx tsc --noEmit

# Build completo
npm run build
```

## 7. Decisões Tomadas

- Onde backup e atual divergiam com `=======`, manteve-se a versão mais nova (direita) que usava `queryClient`, `ChatWindow`, `ProfileTab`, `APITab`
- Para APITab, manteve-se o card rendering sobre `ConnectionCard`+`APIFields`
- Para SubscribersView, manteve-se `useMemo` filter e `SubscriberAvatar`
- Funções Edge foram limpas mantendo a implementação mais completa (função `corsHeaders` vs objeto literal)

## 8. Arquivos para Auditoria Detalhada (Diff Backup vs Atual)

| Prioridade | Arquivo | Backup Path |
|-----------|---------|-------------|
| 🔴 ALTA | `SettingsView.tsx` | `_conflict_backup/src_components_dashboard_SettingsView.tsx` |
| 🔴 ALTA | `Dashboard.tsx` | `_conflict_backup/src_pages_Dashboard.tsx` |
| 🟡 MÉDIA | `SubscribersView.tsx` | `_conflict_backup/src_components_dashboard_SubscribersView.tsx` |
| 🟡 MÉDIA | `APITab.tsx` | `_conflict_backup/src_components_dashboard_settings_APITab.tsx` |
| 🟢 BAIXA | `MessagingView.tsx` | `_conflict_backup/src_components_dashboard_MessagingView.tsx` |
