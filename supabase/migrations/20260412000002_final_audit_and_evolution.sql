-- Migration: Final Audit Alignment & Evolution History
-- Goal: Fix missing columns, create history table, and secure the database.

-- 1. Tabala de Histórico de Evolução (Timeline)
CREATE TABLE IF NOT EXISTS public.platform_evolution_milestones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    date timestamptz DEFAULT now(),
    title text NOT NULL,
    phase text NOT NULL,
    description text NOT NULL,
    tech_details text, -- Armazena Prompts e Snippets complexos
    is_major_milestone boolean DEFAULT false,
    version text
);

-- 2. Tabela de Logs de Ataque (Radar)
CREATE TABLE IF NOT EXISTS public.attack_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    detected_at timestamptz DEFAULT now(),
    target_platform text,
    attack_type text,
    severity text,
    metadata jsonb
);

-- 3. Alinhamento da Tabela Trends
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trends' AND column_name='url') THEN 
    ALTER TABLE public.trends ADD COLUMN url text; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trends' AND column_name='thumbnail_url') THEN 
    ALTER TABLE public.trends ADD COLUMN thumbnail_url text; 
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='political_trends' AND column_name='thumbnail_url') THEN 
    ALTER TABLE public.political_trends ADD COLUMN thumbnail_url text; 
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='political_trends' AND column_name='description') THEN 
    ALTER TABLE public.political_trends ADD COLUMN description text; 
  END IF;
END $$;

-- 4. Segurança RLS (Row Level Security)
ALTER TABLE public.platform_evolution_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attack_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.political_trends ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura: Apenas usuários autenticados (com papel dev_master via RPC)
CREATE POLICY "Milestones viewable by dev_master" ON public.platform_evolution_milestones
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Attack logs viewable by admin" ON public.attack_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Trends public view" ON public.trends
    FOR SELECT USING (true);

CREATE POLICY "Political trends public view" ON public.political_trends
    FOR SELECT USING (true);

-- 5. Seed de Histórico (Dados reais do repositório)
TRUNCATE TABLE public.platform_evolution_milestones;

INSERT INTO public.platform_evolution_milestones (title, phase, description, tech_details, is_major_milestone, version, date)
VALUES 
('Fundação Intelligence & Core', 'Foundation', 'Nascimento do esquema de dados do Social Canvas Hub, estruturação da inteligência social e armazenamento de posts multiplataforma.', E'CREATE TABLE public.social_intelligence (\n  id UUID PRIMARY KEY,\n  platform TEXT NOT NULL,\n  account_id TEXT\n);', true, '1.0.0', '2024-03-16T10:00:00Z'),

('Hub de Autenticação e Perfis', 'Security', 'Implementação do sistema robusto multipartição de acesso Supabase (RBAC) e sincronia social.', E'CREATE OR REPLACE FUNCTION public.handle_new_user()\nRETURNS TRIGGER AS $$\nBEGIN\n  INSERT INTO public.profiles (id, role) VALUES (new.id, ''viewer'');\nEND;\n$$ LANGUAGE plpgsql;', false, '1.3.0', '2026-03-09T03:00:00Z'),

('Engenharia de Temas Virtuais', 'Design', 'Motor completo de injeção de CSS nativo. Adoção total do glassmorphism e controle de design via interface para o Portal.', E'CREATE TABLE public.platform_themes (\n  id UUID PRIMARY KEY,\n  name TEXT,\n  css_variables JSONB,\n  is_active BOOLEAN\n);\n-- Applied Dark Mode as constraint', true, '1.8.0', '2026-03-29T01:49:00Z'),

('Radar de Poder e News API', 'Intelligence', 'Implantação dos painéis de detecção de tendências políticas e ataques cibernéticos em tempo real.', E'CREATE TABLE public.attack_logs (\n  detected_at TIMESTAMPTZ DEFAULT now(),\n  target_platform TEXT,\n  severity TEXT\n);\nALTER TABLE trends ADD COLUMN url TEXT;', true, '2.4.0', '2026-04-03T18:00:00Z'),

('Vitória Net: Auditoria e Legado', 'Mastery', 'Refinamento do Console de Desenvolvedor, estabilização dos reflows da interface e consolidação final do rodapé unificado.', E'-- System Evolution Lock\nALTER TABLE platform_evolution_milestones ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Master_View" ON platform_evolution_milestones;\n-- Deno environment activated', true, '3.0.0', '2026-04-12T04:30:00Z');
