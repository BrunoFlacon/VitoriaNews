CREATE TABLE IF NOT EXISTS public.google_ads_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  status TEXT,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  cost_micros NUMERIC DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS google_ads_user_campaign_date_unique
  ON public.google_ads_campaigns (user_id, campaign_id, COALESCE(date, '1900-01-01'::date));
CREATE INDEX IF NOT EXISTS google_ads_user_date_idx ON public.google_ads_campaigns (user_id, date DESC);

ALTER TABLE public.google_ads_campaigns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_ads_campaigns' AND policyname = 'google_ads_select') THEN
    CREATE POLICY google_ads_select ON public.google_ads_campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_ads_campaigns' AND policyname = 'google_ads_insert') THEN
    CREATE POLICY google_ads_insert ON public.google_ads_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_ads_campaigns' AND policyname = 'google_ads_update') THEN
    CREATE POLICY google_ads_update ON public.google_ads_campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_ads_campaigns' AND policyname = 'google_ads_delete') THEN
    CREATE POLICY google_ads_delete ON public.google_ads_campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'google_ads_campaigns' AND policyname = 'google_ads_service') THEN
    CREATE POLICY google_ads_service ON public.google_ads_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_google_ads_user' AND table_name = 'google_ads_campaigns') THEN
    ALTER TABLE public.google_ads_campaigns ADD CONSTRAINT fk_google_ads_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.update_google_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS google_ads_set_updated_at ON public.google_ads_campaigns;
CREATE TRIGGER google_ads_set_updated_at
  BEFORE UPDATE ON public.google_ads_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_google_ads_updated_at();
