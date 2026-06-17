# Plano de Sincronização — Desktop ↔ GitHub (social-canvas-hub)

## Situação Atual

| Item | Desktop | GitHub (origin/main) |
|------|---------|---------------------|
| Commit HEAD | `4c814e6` | `4c814e6` |
| Mesmo commit? | ✅ Sim | ✅ Sim |
| Arquivos modificados (unstaged) | 154 arquivos | N/A |
| Branch | `main` | `main` |

**Conclusão**: O GitHub remoto está no mesmo commit que o desktop. Tudo que temos de diferente são as correções que aplicamos localmente (merge artifacts, retry fixes, cooldown, etc.) que ainda não foram commitadas.

---

## Fase 1: Backup e Preparação

### 1.1 Salvar snapshot atual
```powershell
# Já existe em _system_backup_20260610_033738/
# Já existe em _conflict_backup/ (09/06 21:20)
```

### 1.2 Garantir que nada será perdido
```powershell
git stash list   # verificar stashes existentes
```

---

## Fase 2: Comparação Detalhada

### 2.1 Arquivos que existem no GitHub mas NÃO no desktop
```bash
# Listar arquivos no commit do remote que não estão no working tree
git diff --name-status origin/main -- src/
```
**Atenção**: Como estamos no mesmo commit (4c814e6), não há diferença de estrutura. A diferença é apenas nas modificações não-commitadas.

### 2.2 Arquivos modificados no desktop (não commitados)
```bash
# Ver diff completo
git diff --stat HEAD
```
Resultado: ~13.500 linhas inseridas, ~22.000 removidas (154 arquivos)

### 2.3 O que mudou no desktop vs GitHub
| Tipo | O quê | Staged? |
|------|-------|---------|
| Correções | Merge artifacts removidos (SettingsView, MessagingView, etc.) | ❌ Não |
| Correções | `useSocialStats` retry 2→0, `useAnalytics` retry 1→0 | ❌ Não |
| Correções | Cooldown 60s syncSocialStats | ❌ Não |
| Correções | Removida chamada duplicada `collect-social-analytics` | ❌ Não |
| Correções | CLS fix em CronMonitorView | ❌ Não |
| Correções | Imports não utilizados removidos | ❌ Não |
| Melhoria | `fetchWithTimeout` global (10s) no Supabase client | ❌ Não |
| Melhoria | `SafeImage` fix + post preview fix | ❌ Não |
| Refactor | Dashboard inline → DashboardHomeView | ❌ Não |

---

## Fase 3: Sincronização (Download do GitHub)

### 3.1 Verificar branches alternativas
O site pode estar rodando uma branch diferente (ex: `main`, `production`, `live`).

```bash
# Listar branches no remoto
git branch -r

# Ver qual branch o site está usando (verificar Deploy Settings no GitHub ou Lovable)
```

### 3.2 Download de código do GitHub (quando houver diferença)
```bash
# Se o remote tiver código mais novo:
# Opção A: Fazer merge (mantém nossas alterações + as do remote)
git pull origin main

# Opção B: Apenas comparar sem alterar
git fetch origin
git diff HEAD origin/main -- src/components/ src/pages/
```

### 3.3 Estado atual (sem diferença)
Neste momento NÃO há código no GitHub que não temos no desktop. Ambos estão no commit `4c814e6`.

---

## Fase 4: Integração ao Desktop

### 4.1 Processo para cada arquivo/função importada do GitHub
1. **Comparar** diff entre versão local e versão do GitHub
2. **Analisar** se a função do GitHub é superior (mais features, menos bugs)
3. **Integrar** manualmente no desktop, resolvendo conflitos
4. **Testar** com `npx tsc --noEmit`
5. **Repetir** até todos os arquivos estarem integrados

### 4.2 O que devemos INTEGRAR do GitHub para o desktop
*(Preenchido após análise de cada diff)*

| Arquivo | Status | Decisão |
|---------|--------|---------|
| *(a ser preenchido)* | | |

### 4.3 O que devemos MANTER do desktop (nossas correções)
| Arquivo | Correção | Motivo |
|---------|----------|--------|
| `src/hooks/useSocialStats.ts` | retry: 0, cache localStorage | Evita sobrecarga do servidor |
| `src/hooks/useAnalytics.ts` | retry: 0, seeded data fallback | Resiliência quando Supabase cai |
| `src/integrations/supabase/client.ts` | fetchWithTimeout 10s | Timeout global, não trava requisições |
| `src/components/dashboard/SettingsView.tsx` | Cooldown 60s, sem duplicate call | Reduz carga no servidor |
| Todos os `src/` e `supabase/functions/` | Merge artifacts removidos | Compila sem erros |

---

## Fase 5: Testes e Verificação

### 5.1 Checklist pós-sincronização
- [ ] `npx tsc --noEmit` — zero erros
- [ ] `npm run build` — sucesso
- [ ] Navegar em todas as 15+ abas do dashboard
- [ ] Verificar SettingsView (profile, api, seo, system portal)
- [ ] Verificar Dashboard (stats cards, chart, redes, recent posts)
- [ ] Verificar MessagingView (chat list, chat window)
- [ ] Verificar SubscribersView (filtro, export)
- [ ] Verificar StoriesLivesView
- [ ] Verificar CreatePostPanel
- [ ] Verificar DocumentsView
- [ ] Verificar Edge Functions (`supabase functions serve` local)

### 5.2 Monitoramento de erros
- [ ] Abrir console do navegador e verificar ausência de erros
- [ ] Verificar warnings de performance (CLS, reflow)
- [ ] Verificar 403/404 de assets

---

## Fase 6: Próximos Passos (após aprovação)

### 6.1 Quando estiver tudo validado
```bash
# 1. Ver o que vai no commit
git status

# 2. Commitar SOMENTE com permissão
git add <arquivos>
git commit -m "fix: descricao clara das correcoes"

# 3. Push SOMENTE com permissão
git push origin main
```

### ⚠️ REGRAS
- **NUNCA** fazer commit sem permissão explícita do usuário
- **NUNCA** fazer push sem permissão explícita
- **NUNCA** sobrescrever arquivo sem ter backup
- **SEMPRE** testar com `tsc` antes de qualquer alteração

---

## Resumo do Fluxo

```
GitHub (origin/main @ 4c814e6)  ←→  Desktop (main @ 4c814e6 + 154 uncommitted)
         |                                      |
         v                                      v
    Código base IGUAL                    Correções locais:
    (sem diferença)                       - Merge artifacts fix
                                          - Retry reduction
                                          - Cooldown
                                          - Timeout global
                                          - CLS fix
                                          - Unused imports

Próximo passo: NENHUMA sincronização necessária agora.
Próximo passo real: Commitar correções locais e depois deployar Edge Functions.
```
