-- Create missing automations tables
-- The original migration (20260703000001_merge_wacrm_crm_tables) is marked as applied
-- but the automations section was apparently not executed.
-- This migration re-creates those tables if they don't exist.

-- 1. automations
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'automations' AND policyname = 'Users manage own automations'
  ) THEN
    CREATE POLICY "Users manage own automations" ON public.automations
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_automations_user ON public.automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_active ON public.automations(is_active) WHERE is_active = TRUE;

-- 2. automation_steps
CREATE TABLE IF NOT EXISTS public.automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES public.automation_steps(id) ON DELETE CASCADE,
  branch TEXT CHECK (branch IN ('yes','no')),
  step_type TEXT NOT NULL,
  step_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_automation_steps_automation_position ON public.automation_steps(automation_id, position);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'automation_steps' AND policyname = 'Users manage automation steps via automations'
  ) THEN
    CREATE POLICY "Users manage automation steps via automations" ON public.automation_steps
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.automations WHERE id = automation_steps.automation_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.automations WHERE id = automation_steps.automation_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- 3. automation_logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  trigger_event TEXT NOT NULL,
  steps_executed JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('success','partial','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'automation_logs' AND policyname = 'Users view own automation logs'
  ) THEN
    CREATE POLICY "Users view own automation logs" ON public.automation_logs
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON public.automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user ON public.automation_logs(user_id);

-- 4. automation_pending_executions
CREATE TABLE IF NOT EXISTS public.automation_pending_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  log_id UUID REFERENCES public.automation_logs(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES public.automation_steps(id) ON DELETE SET NULL,
  branch TEXT CHECK (branch IN ('yes','no')),
  next_step_position INTEGER NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  run_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automation_pending_executions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'automation_pending_executions' AND policyname = 'Users manage pending executions'
  ) THEN
    CREATE POLICY "Users manage pending executions" ON public.automation_pending_executions
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
