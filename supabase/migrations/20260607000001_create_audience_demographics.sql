-- Create audience_demographics table for real API demographic data
CREATE TABLE IF NOT EXISTS public.audience_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_user_id TEXT,
  age_groups JSONB DEFAULT '[]'::jsonb,
  gender JSONB DEFAULT '[]'::jsonb,
  devices JSONB DEFAULT '[]'::jsonb,
  top_cities JSONB DEFAULT '[]'::jsonb,
  top_countries JSONB DEFAULT '[]'::jsonb,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audience_demographics_user
  ON public.audience_demographics(user_id, platform, collected_at DESC);

ALTER TABLE public.audience_demographics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own audience demographics" ON public.audience_demographics;
CREATE POLICY "Users manage own audience demographics"
  ON public.audience_demographics
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'audience_demographics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audience_demographics;
  END IF;
END $$;
