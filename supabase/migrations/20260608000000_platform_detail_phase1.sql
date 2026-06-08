-- Fase 1: Estrutura para Detalhamento por Plataforma
-- Tabela de breakdowns detalhados por post (age/gender/device por plataforma)
-- Complemento 1:1 de post_metrics para dados pesados de breakdown

CREATE TABLE IF NOT EXISTS public.post_metrics_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  platform text NOT NULL,
  external_id text,
  breakdown jsonb DEFAULT '{}'::jsonb,
  collected_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_metrics_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pmd_select" ON public.post_metrics_details
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pmd_insert" ON public.post_metrics_details
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pmd_update" ON public.post_metrics_details
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pmd_delete" ON public.post_metrics_details
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT ALL ON public.post_metrics_details TO authenticated;
GRANT ALL ON public.post_metrics_details TO service_role;

CREATE INDEX IF NOT EXISTS idx_pmd_user_platform ON public.post_metrics_details(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_pmd_post ON public.post_metrics_details(post_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pmd_post_platform ON public.post_metrics_details(post_id, platform)
  WHERE post_id IS NOT NULL;
