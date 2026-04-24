-- ============================================================
-- Migração: Adicionar colunas faltantes para o Portal e Dashboard
-- Data: 2026-04-24
-- ============================================================

-- 1. Garantir que system_settings tenha todas as colunas necessárias
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS "group" TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_image_url TEXT,
  ADD COLUMN IF NOT EXISTS site_url TEXT,
  ADD COLUMN IF NOT EXISTS platform_name TEXT DEFAULT 'Vitória Net',
  ADD COLUMN IF NOT EXISTS portal_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_analytics_id TEXT,
  ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS custom_scripts TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Garantir que advanced_themes existe e tem as colunas necessárias
CREATE TABLE IF NOT EXISTS public.advanced_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Tema Padrão',
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para advanced_themes
ALTER TABLE public.advanced_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "at_select" ON public.advanced_themes;
DROP POLICY IF EXISTS "at_insert" ON public.advanced_themes;
DROP POLICY IF EXISTS "at_update" ON public.advanced_themes;
DROP POLICY IF EXISTS "at_delete" ON public.advanced_themes;

CREATE POLICY "at_select" ON public.advanced_themes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "at_insert" ON public.advanced_themes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "at_update" ON public.advanced_themes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "at_delete" ON public.advanced_themes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Garantir que bot_settings existe
CREATE TABLE IF NOT EXISTS public.bot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  bot_token TEXT,
  bot_username TEXT,
  is_active BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bs_select" ON public.bot_settings;
DROP POLICY IF EXISTS "bs_insert" ON public.bot_settings;
DROP POLICY IF EXISTS "bs_update" ON public.bot_settings;
DROP POLICY IF EXISTS "bs_delete" ON public.bot_settings;

CREATE POLICY "bs_select" ON public.bot_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bs_insert" ON public.bot_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bs_update" ON public.bot_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bs_delete" ON public.bot_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Garantir que news_pages e news_blocks existem para o Portal
CREATE TABLE IF NOT EXISTS public.news_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  is_home BOOLEAN DEFAULT false,
  visibility_tier TEXT DEFAULT 'public',
  redirect_url TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS para system_settings (admin only)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ss_select" ON public.system_settings;
DROP POLICY IF EXISTS "ss_insert" ON public.system_settings;
DROP POLICY IF EXISTS "ss_update" ON public.system_settings;

CREATE POLICY "ss_select" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ss_insert" ON public.system_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ss_update" ON public.system_settings FOR UPDATE TO authenticated USING (true);
