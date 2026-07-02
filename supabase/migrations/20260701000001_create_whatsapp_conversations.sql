-- WhatsApp Plano de Correção — Seção 6.3
-- Nova tabela whatsapp_conversations (isolamento por número + contato)
-- Colunas de delivery_status em messages (entregue/lido)
-- Totalmente aditivo — nada existente é removido ou renomeado

-- ============================================================
-- 1. whatsapp_conversations: 1 linha por contato POR NÚMERO
-- ============================================================
create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  contact_wa_id text not null,             -- número do contato (wa_id)
  contact_name text null,
  avatar_url text null,
  last_message_preview text null,
  last_message_at timestamptz null,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, contact_wa_id)    -- 1 conversa por contato POR NÚMERO
);

-- Índices para consulta eficiente
create index if not exists idx_whatsapp_conversations_user 
  on public.whatsapp_conversations (user_id, updated_at desc);
create index if not exists idx_whatsapp_conversations_connection 
  on public.whatsapp_conversations (connection_id, updated_at desc);

-- RLS
alter table public.whatsapp_conversations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'whatsapp_conversations' 
    and policyname = 'Users manage own whatsapp conversations'
  ) then
    create policy "Users manage own whatsapp conversations"
      on public.whatsapp_conversations
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Realtime (granular por conversa)
alter publication supabase_realtime add table public.whatsapp_conversations;

-- ============================================================
-- 2. Extensão aditiva da tabela messages (colunas NOVAS)
-- ============================================================
-- conversation_id: vínculo com a conversa (nullable = retrocompatível)
alter table public.messages 
  add column if not exists conversation_id uuid references public.whatsapp_conversations(id) on delete set null;

-- delivery_status: separado da coluna `status` (ciclo de envio)
alter table public.messages
  add column if not exists delivery_status text 
  check (delivery_status in ('sent', 'delivered', 'read', 'failed'));

alter table public.messages
  add column if not exists delivered_at timestamptz;

alter table public.messages
  add column if not exists read_at timestamptz;

-- Índice para lookup por wa_message_id (já deve existir, mas garantimos)
create index if not exists idx_messages_wa_message_id 
  on public.messages ((metadata->>'wa_message_id'))
  where metadata ? 'wa_message_id';

-- Índice para lookup de delivery_status
create index if not exists idx_messages_delivery_status 
  on public.messages (delivery_status)
  where delivery_status is not null;

-- ============================================================
-- 3. Trigger para updated_at em whatsapp_conversations
-- ============================================================
create or replace function update_whatsapp_conversations_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language 'plpgsql';

drop trigger if exists tr_whatsapp_conversations_updated_at on public.whatsapp_conversations;
create trigger tr_whatsapp_conversations_updated_at
  before update on public.whatsapp_conversations
  for each row
  execute function update_whatsapp_conversations_updated_at();
