-- Tabela global para Temas Avançados
CREATE TABLE IF NOT EXISTS public.advanced_themes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL, -- ex: "Padrão do Sistema", "Dark Neon"
  is_active boolean DEFAULT false, -- Apenas um tema pode ser ativo
  is_draft boolean DEFAULT true, -- Quando estiver editando, cria-se um rascunho.
  
  -- Settings JSONs (para permitir infinitas propriedades sem migrações futuras)
  colors jsonb DEFAULT '{}'::jsonb, 
  typography jsonb DEFAULT '{}'::jsonb,
  buttons jsonb DEFAULT '{}'::jsonb,
  shadows jsonb DEFAULT '{}'::jsonb,
  effects jsonb DEFAULT '{}'::jsonb,
  layout jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS e Permissões do advanced_themes
ALTER TABLE public.advanced_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.advanced_themes
  FOR SELECT USING (true);

CREATE POLICY "Enable mutate access for admins and system" ON public.advanced_themes
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE role IN ('dev_master', 'admin_master')
  ));


-- Tabela para Páginas do Portal de Notícias
CREATE TABLE IF NOT EXISTS public.news_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_published boolean DEFAULT false,
  meta_description text,
  meta_image text,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela para Blocos do Portal de Notícias (Relacional à página)
CREATE TABLE IF NOT EXISTS public.news_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid REFERENCES public.news_pages(id) ON DELETE CASCADE,
  type text NOT NULL, -- ex: "header", "hero", "news_grid", "news_carousel", "banner"
  order_index integer NOT NULL DEFAULT 0,
  content jsonb DEFAULT '{}'::jsonb, -- Conteúdo do Bloco (Títulos, links, imagens)
  styles jsonb DEFAULT '{}'::jsonb, -- Estilos Customizados do bloco (Background, bordas, gaps)
  visibility jsonb DEFAULT '{"desktop": true, "mobile": true}'::jsonb,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS e Permissões
ALTER TABLE public.news_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read public news_pages" ON public.news_pages FOR SELECT USING (true);
CREATE POLICY "Enable read public news_blocks" ON public.news_blocks FOR SELECT USING (true);

CREATE POLICY "Enable full access for admins on news_pages" ON public.news_pages
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('dev_master', 'admin_master')));

CREATE POLICY "Enable full access for admins on news_blocks" ON public.news_blocks
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('dev_master', 'admin_master')));

-- Inserir um "Padrão do Sistema" básico (Se não existir)
INSERT INTO public.advanced_themes (name, is_active, is_draft, colors, typography, buttons, layout)
SELECT 
  'Padrão do Sistema', true, false,
  '{"primary": "#ff4c30", "background": "#0f172a", "surface": "#1e293b", "border": "#334155", "text_primary": "#ffffff", "text_secondary": "#94a3b8"}'::jsonb,
  '{"font_family": "Inter", "h1": "2.5rem", "body": "1rem"}'::jsonb,
  '{"radius": "8px", "padding_y": "12px", "padding_x": "24px"}'::jsonb,
  '{"max_width": "1280px"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.advanced_themes WHERE name = 'Padrão do Sistema');
