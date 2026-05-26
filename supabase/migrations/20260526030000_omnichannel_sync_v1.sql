-- OMNICHANNEL SYNC SYSTEM V1
-- Este script cria a infraestrutura para sincronização histórica e polling 4h.

-- 1. Limpeza de segurança (opcional, mas evita conflitos de tipos em atualizações)
-- DROP TABLE IF EXISTS public.social_sync_tasks CASCADE;

-- 2. Tabela de controle de sincronização
CREATE TABLE IF NOT EXISTS public.social_sync_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    connection_id UUID REFERENCES public.social_connections(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('historical_15d', 'polling_4h', 'manual')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'paused')),
    days_offset INTEGER DEFAULT 0, -- Para histórico de 15 dias (0 = hoje, 15 = 15 dias atrás)
    last_sync_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    error_log TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.social_sync_tasks ENABLE ROW LEVEL SECURITY;

-- 4. Permissões de Acesso (CRÍTICO para PostgREST)
GRANT ALL ON TABLE public.social_sync_tasks TO postgres, service_role, authenticated;
GRANT SELECT ON TABLE public.social_sync_tasks TO anon;

-- 5. Políticas de acesso (usuários veem apenas suas próprias tarefas via join com social_connections)
DROP POLICY IF EXISTS "Users can view their own sync tasks" ON public.social_sync_tasks;
CREATE POLICY "Users can view their own sync tasks" ON public.social_sync_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.social_connections 
            WHERE id = social_sync_tasks.connection_id 
            AND user_id = auth.uid()
        )
    );

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_social_sync_tasks_updated_at ON public.social_sync_tasks;
CREATE TRIGGER set_social_sync_tasks_updated_at
    BEFORE UPDATE ON public.social_sync_tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Função para inicializar tarefas de sincronização para novas conexões
CREATE OR REPLACE FUNCTION public.initialize_sync_tasks()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar tarefa de histórico de 15 dias (se ainda não existir para esta conexão)
    IF NOT EXISTS (SELECT 1 FROM public.social_sync_tasks WHERE connection_id = NEW.id AND sync_type = 'historical_15d') THEN
        INSERT INTO public.social_sync_tasks (platform, connection_id, sync_type, status, days_offset)
        VALUES (NEW.platform, NEW.id, 'historical_15d', 'pending', 15);
    END IF;

    -- Criar tarefa de polling regular (se ainda não existir)
    IF NOT EXISTS (SELECT 1 FROM public.social_sync_tasks WHERE connection_id = NEW.id AND sync_type = 'polling_4h') THEN
        INSERT INTO public.social_sync_tasks (platform, connection_id, sync_type, status, next_sync_at)
        VALUES (NEW.platform, NEW.id, 'polling_4h', 'pending', now() + interval '4 hours');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para inicialização automática
DROP TRIGGER IF EXISTS tr_initialize_sync_on_connection ON public.social_connections;
CREATE TRIGGER tr_initialize_sync_on_connection
    AFTER INSERT ON public.social_connections
    FOR EACH ROW EXECUTE FUNCTION public.initialize_sync_tasks();

-- 8. Comentários para documentação
COMMENT ON TABLE public.social_sync_tasks IS 'Gerencia o estado de sincronização histórica e periódica de métricas de redes sociais.';
