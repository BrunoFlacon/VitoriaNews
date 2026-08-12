-- ============================================================
-- Fix: Adiciona tabelas à publicação supabase_realtime 
-- de forma segura (idempotente)
-- Resolve erro 42710 das migrations antigas
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  tables_to_add TEXT[] := ARRAY[
    'whatsapp_conversations',
    'whatsapp_communities',
    'whatsapp_community_members',
    'whatsapp_community_groups',
    'whatsapp_statuses'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_add
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND tablename = tbl
      AND schemaname = 'public'
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
