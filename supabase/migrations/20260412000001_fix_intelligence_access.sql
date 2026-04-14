-- Fix intelligence visibility and force PostgREST cache reload

-- Explicit grants for the intelligence tables
GRANT SELECT ON public.competitor_intel TO anon, authenticated;
GRANT SELECT ON public.trends TO anon, authenticated;
GRANT SELECT ON public.influence_nodes TO anon, authenticated;
GRANT SELECT ON public.narratives TO anon, authenticated;
GRANT SELECT ON public.viral_campaigns TO anon, authenticated;
GRANT SELECT ON public.eventos_de_ataque TO anon, authenticated;
GRANT SELECT ON public.repost_suggestions TO anon, authenticated;

-- Force PostgREST to reload the schema by making a minor change
COMMENT ON TABLE public.competitor_intel IS 'Intelligence data on competitors from social platforms';
COMMENT ON TABLE public.trends IS 'Social media and news trends detected across platforms';
COMMENT ON TABLE public.eventos_de_ataque IS 'Detected coordinated attack patterns or negative narratives';

-- Ensure RLS correctly allows select for authenticated users if not already set
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'competitor_intel' AND policyname = 'Allow select for all authenticated users') THEN
        CREATE POLICY "Allow select for all authenticated users" ON public.competitor_intel FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- Verify if competitor_intel actually has data
-- (Note: This is just SQL, it doesn't affect the logic but helps if anyone checks the DB)
