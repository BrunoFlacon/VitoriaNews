# Plano de Auditoria e Correção — Telegram (Duplicatas e Real-time)

## 1. Diagnóstico do Problema

### A. Duplicação em Analytics
Conforme o print, o Telegram exibe "4 perfil(is)". Isso ocorre porque o sistema está listando individualmente cada canal/grupo vinculado ao bot na tabela `social_accounts`.
- **Causa provável**: A Edge Function `collect-social-analytics` cria um registro em `social_accounts` para cada canal/grupo encontrado, em vez de consolidar as métricas no perfil principal do Bot.

### B. Duplicação no Login/Conexão
Novos logins criam novos registros em `social_connections`.
- **Causa provável**: Falta de restrição `UNIQUE` ou lógica de `upsert` baseada no `platform_user_id` (ID do Bot) para a plataforma Telegram.

### C. Mensagens não "Ao Vivo"
O Telegram Webhook recebe as mensagens, mas a interface não as exibe instantaneamente.
- **Causa provável**:
  1. O Webhook não está inserindo dados na tabela `messages` com o `user_id` correto.
  2. O componente de frontend de Mensagens não está assinado no canal de Realtime do Supabase para novas inserções.

---

## 2. Plano de Auditoria Técnica

### 2.1 Verificação de Banco de Dados
- [ ] Executar query para identificar duplicatas em `social_connections` filtrando por `platform='telegram'`.
- [ ] Verificar a estrutura da tabela `social_accounts` para entender como canais de Telegram são armazenados.

### 2.2 Verificação de Código
- [ ] **Edge Function**: `supabase/functions/collect-social-analytics/index.ts` -> Analisar o case `telegram`.
- [ ] **Webhook**: `supabase/functions/telegram-webhook/index.ts` -> Verificar inserção de mensagens e logs de recebimento.
- [ ] **Frontend**: `src/hooks/useSocialConnections.ts` -> Verificar processo de salvamento do token.
- [ ] **Analytics UI**: `src/components/dashboard/AnalyticsView.tsx` -> Verificar como os perfis são agrupados no seletor.

---

## 3. Plano de Ação (Correções)

### Fase 1: Unificação de Perfis (Deduplicação)
1. **Deduplicação Proativa**: Modificar a lógica de salvamento do bot do Telegram para usar `ON CONFLICT (user_id, platform, platform_user_id) DO UPDATE`.
2. **Consolidação em Analytics**: Alterar a Edge Function para que, mesmo que existam múltiplos canais em `messaging_channels`, o resultado em `social_accounts` seja consolidado em uma única entrada representativa do Bot.

### Fase 2: Correção do Real-time
1. **Webhook Fix**: Garantir que as mensagens recebidas pelo bot sejam inseridas com o `user_id` do dono da conexão.
2. **Subscription Fix**: Adicionar/reforçar a assinatura `supabase.channel('messages').on('postgres_changes', ...)` no módulo de chat/mensagens.

---

## 4. Próximos Passos
Vou iniciar agora a análise técnica do arquivo de sincronização de analytics para entender o agrupamento do Telegram.
