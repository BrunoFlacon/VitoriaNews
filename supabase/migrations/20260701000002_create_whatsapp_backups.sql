-- WhatsApp Plano de Correção — FASE 4.B
-- Catálogo de backups + Log de auditoria
-- Totalmente aditivo — não altera tabelas existentes

-- ============================================================
-- 1. whatsapp_backups: catálogo de backups gerados
-- ============================================================
create table if not exists public.whatsapp_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  conversation_id uuid null,             -- null = backup completo do número
  scope text not null check (scope in ('full_number', 'single_conversation')),
  format text not null check (format in ('encrypted_json', 'whatsapp_txt_zip', 'pdf')),
  storage_path text not null,            -- caminho no bucket privado whatsapp-backups
  checksum_sha256 text not null,         -- hash do arquivo final
  encryption_key_id text null,           -- referência à chave usada (null para format='whatsapp_txt_zip' sem senha)
  size_bytes bigint not null default 0,
  message_count integer not null default 0,
  retention_class text not null default 'daily' check (retention_class in ('daily', 'weekly', 'monthly', 'manual_export')),
  expires_at timestamptz null,           -- null = nunca expira (ex.: exportação manual)
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_whatsapp_backups_conn 
  on public.whatsapp_backups (connection_id, created_at desc);
create index if not exists idx_whatsapp_backups_user 
  on public.whatsapp_backups (user_id, created_at desc);
create index if not exists idx_whatsapp_backups_expires 
  on public.whatsapp_backups (expires_at)
  where expires_at is not null;

-- RLS
alter table public.whatsapp_backups enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'whatsapp_backups' 
    and policyname = 'Users manage own backups'
  ) then
    create policy "Users manage own backups"
      on public.whatsapp_backups
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- 2. whatsapp_backup_access_log: auditoria de acesso
-- ============================================================
create table if not exists public.whatsapp_backup_access_log (
  id uuid primary key default gen_random_uuid(),
  backup_id uuid not null references public.whatsapp_backups(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action text not null check (action in ('created', 'downloaded', 'decrypted', 'deleted')),
  ip_address text null,
  created_at timestamptz not null default now()
);

-- Índice para consulta por backup
create index if not exists idx_whatsapp_backup_access_log_backup 
  on public.whatsapp_backup_access_log (backup_id, created_at desc);

-- RLS
alter table public.whatsapp_backup_access_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'whatsapp_backup_access_log' 
    and policyname = 'Users view own backup logs'
  ) then
    create policy "Users view own backup logs"
      on public.whatsapp_backup_access_log
      for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================
-- 3. Bucket de Storage (idempotente via SQL)
-- ============================================================
-- Nota: O bucket precisa ser criado via Supabase Dashboard ou API
-- Mas registramos aqui para documentação:
-- Nome: whatsapp-backups (PRIVADO — não público)
-- Política: apenas service_role pode listar/ler

-- ============================================================
-- 4. Publicação Realtime (se aplicável)
-- ============================================================
alter publication supabase_realtime add table public.whatsapp_backups;
