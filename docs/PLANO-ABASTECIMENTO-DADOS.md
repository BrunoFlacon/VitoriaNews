# Plano de Abastecimento Profundo de Dados — Social Canvas Hub

## Objetivo
Resgatar **100% do histórico real** das redes sociais (posts, visualizações, likes, comentários) desde a criação dos perfis conectados, populando o banco de dados para alimentar os gráficos de Analytics, Melhores Horários, Melhores Publicações e Intelligence Hub — sem uso de dados falsos.

---

## Arquitetura do Motor de Extração

```
Supabase Cron (*/5 min)
       │
       ▼
Edge Function: historical-sync
       │
       ├─► Modo Histórico (is_completed = false)
       │   • Puxa 3 páginas por ciclo (≈ 150 posts)
       │   • Aguarda 1.5s entre páginas (rate throttling)  
       │   • Salva cursor (next_page_token) para próxima rodada
       │   • Repete até chegar no dia de criação do perfil
       │
       └─► Modo Manutenção (is_completed = true)
           • Só roda 1x por hora por conta
           • Puxa 1 página (os posts mais recentes)
           • Garante que métricas fiquem sempre frescas
```

---

## Limites de API Respeitados

| Plataforma | Limite Oficial | Nossa Taxa |
|---|---|---|
| Meta (Facebook/Instagram) | 200 chamadas/hora | ~36/hora ✅ |
| YouTube Data API v3 | 10.000 units/dia | ~540/dia ✅ |
| X (Twitter) v2 | 15 requests/15min | 3/15min ✅ |

---

## Fluxo de Dados → Gráficos

```
post_metrics (posts individuais com data original)
       │
       ▼
account_metrics (snapshot diário via roll-up)
       │
       ▼
Dashboard Charts + Melhores Horários + Melhores Posts
```

---

## Tabelas Criadas/Afetadas

| Tabela | Papel |
|---|---|
| `historical_sync_state` | Salva o cursor de paginação por conta |
| `post_metrics` | Armazena cada post com data e métricas |
| `account_metrics` | Snapshots diários para o gráfico de linha |

---

## Ciclo de Vida (Automático, Sem Intervenção)

1. **Cron dispara** a cada 5 minutos
2. **Edge Function** verifica qual conta tem mais pendências
3. Puxa 3 páginas (respeitando o limite) e **salva no banco**
4. Atualiza o cursor no `historical_sync_state`
5. Quando `is_completed = true` → muda para **Modo Manutenção** (atualiza a cada hora)

---

## Arquivos Gerados
- `supabase/functions/historical-sync/index.ts` — Motor da extração
- `supabase/migrations/20260527020000_historical_sync_support.sql` — Tabela de estado
- `supabase/migrations/20260527023000_historical_sync_cron.sql` — Cron Job
- `docs/SQL_EXECUCAO_UNICA.sql` — SQL consolidado para rodar no Supabase Dashboard
