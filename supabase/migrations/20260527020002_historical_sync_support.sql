-- Migração: Suporte para o Motor de Abastecimento Histórico (Paginação)
-- Garante que o sistema não perca o ponteiro de onde parou ao buscar anos de posts antigos.

CREATE TABLE IF NOT EXISTS public.historical_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_account_id UUID NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    next_cursor TEXT,           -- Token de paginação ou data limite para buscar os próximos posts
    is_completed BOOLEAN DEFAULT false, -- True quando chegar no primeiro dia do perfil
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb, -- Para guardar erros ou propriedades de rate limit locais
    
    UNIQUE (social_account_id, platform)
);

-- RLS (Habilita RLS por padrão)
ALTER TABLE public.historical_sync_state ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Admins e Servidores gerenciam cursores históricos"
ON public.historical_sync_state
FOR ALL
USING (true) -- Permite leitura e escrita geral temporária para a Edge Function rodar livre, será protegida por service_role na função.
WITH CHECK (true);
