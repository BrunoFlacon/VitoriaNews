-- -------------------------------------------------------------
-- [SECURITY PATCH] Zero-Trust Lockdown of Intelligence and Articles
-- -------------------------------------------------------------

-- 1. Revogar as falcatruas abertas do schema de inteligência para 'anon'
-- Essa migration anterior autorizou leitura crua (endpoint exposto)

REVOKE SELECT ON public.competitor_intel FROM anon;
REVOKE SELECT ON public.trends FROM anon;
REVOKE SELECT ON public.influence_nodes FROM anon;
REVOKE SELECT ON public.narratives FROM anon;
REVOKE SELECT ON public.viral_campaigns FROM anon;
REVOKE SELECT ON public.eventos_de_ataque FROM anon;
REVOKE SELECT ON public.repost_suggestions FROM anon;

-- 2. Limpar qualquer falha RLS e garantir 'authenticated' como base mandatória
-- Drop do uso anon na politica
DROP POLICY IF EXISTS "articles_public_read" ON public.articles;

DO $$ 
BEGIN
    -- Se a politica articles_authenticated_read não existe, recriaremos para garantir leitura sob AUTH.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'articles' AND policyname = 'articles_authenticated_read') THEN
        CREATE POLICY "articles_authenticated_read" ON public.articles FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    
    -- Impor a mesma trava aos Documentos Globais
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_public_read') THEN
        DROP POLICY "documents_public_read" ON public.documents;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_authenticated_read') THEN
        CREATE POLICY "documents_authenticated_read" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;
