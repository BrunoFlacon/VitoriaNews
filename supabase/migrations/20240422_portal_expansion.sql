-- Migração Corrigida para Expansão do Portal
-- Data: 2024-04-22

-- 1. Adicionar colunas de controle de acesso e roteamento
ALTER TABLE news_pages 
ADD COLUMN IF NOT EXISTS is_home BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visibility_tier TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS redirect_url TEXT;

ALTER TABLE news_blocks 
ADD COLUMN IF NOT EXISTS visibility_tier TEXT DEFAULT 'public';

-- 2. Garantir que as configurações do sistema suportem o Nome do Portal
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS platform_name TEXT DEFAULT 'Vitória Net',
ADD COLUMN IF NOT EXISTS portal_logo_url TEXT;

-- 3. Injetar Páginas Institucionais Padrão
INSERT INTO news_pages (title, slug, is_home, visibility_tier)
VALUES 
  ('Home', '/', true, 'public'),
  ('Notícias', '/news', false, 'public'),
  ('Artigos', '/artigos', false, 'public'),
  ('Mídia Kit', '/mediakit', false, 'public'),
  ('Bruno Flacon', '/perfil', false, 'public'),
  ('Termos de Uso', '/termos', false, 'public'),
  ('Privacidade', '/privacidade', false, 'public'),
  ('Contato', '/contato', false, 'public')
ON CONFLICT (slug) DO UPDATE 
SET title = EXCLUDED.title, 
    is_home = EXCLUDED.is_home, 
    visibility_tier = EXCLUDED.visibility_tier;

-- 4. Comentários para documentação
COMMENT ON COLUMN news_pages.visibility_tier IS 'Nível de acesso: public, lead, free_sub, paid_sub';
