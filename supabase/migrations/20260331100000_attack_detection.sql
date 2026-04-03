-- Migration for attack detection and power radar expansion

-- Table for coordinated attack events
CREATE TABLE IF NOT EXISTS public.eventos_de_ataque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topico TEXT NOT NULL,
    plataforma TEXT NOT NULL,
    pontuacao_de_intensidade NUMERIC DEFAULT 0,
    padrao_detectado TEXT,
    contas_envolvidas TEXT[] DEFAULT '{}',
    hashtags_relacionadas TEXT[] DEFAULT '{}',
    nivel_de_risco TEXT DEFAULT 'baixo', -- baixo, médio, alto
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure RLS is enabled
ALTER TABLE public.eventos_de_ataque ENABLE ROW LEVEL SECURITY;

-- Policies for eventos_de_ataque
DROP POLICY IF EXISTS "ataque_select" ON public.eventos_de_ataque;
CREATE POLICY "ataque_select" ON public.eventos_de_ataque AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "ataque_insert" ON public.eventos_de_ataque;
CREATE POLICY "ataque_insert" ON public.eventos_de_ataque AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Add user_id to existing intelligence tables if not present
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='political_trends' AND column_name='user_id') THEN
        ALTER TABLE public.political_trends ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='narratives' AND column_name='user_id') THEN
        ALTER TABLE public.narratives ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='viral_campaigns' AND column_name='user_id') THEN
        ALTER TABLE public.viral_campaigns ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repost_suggestions' AND column_name='user_id') THEN
        ALTER TABLE public.repost_suggestions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable Realtime for intelligence tables
-- We check if they are already in publication
DO $$
DECLARE
    pub_exists boolean;
BEGIN
    -- Check if tables are already in publication to avoid errors
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'eventos_de_ataque') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos_de_ataque;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'political_trends') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.political_trends;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'narratives') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.narratives;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'viral_campaigns') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.viral_campaigns;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'repost_suggestions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.repost_suggestions;
    END IF;
END $$;
