-- Migration: Criar tabela de Leads Seguros do Media Kit
CREATE TABLE IF NOT EXISTS public.media_kit_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.media_kit_leads ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Todos (anônimos inclusive) podem inserir
CREATE POLICY "Qualquer pessoa pode enviar contato do media kit" 
ON public.media_kit_leads 
FOR INSERT 
WITH CHECK (true);

-- Apenas Admin/Dev_Master podem visualizar
CREATE POLICY "Admins e Devs podem ler leads"
ON public.media_kit_leads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'dev_master')
  )
);
