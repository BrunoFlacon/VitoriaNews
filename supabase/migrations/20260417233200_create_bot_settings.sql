-- Migração para criação da tabela de configurações do Robô IA
CREATE TABLE IF NOT EXISTS public.bot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'whatsapp', 'telegram', 'instagram', 'facebook', 'threads'
    is_active BOOLEAN DEFAULT false,
    respond_groups BOOLEAN DEFAULT false,
    respond_private BOOLEAN DEFAULT true,
    respond_channels BOOLEAN DEFAULT false,
    respond_broadcast_lists BOOLEAN DEFAULT false,
    respond_comments BOOLEAN DEFAULT false,
    ai_prompt TEXT, -- Contexto geral para a IA
    flow_coordinates JSONB DEFAULT '[]'::jsonb, -- Array de { keyword: string, response: string, category: string }
    behavior_mode TEXT DEFAULT 'hybrid' CHECK (behavior_mode IN ('fixed', 'ai', 'hybrid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, platform)
);

-- Habilitar RLS
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS (Idempotente)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bot_settings' 
        AND policyname = 'Users can manage their own bot settings'
    ) THEN
        CREATE POLICY "Users can manage their own bot settings"
        ON public.bot_settings
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_bot_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_update_bot_settings_updated_at
    BEFORE UPDATE ON public.bot_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_bot_settings_updated_at();
