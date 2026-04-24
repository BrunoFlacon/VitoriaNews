
-- Create trends table for radar/intelligence data
CREATE TABLE IF NOT EXISTS public.trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  keyword TEXT NOT NULL,
  source TEXT,
  sub_source TEXT,
  category TEXT,
  score NUMERIC DEFAULT 0,
  url TEXT,
  thumbnail_url TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trends_detected_at ON public.trends(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_user_id ON public.trends(user_id);

ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trends_select_authenticated"
  ON public.trends FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "trends_service_role_all"
  ON public.trends FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "trends_insert_own"
  ON public.trends FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create political_trends table
CREATE TABLE IF NOT EXISTS public.political_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  mentions INTEGER DEFAULT 0,
  sentiment TEXT DEFAULT 'neutral',
  velocity NUMERIC DEFAULT 0,
  source TEXT,
  category TEXT DEFAULT 'Política',
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_political_trends_detected_at ON public.political_trends(detected_at DESC);

ALTER TABLE public.political_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "political_trends_select_authenticated"
  ON public.political_trends FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "political_trends_service_role_all"
  ON public.political_trends FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Create narratives table (used by radar-api)
CREATE TABLE IF NOT EXISTS public.narratives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sentiment TEXT,
  reach INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "narratives_select_authenticated"
  ON public.narratives FOR SELECT TO authenticated USING (true);

CREATE POLICY "narratives_service_role_all"
  ON public.narratives FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create viral_campaigns table (used by radar-api)
CREATE TABLE IF NOT EXISTS public.viral_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hashtag TEXT,
  reach INTEGER DEFAULT 0,
  velocity NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.viral_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viral_campaigns_select_authenticated"
  ON public.viral_campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "viral_campaigns_service_role_all"
  ON public.viral_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
