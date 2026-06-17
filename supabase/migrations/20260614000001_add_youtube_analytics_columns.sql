-- Migration: Adicionar colunas faltantes ao youtube_analytics
-- A migration 20260424210930 usou CREATE TABLE IF NOT EXISTS (no-op pois a tabela já existia)
-- Estas colunas estavam na definição original mas nunca foram materializadas

ALTER TABLE public.youtube_analytics ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.youtube_analytics ADD COLUMN IF NOT EXISTS shares BIGINT DEFAULT 0;
ALTER TABLE public.youtube_analytics ADD COLUMN IF NOT EXISTS estimated_minutes_watched BIGINT DEFAULT 0;

-- Popular title dos registros existentes a partir do metadata JSONB
UPDATE public.youtube_analytics
SET title = metadata->>'title'
WHERE title IS NULL AND metadata ? 'title';

-- Criar tabela de origens de tráfego do YouTube (para uso futuro com YouTube Analytics API)
CREATE TABLE IF NOT EXISTS public.youtube_traffic_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT,
  date DATE NOT NULL,
  source_name TEXT NOT NULL,
  views BIGINT DEFAULT 0,
  watch_time_minutes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_traffic_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_traffic_sources' AND policyname = 'yt_traffic_select') THEN
    CREATE POLICY yt_traffic_select ON public.youtube_traffic_sources FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_traffic_sources' AND policyname = 'yt_traffic_insert') THEN
    CREATE POLICY yt_traffic_insert ON public.youtube_traffic_sources FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_traffic_sources' AND policyname = 'yt_traffic_update') THEN
    CREATE POLICY yt_traffic_update ON public.youtube_traffic_sources FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'youtube_traffic_sources' AND policyname = 'yt_traffic_service') THEN
    CREATE POLICY yt_traffic_service ON public.youtube_traffic_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_yt_traffic_user_date ON public.youtube_traffic_sources (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_yt_traffic_video ON public.youtube_traffic_sources (video_id);
