-- EXPANSÃO DE PROJECT_MODULES
-- Adiciona campos para conteúdo, links e controle de gravação

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_modules' AND column_name='content') THEN
        ALTER TABLE public.project_modules ADD COLUMN content TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_modules' AND column_name='drive_link') THEN
        ALTER TABLE public.project_modules ADD COLUMN drive_link TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_modules' AND column_name='is_recorded') THEN
        ALTER TABLE public.project_modules ADD COLUMN is_recorded BOOLEAN DEFAULT false;
    END IF;
END $$;
