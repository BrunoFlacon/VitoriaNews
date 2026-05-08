-- ============================================================
-- Migração: Segurança Dinâmica (Habilitar RLS em todas as tabelas)
-- Data: 2026-04-29
-- ============================================================

DO $$ 
DECLARE
    t_record RECORD;
    has_user_id BOOLEAN;
    has_policies BOOLEAN;
BEGIN
    -- Loop through all tables in the public schema
    FOR t_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_record.tablename);

        -- Check if table has a user_id column
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = t_record.tablename 
              AND column_name = 'user_id'
        ) INTO has_user_id;

        -- Check if table already has policies
        SELECT EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = t_record.tablename
        ) INTO has_policies;

        -- If no policies exist, create safe defaults based on schema
        IF NOT has_policies THEN
            IF has_user_id THEN
                -- Safe default for user-owned tables
                EXECUTE format(
                    'CREATE POLICY "Usuários gerenciam seus próprios dados em %I" ON public.%I FOR ALL USING (auth.uid() = user_id);',
                    t_record.tablename, t_record.tablename
                );
            ELSE
                -- Safe default for public/system tables (Read-only for authenticated)
                EXECUTE format(
                    'CREATE POLICY "Acesso de leitura autenticado em %I" ON public.%I FOR SELECT TO authenticated USING (true);',
                    t_record.tablename, t_record.tablename
                );
                
                -- Admins can manage these via existing service role (bypasses RLS) or specific roles.
                -- To keep it simple, we only grant SELECT to authenticated users.
            END IF;
        END IF;

    END LOOP;
END $$;
