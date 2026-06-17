-- EXPANSÃO DE BRANDS (IDENTIDADE VISUAL COMPLETA)
-- Adiciona suporte a paleta de cores estendida e tipografia customizada

DO $$ 
BEGIN 
    -- Cores Adicionais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='highlight_color') THEN
        ALTER TABLE public.brands ADD COLUMN highlight_color TEXT DEFAULT '#8B5CF6';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='background_color') THEN
        ALTER TABLE public.brands ADD COLUMN background_color TEXT DEFAULT '#000000';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='text_color') THEN
        ALTER TABLE public.brands ADD COLUMN text_color TEXT DEFAULT '#ffffff';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='muted_color') THEN
        ALTER TABLE public.brands ADD COLUMN muted_color TEXT DEFAULT '#94A3B8';
    END IF;

    -- Tipografia
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='principal_font') THEN
        ALTER TABLE public.brands ADD COLUMN principal_font TEXT DEFAULT 'Inter';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='heading_font') THEN
        ALTER TABLE public.brands ADD COLUMN heading_font TEXT DEFAULT 'Space Grotesk';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='body_font') THEN
        ALTER TABLE public.brands ADD COLUMN body_font TEXT DEFAULT 'Inter';
    END IF;

    -- Campos de descrição/IA
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='description') THEN
        ALTER TABLE public.brands ADD COLUMN description TEXT;
    END IF;
END $$;
