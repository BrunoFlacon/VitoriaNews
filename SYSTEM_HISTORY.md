# Social Canvas Hub - Registro Histórico e Backup de Sistema

Este documento consolida todas as ações, melhorias e estabilizações realizadas ao longo das sessões de desenvolvimento do Social Canvas Hub.

## 🚀 Marcos do Projeto

### 1. Estabilização OAuth & Mídia (Sessão Atual) - CONCLUÍDO 🚀
- **TikTok v2 (PKCE)**: Implementação nuclear do handshake PKCE (Code Verifier/Challenge), resolvendo falhas de autenticação.
- **Proxy de Mídia**: Correção estrutural na Edge Function para bypass de imagens bloqueadas (X, TikTok, Instagram) com suporte a Referer dinâmico.
- **Identidade Visual**: Restauração total do nome "Vitória Net" e paleta Indigo Premium.
- **Sincronização de Métricas**: Normalização de followers e posts para exibição imediata no Dashboard.

### 2. Infraestrutura, RBAC & Dashboard (Brains 31f9 & 5d61)
- **RBAC Dinâmico**: Criação do `PermissionsTab.tsx` permitindo controle de acesso por cargos para cada módulo do sistema.
- **Sidebar Dinâmica**: Integração total da navegação com a tabela `system_settings`.
- **Analytics Real**: Refatoração da função `get-analytics` para eliminar dados fictícios e realizar cálculos reais de engajamento e crescimento.
- **Performance**: Migrações SQL para índices de performance e sincronização forçada de schema.

### 3. Messaging & Social Sync (Brain e783)
- **Unificação de Mensagens**: Centralização de chats de múltiplas fontes na tabela `messages`.
- **Optimistic UI**: Implementação de deleção imediata de canais no `MessagingView.tsx` com invalidação de cache via React Query.
- **Telegram Sync**: Estabilização inicial da coleta de chats e membros.

### 4. Vitória Net (Bruno Profile)
- **CMS Visual**: Evolução do builder do Media Kit com persistência atômica e edição inline.
- **Segurança**: Implementação de RLS (Row Level Security) e proteção contra ataques robóticos.

## 🛠️ ROADMAP FINAL (Rumo à Produção)
1. **Threads OAuth**: Resolver mismatch de ID no callback final.
2. **WhatsApp Oficial**: Migrar Webhooks para a Cloud API da Meta (API Oficial).
3. **Automação pg_cron**: Agendar coletas diárias do News Radar e Analytics para evitar "Cold Starts".
4. **Exportação de Relatórios**: Atrelar o botão "Exportar PDF" às métricas reais do sistema.
5. **Avatar Telegram**: Download real de imagens via `getFile` para garantir exibição de perfis.

## 🛠️ Instruções de Manutenção
- **Edge Functions**: Sempre utilizar `apikey` do Supabase para requisições de mídia via Proxy.
- **Deno Config**: Manter o VSCode configurado para Deno para evitar erros de importação em funções.
- **Migrations**: O diretório `supabase/migrations` é a fonte oficial de verdade do schema.

---
*Documento atualizado em 16/05/2026 após auditoria sistêmica completa.*
