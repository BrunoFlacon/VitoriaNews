-- Adicionar coluna target se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='advanced_themes' AND column_name='target') THEN
        ALTER TABLE advanced_themes ADD COLUMN target text DEFAULT 'dashboard';
    END IF;
END $$;

-- Adicionar coluna is_home em news_pages se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='news_pages' AND column_name='is_home') THEN
        ALTER TABLE news_pages ADD COLUMN is_home boolean DEFAULT false;
    END IF;
END $$;

-- Adicionar coluna target em system_settings se não existir (para temas)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='system_settings' AND column_name='target') THEN
        ALTER TABLE system_settings ADD COLUMN target text DEFAULT 'dashboard';
    END IF;
END $$;
