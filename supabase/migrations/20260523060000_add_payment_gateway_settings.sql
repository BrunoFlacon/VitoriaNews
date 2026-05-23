-- Migração: Adicionar Colunas de Gateways de Pagamento e Atualizar Políticas RLS
-- Data: 2026-05-23

-- 1. Adicionar colunas para chaves de API e configurações de pagamento na tabela system_settings
ALTER TABLE IF EXISTS public.system_settings 
ADD COLUMN IF NOT EXISTS stripe_public_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_public_key TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT,
ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS portal_plans TEXT,
ADD COLUMN IF NOT EXISTS portal_services TEXT;

-- 2. Atualizar as políticas de segurança RLS para a tabela system_settings
DROP POLICY IF EXISTS "ss_write_admin" ON public.system_settings;

CREATE POLICY "ss_write_admin" ON public.system_settings 
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'master', 'admin_master', 'dev_master', 'dev', 'contador')
    ) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
        AND role IN ('admin_master', 'dev_master', 'admin', 'dev', 'contador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'master', 'admin_master', 'dev_master', 'dev', 'contador')
    ) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
        AND role IN ('admin_master', 'dev_master', 'admin', 'dev', 'contador')
    )
  );
