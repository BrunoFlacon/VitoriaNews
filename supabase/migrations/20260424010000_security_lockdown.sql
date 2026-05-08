
-- ============================================================
-- Migração: Security Lockdown & Schema Hardening
-- Data: 2026-04-24
-- ============================================================

-- 1. Mover pg_net para schema extensions (Segurança de Rede)
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
END $$;

-- Atualizar search_path para funções que usam net.http_post
-- (O search_path já foi fixado em migrações anteriores, mas garantimos que 'extensions' esteja lá)
ALTER FUNCTION public.publish_to_x(text) SET search_path = public, extensions;
ALTER FUNCTION public.publish_to_telegram(text) SET search_path = public, extensions;

-- 2. Restringir system_settings (Apenas service_role ou leitura autenticada mínima)
-- Atualmente está 'USING (true)' para SELECT, INSERT, UPDATE. Isso é perigoso.
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Usuários anônimos podem ler APENAS configurações públicas (SEO e Geral)
CREATE POLICY "ss_select_public" ON public.system_settings 
  FOR SELECT TO anon 
  USING ("group" IN ('seo', 'general'));

-- Usuários autenticados podem LER todas as configurações (necessário para o Dashboard)
CREATE POLICY "ss_select_authenticated" ON public.system_settings 
  FOR SELECT TO authenticated 
  USING (true);

-- APENAS administradores podem INSERIR ou ATUALIZAR via Dashboard
-- (Baseado na tabela user_roles para garantir zero-trust)
CREATE POLICY "ss_write_admin" ON public.system_settings 
  FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'master')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'master')));

-- 3. Validação de Dados e Constraints (Proteção contra Injeção/Sujeira)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_name_check,
  ADD CONSTRAINT profiles_name_check CHECK (char_length(name) >= 2 AND char_length(name) <= 100);

ALTER TABLE public.bot_settings
  ADD CONSTRAINT bot_token_length CHECK (bot_token IS NULL OR char_length(bot_token) > 10),
  ADD CONSTRAINT platform_check CHECK (platform IN ('telegram', 'whatsapp', 'discord', 'slack'));

-- 4. Proteção Adicional contra Senhas Vazadas (HIBP)
-- Esta configuração é feita via Supabase Auth Settings, mas registramos o requisito aqui.
-- TODO: Verificar via painel Supabase se 'Password HIBP' está ativado.
