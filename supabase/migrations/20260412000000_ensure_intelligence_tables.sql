-- Ensure intelligence hub tables exist and have proper RLS

-- narratives table
CREATE TABLE IF NOT EXISTS public.narratives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    dominance_score NUMERIC DEFAULT 0,
    sentiment TEXT CHECK (sentiment IN ('positivo', 'negativo', 'neutro')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- viral_campaigns table
CREATE TABLE IF NOT EXISTS public.viral_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    platforms TEXT[] DEFAULT '{}',
    intensity_score NUMERIC DEFAULT 0,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- eventos_de_ataque table
CREATE TABLE IF NOT EXISTS public.eventos_de_ataque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topico TEXT NOT NULL,
    nivel_de_risco TEXT CHECK (nivel_de_risco IN ('baixo', 'medio', 'alto')),
    padrao_detectado TEXT,
    pontuacao_de_intensidade INTEGER DEFAULT 0,
    contas_envolvidas TEXT[] DEFAULT '{}',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- repost_suggestions table
CREATE TABLE IF NOT EXISTS public.repost_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_post_id TEXT,
    target_platform TEXT NOT NULL,
    suggested_content TEXT,
    reasons TEXT[],
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'editing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- influence_nodes table
CREATE TABLE IF NOT EXISTS public.influence_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    platform TEXT NOT NULL,
    influence_score NUMERIC DEFAULT 0,
    engagement_rate NUMERIC DEFAULT 0,
    followers INTEGER DEFAULT 0,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(username, platform)
);

-- competitor_intel table (already added in 20260403180000, but ensuring RLS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'competitor_intel') THEN
        CREATE TABLE public.competitor_intel (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            competitor_name TEXT NOT NULL,
            platform TEXT NOT NULL,
            followers_count INTEGER DEFAULT 0,
            engagement_rate NUMERIC DEFAULT 0,
            top_mentions TEXT[],
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            UNIQUE(competitor_name, platform)
        );
    END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viral_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_de_ataque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repost_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influence_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_intel ENABLE ROW LEVEL SECURITY;

-- Create Policies (assuming authenticated users can read all intelligence data)
DO $$ 
BEGIN
    -- Narratives
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_read_narratives') THEN
        CREATE POLICY "authenticated_read_narratives" ON public.narratives FOR SELECT TO authenticated USING (true);
    END IF;
    
    -- Viral Campaigns
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_read_campaigns') THEN
        CREATE POLICY "authenticated_read_campaigns" ON public.viral_campaigns FOR SELECT TO authenticated USING (true);
    END IF;

    -- Attacks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_read_attacks') THEN
        CREATE POLICY "authenticated_read_attacks" ON public.eventos_de_ataque FOR SELECT TO authenticated USING (true);
    END IF;

    -- Repost Suggestions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_read_suggestions') THEN
        CREATE POLICY "authenticated_read_suggestions" ON public.repost_suggestions FOR SELECT TO authenticated USING (true);
    END IF;

    -- Influence Nodes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_read_nodes') THEN
        CREATE POLICY "authenticated_read_nodes" ON public.influence_nodes FOR SELECT TO authenticated USING (true);
    END IF;

    -- Competitor Intel
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_read_competitors') THEN
        CREATE POLICY "authenticated_read_competitors" ON public.competitor_intel FOR SELECT TO authenticated USING (true);
    END IF;

END $$;
