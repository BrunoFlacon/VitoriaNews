-- 1. Unicidade para system_settings (fundamental para o motor de navegação e RBAC)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_settings_key_unique') THEN
        ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_key_unique UNIQUE (key);
    END IF;
END $$;

-- 2. Adicionar coluna is_home para controle de página inicial do portal
ALTER TABLE public.news_pages ADD COLUMN IF NOT EXISTS is_home boolean DEFAULT false;

-- 3. Adicionar coluna target para o advanced_themes (distinguir Dash de Portal)
ALTER TABLE public.advanced_themes ADD COLUMN IF NOT EXISTS target text DEFAULT 'dashboard';

-- Criar índice para performance no filtro de target
CREATE INDEX IF NOT EXISTS idx_advanced_themes_target ON public.advanced_themes(target);

-- 4. Garantir que o perfil do Bruno tenha acesso às novas abas
INSERT INTO system_settings (key, value, "group", allowed_roles)
VALUES 
  ('sec_theme', 'Estúdio de Temas', 'permissions', '{"admin_master", "dev_master"}'),
  ('sec_cms', 'Páginas & Blocos', 'permissions', '{"admin_master", "dev_master"}'),
  ('sec_footer', 'Config. Rodapé', 'permissions', '{"admin_master", "dev_master"}')
ON CONFLICT (key) DO UPDATE SET allowed_roles = EXCLUDED.allowed_roles;
