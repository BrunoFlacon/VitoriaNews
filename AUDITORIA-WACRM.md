# Auditoria Completa do wacrm vs Nosso Sistema WhatsApp CRM

## Sumário Executivo

Data: 04/07/2026
Sistema Analisado: `C:\wamp64\www\WhatsappCRM\wacrm` (Next.js + shadcn/ui + Supabase)
Sistema Alvo: `C:\wamp64\www\lovableproj\social-canvas-hub` (Vite + React + shadcn/ui + Supabase)

---

## 1. ESTRUTURA DO wacrm (REFERÊNCIA)

### 1.1 Rotas do Dashboard (Next.js App Router)

| Rota | Funcionalidade | Status no Nosso Sistema |
|------|---------------|------------------------|
| `/inbox` | Inbox completo com 3 colunas (lista, conversa, sidebar) | ✅ Parcial - temos `WhatsAppInboxView` |
| `/contacts` | Gestão de contatos com tabela, busca, tags, filtros, paginação, importação, bulk delete | ✅ Parcial - temos `WhatsAppContactsTab` |
| `/pipelines` | Pipeline Kanban completo com drag-and-drop, múltiplos pipelines, analytics | ✅ Parcial - temos pipeline integrado na hub |
| `/broadcasts` | Lista de transmissões com status delivery/read, polling automático | ✅ Parcial - temos `WhatsAppBroadcastsTab` |
| `/broadcasts/new` | Wizard de 4 passos (Template → Audiência → Personalizar → Enviar) | ❌ **Não temos** |
| `/broadcasts/[id]` | Detalhes de uma transmissão específica | ❌ **Não temos** |
| `/flows` | **Visual Flow Builder** - chatbot conversacional com nós e branches | ❌ **Não temos** |
| `/flows/[id]` | Editor de fluxo individual (lista + canvas visual) | ❌ **Não temos** |
| `/flows/[id]/runs` | Histórico de execuções de fluxo | ❌ **Não temos** |
| `/automations` | **Automation Engine** - workflows automáticos baseados em eventos | ❌ **Não temos** |
| `/automations/new` | Criar automação via templates prontos | ❌ **Não temos** |
| `/automations/[id]/edit` | Editor de automação com steps | ❌ **Não temos** |
| `/automations/[id]/logs` | Logs de execução de automação | ❌ **Não temos** |
| `/agents` | **AI Agent** - playground + configuração (OpenAI/Anthropic BYOK) | ❌ **Não temos** |
| `/notifications` | Notificações de atribuição de conversa | ❌ **Não temos** |
| `/settings` | 9 painéis de configuração (rail navigation) | ❌ **Parcial - temos settings genérico** |
| `/join/[token]` | Aceitar convite para conta compartilhada | ❌ **Não temos** |

### 1.2 Componentes do wacrm (src/components/)

#### inbox/
| Componente | Função | No nosso sistema? |
|-----------|--------|-------------------|
| `conversation-list.tsx` | Lista de conversas com busca, filtros, badges de não lidas, avatar | ✅ Similar (WhatsAppChatList) |
| `message-thread.tsx` | Thread de mensagens com bubbles, status de envio, agrupamento por data | ✅ Similar (WhatsAppChatWindow) |
| `message-bubble.tsx` | Bubble individual com suporte a texto, imagem, documento, template, interactive | ❌ **Nosso é mais simples** |
| `message-composer.tsx` | Compositor com Mensagens Rápidas, template picker, gravação áudio, anexos | ✅ Similar |
| `contact-sidebar.tsx` | Sidebar de contato com tags, notas, deals, campos customizados, mute | ✅ Similar (ContactSidebar) |
| `message-actions.tsx` | Ações em mensagem (responder, reagir, encaminhar, copiar) | ✅ Similar |
| `message-reactions.tsx` | Reações com emoji | ✅ Similar |
| `reply-quote.tsx` | Citação de resposta | ✅ Similar |
| `template-picker.tsx` | Seletor de templates aprovados | ✅ Similar |

#### pipelines/
| Componente | Função | No nosso sistema? |
|-----------|--------|-------------------|
| `deal-card.tsx` | Card de negócio com valor, contato, etiquetas | ✅ Sim (deal-card.tsx) |
| `deal-form.tsx` | Formulário de deal com sheet | ✅ Sim (deal-form.tsx) |
| `pipeline-board.tsx` | **Kanban drag-and-drop** entre colunas | ❌ **Não temos - nosso pipeline é estático** |
| `pipeline-analytics.tsx` | Métricas do pipeline (totais, funil) | ✅ Sim (pipeline-analytics.tsx) |
| `pipeline-settings.tsx` | Gerenciar estágios (criar, editar, reordenar, cores) | ✅ Sim (pipeline-settings.tsx) |

#### broadcasts/
| Componente | Função | No nosso sistema? |
|-----------|--------|-------------------|
| `step1-choose-template.tsx` | Selecionar template aprovado do Meta | ❌ **Não temos** |
| `step2-select-audience.tsx` | Selecionar audiência (todos, tags, campo customizado, CSV) | ❌ **Não temos** |
| `step3-personalize.tsx` | Personalizar variáveis do template + mídia do header | ❌ **Não temos** |
| `step4-schedule-send.tsx` | Agendar ou enviar agora com barra de progresso | ❌ **Não temos** |

#### flows/ (SISTEMA DE FLUXOS - NÃO TEMOS NADA DISSO)
| Componente | Função |
|-----------|--------|
| `flow-builder.tsx` | **Editor de fluxo visual** (611 linhas) - lista linear de nós |
| `flow-canvas.tsx` | **Canvas visual drag-and-drop** (como n8n / Node-RED) |
| `flow-editor-shell.tsx` | Shell do editor com header, save, atalhos |
| `flow-editor-state.tsx` | Estado compartilhado entre lista e canvas |
| `header.tsx` | Header do editor (nome, status, salvar) |
| `shared.tsx` | Tipos, metadados, utilitários compartilhados |
| `validation-panel.tsx` | Painel de validação de erros do fluxo |
| `forms/node-config-form.tsx` | Formulário de configuração por tipo de nó |
| `forms/fields.tsx` | Campos reutilizáveis do formulário |

#### automations/ (SISTEMA DE AUTOMAÇÕES - NÃO TEMOS NADA DISSO)
| Componente | Função |
|-----------|--------|
| `automation-builder.tsx` | **Editor de automação** (1614 linhas) - steps encadeados com branches |

#### agents/ (AI AGENT - NÃO TEMOS NADA DISSO)
| Componente | Função |
|-----------|--------|
| `ai-playground.tsx` | **Chat playground** para testar o agente AI |

#### contacts/
| Componente | Função | No nosso sistema? |
|-----------|--------|-------------------|
| `contact-form.tsx` | Formulário de contato (nome, telefone, email, empresa, tags) | ✅ Similar (ContactForm.tsx) |
| `contact-detail-view.tsx` | **Sheet de detalhes** com timeline de conversas, notas, deals, tags, campos customizados | ❌ **Não temos** |
| `custom-fields-manager.tsx` | Gerenciar campos customizados | ✅ Similar |
| `import-modal.tsx` | Importar contatos via CSV | ✅ Similar (ImportContactsModal) |

#### settings/
| Componente | Função | No nosso sistema? |
|-----------|--------|-------------------|
| `whatsapp-config.tsx` | Conectar WhatsApp Business API (phone number, token, verificação) | ❌ **Não temos formulário dedicado** |
| `template-manager.tsx` | **Gerenciar templates do Meta** (criar, editar, submeter, ver status) | ❌ **Não temos** |
| `ai-config.tsx` | Configurar AI agent (provider, API key, modelo, instruções) | ❌ **Não temos** |
| `ai-knowledge.tsx` | Base de conhecimento do AI agent (embedding + RAG) | ❌ **Não temos** |
| `members-tab.tsx` | Gerenciar membros da equipe (convidar, papéis, remover) | ❌ **Não temos** |
| `invite-member-dialog.tsx` | Diálogo de convite com link | ❌ **Não temos** |
| `deals-settings.tsx` | Configurações de deals (moeda padrão) | ❌ **Não temos** |
| `fields-and-tags-panel.tsx` | Gerenciar campos customizados + tags | ❌ **Parcial** |
| `tag-manager.tsx` | Gerenciar tags | ❌ **Parcial** |
| `api-keys-settings.tsx` | Gerenciar chaves de API | ❌ **Não temos** |
| `profile-form.tsx` | Editar perfil | ✅ Similar |
| `appearance-panel.tsx` | Tema (claro/escuro) | ✅ Similar |
| `security-panel.tsx` | Segurança (senha, 2FA) | ✅ Similar |
| `settings-rail.tsx` | Navegação lateral de configurações | ❌ **Diferente - temos abas** |

#### presence/
| Componente | Função | No nosso sistema? |
|-----------|--------|-------------------|
| `presence-dot.tsx` | Indicador de presença online/offline | ❌ **Não temos** |
| `presence-heartbeat.tsx` | Heartbeat de presença (atualiza a cada 30s) | ❌ **Não temos** |

#### dashboard/
| Componente | Função | No nosso sistema? |
|-----------|--------|-------------------|
| `metric-card.tsx` | Card de métrica | ✅ Similar |
| `conversations-chart.tsx` | Gráfico de conversações ao longo do tempo | ❌ **Não temos** |
| `pipeline-donut.tsx` | Gráfico donut do pipeline | ❌ **Não temos** |
| `response-time-chart.tsx` | Gráfico de tempo de resposta | ❌ **Não temos** |
| `activity-feed.tsx` | Feed de atividade recente | ❌ **Não temos** |
| `quick-actions.tsx` | Ações rápidas | ❌ **Não temos** |

### 1.3 Lib (Lógica de Negócio)

#### lib/ai/ - **SISTEMA DE AI COMPLETO (NÃO TEMOS)**
| Arquivo | Função |
|--------|--------|
| `admin-client.ts` | Cliente Supabase service_role |
| `auto-reply.ts` | Lógica de resposta automática AI |
| `chunk.ts` | Chunking de texto para embeddings |
| `config.ts` | Gerenciar config (provider, API key, modelo) |
| `context.ts` | Montar contexto da conversa para o prompt |
| `defaults.ts` | Constantes, sentinelas |
| `embeddings.ts` | Gerar embeddings para RAG |
| `generate.ts` | Gerar reply via OpenAI ou Anthropic |
| `knowledge.ts` | CRUD da base de conhecimento |
| `query.ts` | Query RAG (busca semântica) |
| `types.ts` | Tipos do sistema AI |
| `validate.ts` | Validar config |
| `providers/openai.ts` | Adapter OpenAI |
| `providers/anthropic.ts` | Adapter Anthropic |
| `providers/shared.ts` | Compartilhado entre providers |

#### lib/automations/ - **SISTEMA DE AUTOMAÇÕES COMPLETO (NÃO TEMOS)**
| Arquivo | Função |
|--------|--------|
| `admin-client.ts` | Cliente Supabase service_role |
| `engine.ts` | **Motor de automação** (703 linhas) - dispara, executa steps, condições, waits, webhooks |
| `meta-send.ts` | Envio de mensagem via Meta API |
| `steps-tree.ts` | Árvore de steps com branches |
| `templates.ts` | Templates prontos (welcome, out_of_office, lead_qualifier, follow_up) |
| `trigger-meta.ts` | Metadados dos triggers |
| `validate.ts` | Validar automação |

#### lib/flows/ - **SISTEMA DE FLUXOS COMPLETO (NÃO TEMOS)**
| Arquivo | Função |
|--------|--------|
| `admin-client.ts` | Cliente Supabase service_role |
| `edges.ts` | Lógica de arestas do grafo de nós |
| `engine.ts` | **Motor de fluxo** (1117 linhas) - runner de chatbot conversacional |
| `fallback.ts` | Política de fallback (reprompt, handoff) |
| `layout.ts` | Layout automático do canvas |
| `meta-send.ts` | Envio de interactive buttons/lists/media |
| `templates.ts` | Templates de fluxo prontos |
| `types.ts` | Tipos do sistema de fluxos |
| `validate.ts` | Validador de fluxo |

#### lib/webhooks/ - **SISTEMA DE WEBHOOKS (NÃO TEMOS)**
| Arquivo | Função |
|--------|--------|
| `deliver.ts` | **Entrega de webhooks** para endpoints externos |
| `endpoints.ts` | CRUD de endpoints + geração de segredo |
| `events.ts` | Tipos e serialização de eventos |
| `sign.ts` | Assinatura HMAC-SHA256 de eventos |
| `ssrf.ts` | Proteção contra SSRF |

#### lib/whatsapp/ - **INTEGRAÇÃO META API**
| Arquivo | Função | No nosso sistema? |
|--------|--------|-------------------|
| `broadcast-core.ts` | Lógica central de broadcast | ❌ **Não temos** |
| `encryption.ts` | Criptografia de backup | ✅ Temos |
| `meta-api.ts` | **Cliente Meta API** (enviar msg, mídia, templates) | ❌ **Não temos** |
| `phone-utils.ts` | Utilitários de telefone | ❌ **Não temos** |
| `registration.ts` | Registrar número no Meta | ❌ **Não temos** |
| `resolve-conversation.ts` | Resolver conversation_id | ❌ **Não temos** |
| `send-message.ts` | Enviar mensagem via API | ❌ **Não temos** |
| `template-*.ts` | Gerenciamento de template (componentes, header, lifecycle, validators, webhook, status) | ❌ **Não temos** |
| `webhook-signature.ts` | Assinatura do webhook do Meta | ❌ **Não temos** |

#### lib/auth/ - **SISTEMA MULTI-USUÁRIO**
| Arquivo | Função | No nosso sistema? |
|--------|--------|-------------------|
| `account.ts` | Gestão de conta | ❌ **Não temos - somos single-tenant** |
| `invitations.ts` | Convites para conta | ❌ **Não temos** |
| `roles.ts` | Sistema de papéis (owner, admin, agent, viewer) com `hasMinRole()` | ❌ **Não temos** |

#### lib/api-keys/ - **SISTEMA DE CHAVES DE API**
| Arquivo | Função | No nosso sistema? |
|--------|--------|-------------------|
| `keys.ts` | CRUD de chaves de API | ❌ **Não temos** |
| `scopes.ts` | Escopos de permissão | ❌ **Não temos** |
| `store.ts` | Armazenamento criptografado | ❌ **Não temos** |

### 1.4 Hooks

| Hook | Função | No nosso sistema? |
|------|--------|-------------------|
| `use-auth.tsx` | Contexto de autenticação + account_id | ✅ Similar (useAuth) |
| `use-broadcast-sending.ts` | Envio de broadcast com progresso | ❌ **Não temos** |
| `use-can.ts` | **Verificação de permissão por papel** | ❌ **Não temos** |
| `use-presence.ts` | Presença online/offline | ❌ **Não temos** |
| `use-realtime.ts` | Conexão Realtime robusta com reconexão | ❌ **Não temos hook dedicado** |
| `use-theme.tsx` | Tema claro/escuro | ✅ Similar |
| `use-total-unread.ts` | Total de não lidas | ❌ **Não temos** |
| `use-unread-notifications.ts` | Notificações não lidas | ❌ **Não temos** |

---

## 2. BANCO DE DADOS (TABELAS DO wacrm)

### 2.1 Tabelas que JÁ TEMOS (ou equivalentes)

| Tabela | Uso | Temos? |
|--------|-----|--------|
| `contacts` | Contatos | ✅ |
| `tags` | Tags | ✅ |
| `contact_tags` | Relação contato-tag | ✅ |
| `conversations` | Conversas WhatsApp | ✅ |
| `messages` | Mensagens | ✅ |
| `message_reactions` | Reações | ✅ |
| `pipelines` | Pipelines | ✅ |
| `pipeline_stages` | Estágios do pipeline | ✅ |
| `deals` | Negócios | ✅ |
| `profiles` | Perfis de usuário | ✅ |
| `whatsapp_config` | Configuração WhatsApp | ✅ |
| `message_templates` | Templates do Meta | ✅ |
| `custom_fields` | Campos customizados | ✅ |
| `contact_custom_values` | Valores de campos customizados | ✅ |
| `contact_notes` | Notas de contato | ✅ |

### 2.2 Tabelas do wacrm que NÃO TEMOS

| Migration | Tabela | Função |
|-----------|--------|--------|
| 006 | `automations` | Workflows automáticos |
| 006 | `automation_steps` | Passos de automação com branches |
| 006 | `automation_logs` | Logs de execução |
| 006 | `automation_pending_executions` | Execuções agendadas (waits) |
| 010 | `flows` | Fluxos conversacionais |
| 010 | `flow_nodes` | Nós do grafo do fluxo |
| 010 | `flow_runs` | Execuções de fluxo por contato |
| 010 | `flow_run_events` | Eventos da execução (append-only) |
| 014 | `message_templates` (campos extras) | meta_template_id, rejection_reason, quality_score, submission_error |
| 016 | `flow_media` | Mídia associada a fluxos |
| 017 | `accounts` | Contas multi-tenant |
| 017 | `account_members` | Membros da conta |
| 019 | `account_invitations` | Convites para conta |
| 025 | `filter_contacts_by_tags` (RPC) | Função de filtro |
| 026 | `api_keys` | Chaves de API |
| 027 | `notifications` | Notificações do sistema |
| 028 | `webhook_endpoints` | Endpoints de webhook |
| 029 | `ai_reply` | Configuração do AI agent |
| 030 | `ai_knowledge` | Base de conhecimento RAG |

---

## 3. COMPARAÇÃO DETALHADA: wacrm vs NOSSO SISTEMA

### 3.1 O que TEMOS (funcionalidade similar)

| Funcionalidade | wacrm | Nosso Sistema |
|---------------|-------|--------------|
| Inbox 3 colunas | ✅ Completo | ✅ Funcional |
| Envio de mensagens | ✅ Texto, imagem, doc, áudio, template, interactive | ✅ Texto, imagem, áudio, localização |
| Pipeline Kanban | ✅ Drag-and-drop entre colunas | ✅ Estático (sem drag) |
| Transmissões | ✅ Lista com métricas delivery/read | ✅ Lista básica |
| Tags | ✅ CRUD completo | ✅ CRUD completo |
| Contatos | ✅ Tabela com busca, filtros, paginação | ✅ Grid básico |
| Deals | ✅ CRUD completo | ✅ CRUD completo |
| Config WhatsApp | ✅ Conectar/desconectar | ✅ Bot settings |

### 3.2 O que NÃO TEMOS (FUNCIONALIDADES FALTANTES)

#### PRIORIDADE ALTA (Core CRM)

| # | Funcionalidade | Complexidade | Impacto |
|---|---------------|-------------|---------|
| 1 | **Pipeline drag-and-drop** (pipeline-board.tsx) | Média | Alto - Kanبان real |
| 2 | **Wizard de Broadcast** (4 steps + agendamento) | Alta | Alto - Envio em massa real |
| 3 | **Visual Flow Builder** (flow-builder + flow-canvas) | **Muito Alta** | Alto - Chatbot interativo |
| 4 | **Automation Engine** (engine.ts + builder) | **Muito Alta** | Alto - Automação de processos |
| 5 | **AI Agent** (playground + config + RAG) | Alta | Alto - Respostas inteligentes |
| 6 | **Contact Detail Sheet** (timeline + deals + notas) | Média | Alto - Visão 360° do contato |
| 7 | **Presença online/offline** | Baixa | Médio - Saber quem está online |

#### PRIORIDADE MÉDIA (Administrativo)

| # | Funcionalidade | Complexidade | Impacto |
|---|---------------|-------------|---------|
| 8 | **Template Manager** (enviar para aprovação no Meta) | Alta | Médio - Gerenciar templates |
| 9 | **Multi-usuário** (accounts, membros, convites) | **Muito Alta** | Alto - Trabalho em equipe |
| 10 | **Notificações** (atribuição de conversa) | Média | Médio - Alertas |
| 11 | **Webhooks** (endpoints externos com assinatura) | Alta | Médio - Integrações |
| 12 | **API Keys** (chaves de API com escopos) | Alta | Médio - API pública |
| 13 | **Gráficos de Dashboard** (conversas, pipeline donut, response time) | Média | Médio - Métricas visuais |

#### PRIORIDADE BAIXA (Melhorias)

| # | Funcionalidade | Complexidade | Impacto |
|---|---------------|-------------|---------|
| 14 | **Chat media - suporte a interactive** (botões, listas) | Média | Médio - UX do chat |
| 15 | **Mensagens Rápidas** (templates inline no chat) | Baixa | Médio - Produtividade |
| 16 | **Activity Feed** (atividades recentes) | Baixa | Baixo |
| 17 | **Quick Actions** (atalhos no dashboard) | Baixa | Baixo |
| 18 | **Criptografia de backup** (já temos, mas sem restore) | Média | Médio - Segurança |

---

## 4. PLANO DE ATUALIZAÇÃO PRIORIZADO

### Fase 1: Pipeline Drag-and-Drop + Kanban Real
**Estimativa:** 2-3 dias
**Arquivos a criar:**
- `src/components/dashboard/whatsapp/pipeline-board.tsx` (port do wacrm)
- Atualizar `WhatsAppHubView.tsx` para usar PipelineBoard

### Fase 2: Contact Detail Sheet (Visão 360°)
**Estimativa:** 1-2 dias
**Arquivos a criar:**
- `src/components/dashboard/whatsapp/ContactDetailSheet.tsx`
- Timeline de conversas, notas, deals, tags, campos customizados

### Fase 3: Broadcast Wizard (4 Steps)
**Estimativa:** 3-4 dias
**Arquivos a criar:**
- `Step1ChooseTemplate.tsx`
- `Step2SelectAudience.tsx`
- `Step3Personalize.tsx`
- `Step4ScheduleSend.tsx`
- Hook `useBroadcastSending.ts`

### Fase 4: Presença Online
**Estimativa:** 0.5 dia
**Arquivos a criar:**
- `PresenceDot.tsx`
- Hook `usePresence.ts`
- Migration para `member_presence`

### Fase 5: Template Manager + WhatsApp Config
**Estimativa:** 2-3 dias
**Arquivos a criar:**
- `TemplateManager.tsx` (submeter templates ao Meta)
- `WhatsAppConfigForm.tsx` (conexão WABA)
- Migrations para campos extras de message_templates

### Fase 6: Sistema de Notificações
**Estimativa:** 1-2 dias
**Arquivos a criar:**
- Migration `notifications` table
- Componente de notificações
- Hook `useUnreadNotifications`

### Fase 7: Webhooks + API Keys
**Estimativa:** 2-3 dias
**Arquivos a criar:**
- Migrations para `webhook_endpoints` e `api_keys`
- Componentes de settings
- Lib de entrega e assinatura

### Fase 8: AI Agent (OpenAI/Anthropic BYOK)
**Estimativa:** 3-5 dias
**Arquivos a criar:**
- Migrations `ai_reply`, `ai_knowledge`
- Lib: `ai/` completa (generate, embeddings, context, etc.)
- Componente AiPlayground
- Configuração AI nas settings

### Fase 9: Automation Engine
**Estimativa:** 5-7 dias
**Arquivos a criar:**
- Migrations `automations`, `automation_steps`, `automation_logs`, `automation_pending_executions`
- Lib: `automations/` completa (engine, meta-send, templates, etc.)
- AutomationBuilder (1614 linhas)
- Páginas: list, new, edit, logs

### Fase 10: Visual Flow Builder
**Estimativa:** 7-10 dias
**Arquivos a criar:**
- Migrations `flows`, `flow_nodes`, `flow_runs`, `flow_run_events`
- Lib: `flows/` completa (engine, canvas, layout, etc.)
- FlowBuilder + FlowCanvas
- Páginas: list, editor, runs

### Fase 11: Multi-usuário (Accounts + Roles)
**Estimativa:** 5-7 dias
**Arquivos a criar:**
- Migrations `accounts`, `account_members`, `account_invitations`
- Lib: `auth/` (roles, invitations, account)
- Hook `useCan()` para permissões

### Fase 12: Dashboard Analytics
**Estimativa:** 2-3 dias
**Arquivos a criar:**
- ConversationChart, PipelineDonut, ResponseTimeChart
- ActivityFeed, QuickActions

---

## 5. MIGRAÇÕES NECESSÁRIAS (ORDEM CRONOLÓGICA)

```sql
-- Migration 1: Presença
CREATE TABLE member_presence (user_id, status, last_seen);

-- Migration 2: Notificações
CREATE TABLE notifications (id, account_id, user_id, type, title, body, read_at);

-- Migration 3: Webhook Endpoints
CREATE TABLE webhook_endpoints (id, url, events, secret_encrypted, is_active);

-- Migration 4: API Keys
CREATE TABLE api_keys (id, user_id, name, key_prefix, hashed_key, scopes);

-- Migration 5: AI Agent  
CREATE TABLE ai_reply (id, user_id, provider, api_key_encrypted, model, system_prompt);
CREATE TABLE ai_knowledge (id, user_id, content, embedding);

-- Migration 6: Automations
CREATE TABLE automations (id, user_id, name, trigger_type, trigger_config, is_active, ...);
CREATE TABLE automation_steps (id, automation_id, step_type, step_config, position, ...);
CREATE TABLE automation_logs (id, automation_id, contact_id, status, steps_executed, ...);
CREATE TABLE automation_pending_executions (id, automation_id, run_at, context, ...);

-- Migration 7: Flows
CREATE TABLE flows (id, user_id, name, status, trigger_type, trigger_config, ...);
CREATE TABLE flow_nodes (id, flow_id, node_key, node_type, config, position_x, position_y);
CREATE TABLE flow_runs (id, flow_id, contact_id, conversation_id, status, current_node_key, ...);
CREATE TABLE flow_run_events (id, flow_run_id, event_type, node_key, payload);

-- Migration 8: Accounts/Multi-user
CREATE TABLE accounts (id, name, owner_user_id);
CREATE TABLE account_members (account_id, user_id, role);
CREATE TABLE account_invitations (id, account_id, role, token_hash, expires_at);
```

## 6. CONCLUSÃO

Nosso sistema atual tem cerca de **30%** das funcionalidades do wacrm.

**O que está maduro:**
- Inbox (troca de mensagens em tempo real)
- Pipeline básico (sem drag-and-drop)
- Contatos (sem detail sheet)
- Tags
- Configuração WhatsApp básica

**O que falta (70%):**
- Flow Builder (chatbot visual) - **maior feature**
- Automation Engine - **segunda maior feature**
- AI Agent com RAG
- Broadcast Wizard completo
- Multi-usuário com papéis
- Notificações
- Webhooks
- API Keys
- Presença online
- Dashboard Analytics
- Kanban drag-and-drop real

**Total estimado para implementação completa: 35-55 dias de desenvolvimento**
