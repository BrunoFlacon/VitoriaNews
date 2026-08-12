-- ============================================================
-- Fix: Enable RLS on tables where it was missing
-- Auditoria: 4 tabelas encontradas sem RLS ativado
--   - public.message_templates
--   - public.pipelines
--   - public.tags
--   - public.pipeline_stages
-- ============================================================

-- 1. message_templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'message_templates'
    AND policyname = 'Users manage own message templates'
  ) THEN
    CREATE POLICY "Users manage own message templates" ON public.message_templates
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. pipelines
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pipelines'
    AND policyname = 'Users manage own pipelines'
  ) THEN
    CREATE POLICY "Users manage own pipelines" ON public.pipelines
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3. tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tags'
    AND policyname = 'Users manage own tags'
  ) THEN
    CREATE POLICY "Users manage own tags" ON public.tags
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. pipeline_stages
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pipeline_stages'
    AND policyname = 'Users manage pipeline stages via pipelines'
  ) THEN
    CREATE POLICY "Users manage pipeline stages via pipelines" ON public.pipeline_stages
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.pipelines WHERE id = pipeline_stages.pipeline_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.pipelines WHERE id = pipeline_stages.pipeline_id AND user_id = auth.uid())
      );
  END IF;
END $$;
