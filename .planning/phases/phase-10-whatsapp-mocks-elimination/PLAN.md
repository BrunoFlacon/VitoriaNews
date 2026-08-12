# Plano: Eliminação de Mocks e Correção de Stubs — WhatsApp

## Objetivo
Substituir todos os dados mockados (MOCK_COMMUNITIES, MOCK_STATUSES, MOCK_CONTACTS) por chamadas reais ao Supabase, criar as tabelas necessárias, e implementar a lógica real de ~10 ações stub que hoje só mostram toast.

---

## Estrutura do Plano

### Fase 1 — Infraestrutura (Migrations SQL)
### Fase 2 — Refatoração dos 3 Mocks
### Fase 3 — Implementação dos Stubs
### Fase 4 — Deploy e Verificação

---

# FASE 1 — MIGRATIONS SQL (BANCO DE DADOS)

## 1.1 Migration: `20260706000010_create_whatsapp_communities.sql`

**O quê:** Criar tabela `whatsapp_communities` com RLS.

```sql
create table if not exists public.whatsapp_communities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.social_connections(id) on delete set null,
  name text not null,
  description text default '',
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela associativa: membros da comunidade
create table if not exists public.whatsapp_community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.whatsapp_communities(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  wa_id text,                          -- número WhatsApp do membro
  name text,
  role text default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  unique (community_id, coalesce(contact_id, wa_id))
);

-- Tabela associativa: grupos da comunidade
create table if not exists public.whatsapp_community_groups (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.whatsapp_communities(id) on delete cascade,
  name text not null,
  description text,
  member_count integer default 0,
  created_at timestamptz not null default now(),
  unique (community_id, name)
);
```

**RLS:** Política `Users manage own communities` — `auth.uid() = user_id` para todas as operações nas 3 tabelas.

## 1.2 Migration: `20260706000011_create_whatsapp_statuses.sql`

**O quê:** Criar tabela `whatsapp_statuses` com RLS.

```sql
create table if not exists public.whatsapp_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.social_connections(id) on delete set null,
  contact_wa_id text,                   -- número do contato (null = meu status)
  contact_name text,
  photo_url text,
  text_content text,
  media_url text,
  media_type text check (media_type in ('image', 'video', 'text', 'audio')),
  viewed boolean not null default false,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_statuses_user
  on public.whatsapp_statuses (user_id, created_at desc);
create index if not exists idx_whatsapp_statuses_expires
  on public.whatsapp_statuses (expires_at);
```

**RLS:** Política `Users manage own statuses` — `auth.uid() = user_id`.

## 1.3 Migration: `20260706000012_add_pinned_and_muted_to_conversations.sql`

**O quê:** Adicionar colunas `is_pinned` e `muted_until` na tabela `whatsapp_conversations` para suportar as ações stub.

```sql
alter table public.whatsapp_conversations
  add column if not exists is_pinned boolean not null default false,
  add column if not exists muted_until timestamptz;

create index if not exists idx_whatsapp_conversations_pinned
  on public.whatsapp_conversations (user_id, is_pinned)
  where is_pinned = true;
```

## 1.4 Migration: `20260706000013_add_is_read_to_whatsapp_conversations.sql`

**O quê:** Adicionar coluna `last_read_at` para controle de "marcar como lida".

```sql
alter table public.whatsapp_conversations
  add column if not exists last_read_at timestamptz;

-- Função para marcar conversa como lida
create or replace function mark_conversation_read(p_conversation_id uuid)
returns void as $$
begin
  update public.whatsapp_conversations
  set unread_count = 0,
      last_read_at = now()
  where id = p_conversation_id
    and user_id = auth.uid();
end;
$$ language plpgsql security definer;
```

---

# FASE 2 — REFATORAÇÃO DOS 3 MOCKS

## 2.1 WhatsAppCommunitiesTab.tsx (~276 linhas)

**Problema:** Usa `MOCK_COMMUNITIES` array fixo. Dados NÃO persistem no Supabase.

**O que fazer:**
| Etapa | Descrição | Arquivo |
|-------|-----------|---------|
| 2.1.1 | Remover `MOCK_COMMUNITIES` | WhatsAppCommunitiesTab.tsx |
| 2.1.2 | Adicionar `useEffect` + `supabase.from("whatsapp_communities").select("*, groups:whatsapp_community_groups(*)")` | WhatsAppCommunitiesTab.tsx |
| 2.1.3 | Adicionar `useAuth()` para pegar `user.id` | WhatsAppCommunitiesTab.tsx |
| 2.1.4 | Modificar `handleCreateCommunity` para fazer INSERT no Supabase | WhatsAppCommunitiesTab.tsx |
| 2.1.5 | Adicionar loading state com `Loader2` enquanto carrega | WhatsAppCommunitiesTab.tsx |
| 2.1.6 | Adicionar `handleAddGroup` funcional (INSERT em `whatsapp_community_groups`) | WhatsAppCommunitiesTab.tsx |
| 2.1.7 | Adicionar `handleSendAnnouncement` funcional (cria mensagem para todos membros) | WhatsAppCommunitiesTab.tsx |

**Esforço:** ~3h

## 2.2 WhatsAppStatusView.tsx (~445 linhas)

**Problema:** Usa `MOCK_STATUSES` com nomes fixos (Aliza, Tahir, Smantha, Bruno).

**O que fazer:**
| Etapa | Descrição | Arquivo |
|-------|-----------|---------|
| 2.2.1 | Remover `MOCK_STATUSES` | WhatsAppStatusView.tsx |
| 2.2.2 | Adicionar `useAuth()` + `useEffect` para carregar de `whatsapp_statuses` | WhatsAppStatusView.tsx |
| 2.2.3 | Modificar `handleCreateTextStatus` para INSERT no Supabase | WhatsAppStatusView.tsx |
| 2.2.4 | Adicionar filtro `expires_at > now()` para não mostrar status expirados | WhatsAppStatusView.tsx |
| 2.2.5 | Marcar status como `viewed=true` ao visualizar | WhatsAppStatusView.tsx |
| 2.2.6 | Adicionar loading state | WhatsAppStatusView.tsx |

**Esforço:** ~3h

## 2.3 DialPad.tsx (~338 linhas)

**Problema:** Usa `MOCK_CONTACTS` com contatos fixos em vez de consultar `contacts` do Supabase.

**O que fazer:**
| Etapa | Descrição | Arquivo |
|-------|-----------|---------|
| 2.3.1 | Remover `MOCK_CONTACTS` | DialPad.tsx |
| 2.3.2 | Adicionar `useAuth()` + `supabase.from("contacts").select("id, name, phone").eq("user_id", user.id)` | DialPad.tsx |
| 2.3.3 | Manter filtro por nome/telefone mas sobre dados reais | DialPad.tsx |
| 2.3.4 | Adicionar loading state | DialPad.tsx |
| 2.3.5 | Fallback: se `contacts` estiver vazia, buscar de `whatsapp_conversations` | DialPad.tsx |

**Esforço:** ~1h

---

# FASE 3 — IMPLEMENTAÇÃO DOS STUBS

## 3.1 Marcar como lida (WhatsAppChatList.tsx:357)

**Atual:** `toast({ title: "Marcada como lida" })`

**Correção:** Chamar `supabase.rpc("mark_conversation_read", { p_conversation_id: chat.id })` e atualizar `unread_count` no state.

## 3.2 Fixar/Desfixar conversa (WhatsAppChatList.tsx:360)

**Atual:** `toast({ title: chat.pinned ? "Desfixada" : "Fixada" })`

**Correção:**
```typescript
await supabase.from("whatsapp_conversations")
  .update({ is_pinned: !chat.pinned })
  .eq("id", chat.id);
```

## 3.3 Silenciar notificações (WhatsAppChatWindow.tsx:572)

**Atual:** `toast({ title: "Notificações silenciadas", description: "Duração: 8 horas." })`

**Correção:**
```typescript
await supabase.from("whatsapp_conversations")
  .update({ muted_until: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() })
  .eq("id", activeChat.id);
```

## 3.4 Mensagens temporárias (WhatsAppChatWindow.tsx:575)

**Atual:** `toast({ title: "Mensagens temporárias", description: "Ativado por 24 horas." })`

**Correção:** Adicionar coluna `disappearing_mode` em `whatsapp_conversations`:
```sql
alter table public.whatsapp_conversations
  add column if not exists disappearing_mode boolean default false,
  add column if not exists disappearing_duration integer default 86400; -- segundos (24h)
```

E implementar UPDATE no Supabase.

## 3.5 Selecionar mensagens (WhatsAppChatWindow.tsx:569)

**Correção:** Implementar modo de seleção multi-mensagens com checkboxes, toolbar de ações (encaminhar/excluir).

## 3.6 Sair do grupo (WhatsAppChatWindow.tsx:610)

**Correção:** Implementar remoção do usuário do grupo via API WhatsApp (requer webhook).

## 3.7 Botões da Comunidade (WhatsAppCommunitiesTab.tsx)

| Linha | Ação | Correção |
|-------|------|----------|
| 99 | Configurações | Abrir modal de edição da comunidade |
| 116 | Adicionar grupo | Modal com formulário para criar grupo |
| 142 | Anúncio | Abrir editor de mensagem + enviar para todos membros |
| 151 | Convidar membros | Gerar link de convite |

---

# FASE 4 — DEPLOY E VERIFICAÇÃO

## 4.1 Ordem de deploy

```
1. Migration 1.1 (whatsapp_communities + groups + members)
2. Migration 1.2 (whatsapp_statuses)
3. Migration 1.3 (pinned + muted)
4. Migration 1.4 (is_read / mark_conversation_read)
5. Refatoração 2.3 (DialPad) — mais simples, baixo risco
6. Refatoração 2.2 (StatusView) — médio risco
7. Refatoração 2.1 (Communities) — maior risco
8. Stubs 3.1 a 3.7 — incremental
```

## 4.2 Rollback

Cada migration é idempotente (`IF NOT EXISTS`). Rollback de código = `git revert` do commit.

## 4.3 Verificação

| Item | Como verificar |
|------|----------------|
| Comunidades persistem | Criar comunidade → recarregar página → deve aparecer |
| Status persistem | Criar status → recarregar → deve aparecer |
| DialPad mostra contatos reais | Abrir DialPad → deve listar contatos do banco |
| Marcar como lida | Clicar → unread_count deve zerar |
| Fixar conversa | Clicar → conversa deve aparecer no topo |
| Silenciar | Clicar → muted_until deve ter data futura |

## 4.4 Bloqueio conhecido

**402 Payment Required** impede testar qualquer chamada Supabase. As correções serão aplicadas no código, mas a verificação funcional só será possível quando:
- A quota mensal resetar (próximo ciclo)
- OU os spend caps forem removidos

---

## RESUMO DE ESFORÇO

| Fase | Arquivos | Esforço |
|------|----------|---------|
| 1. Migrations SQL | 4 arquivos .sql | 1h |
| 2.1 Refatorar Communities | 1 arquivo .tsx | 3h |
| 2.2 Refatorar StatusView | 1 arquivo .tsx | 3h |
| 2.3 Refatorar DialPad | 1 arquivo .tsx | 1h |
| 3.1-3.4 Stubs (fácil) | 2 arquivos .tsx | 1h |
| 3.5-3.7 Stubs (complexo) | 2 arquivos .tsx | 3h |
| **TOTAL** | **~11 arquivos** | **~12h** |
