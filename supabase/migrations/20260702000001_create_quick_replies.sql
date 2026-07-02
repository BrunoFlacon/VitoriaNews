-- WhatsApp CRM: Respostas rápidas / saved replies
-- Armazena snippets de resposta pré-definidos por usuário/conexão

create table if not exists public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid null references public.social_connections(id) on delete cascade,
  title text not null,
  shortcut text null,
  content text not null,
  category text not null default 'general' check (category in ('general', 'sales', 'support', 'greeting', 'closing', 'custom')),
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_quick_replies_user_shortcut
  on public.quick_replies (user_id, shortcut)
  where shortcut is not null;

create index if not exists idx_quick_replies_user_category
  on public.quick_replies (user_id, category);

create index if not exists idx_quick_replies_connection
  on public.quick_replies (connection_id);

alter table public.quick_replies enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'quick_replies' and policyname = 'Users manage own quick replies') then
    create policy "Users manage own quick replies"
      on public.quick_replies
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.increment_quick_reply_usage()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.quick_replies
  set usage_count = usage_count + 1
  where id = new.id;
  return new;
end;
$$;

alter publication supabase_realtime add table public.quick_replies;
