# UAT - Sincronização do Telegram e Inbox em Tempo Real

## Visão Geral
Esta auditoria cobre a lógica de sincronização para canais do Telegram durante o login e a atualização em tempo real das mensagens no inbox do dashboard.

## Descobertas

### F-01: Múltiplos perfis do Telegram exibidos no Analytics
- **Severidade**: Alta
- **Descrição**: Conectar um bot do Telegram através do dashboard resulta em múltiplas entradas para a mesma conta na visão de Analytics (ex: exibindo "4 perfis" para uma única conexão).
- **Arquivos Ref**: `src/components/dashboard/AdvancedAnalytics.tsx`, `supabase/functions/collect-social-analytics/index.ts`
- **Esperado**: Cada conexão deve resultar em um único perfil consolidado na visão de Analytics.

### F-02: Erro 400 (Bad Request) ao configurar Perfil Primário
- **Severidade**: Alta
- **Descrição**: Tentar definir uma conexão social (como Threads ou Telegram) como "Primária" resulta em um erro `POST 400 Bad Request` do Supabase devido a restrições únicas ausentes em `user_id, platform`.
- **Arquivos Ref**: `src/hooks/useSocialConnections.ts`, `supabase/migrations/`
- **Esperado**: Definir um perfil como primário deve ser uma operação atômica de upsert sem erros.

### F-03: Mensagens do Telegram não aparecem em tempo real
- **Severidade**: Média
- **Descrição**: Mensagens recebidas através do Webhook do Telegram são salvas no banco de dados, mas não ativam uma atualização de interface no MessagingView até uma atualização manual.
- **Arquivos Ref**: `supabase/functions/telegram-webhook/index.ts`, `src/components/dashboard/MessagingView.tsx`
- **Esperado**: Mensagens recebidas devem aparecer instantaneamente na janela de chat via Supabase Realtime.
