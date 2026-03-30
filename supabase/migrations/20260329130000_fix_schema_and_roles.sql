-- Certifica que o tipo app_role existe com as funções necessárias
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'journalist', 'dev_master', 'admin_master');
    END IF;
END $$;

-- Adiciona as funções mestras se o tipo já existir mas não as tiver
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dev_master';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_master';

-- Atualiza a tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_content JSONB DEFAULT '{}'::jsonb;

-- Cria a tabela news_pages
CREATE TABLE IF NOT EXISTS public.news_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    is_home BOOLEAN DEFAULT false,
    content JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Segurança RLS
ALTER TABLE public.news_pages ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'public_read_news_pages') THEN
        CREATE POLICY "public_read_news_pages" ON public.news_pages FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'admin_all_news_pages') THEN
        CREATE POLICY "admin_all_news_pages" ON public.news_pages FOR ALL USING (true);
    END IF;
END $$;
