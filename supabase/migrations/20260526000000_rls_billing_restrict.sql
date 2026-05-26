 -- ============================================================
-- Migração: Restrição de Acesso a Faturamento e Assinantes
-- Data: 2026-05-26
-- ============================================================
-- Objetivo:
--   1. system_settings: só dev_master, admin_master, admin, dev, contador podem LER
--   2. portal_subscribers: só esses roles podem SELECT/UPDATE
--   3. Mantém public INSERT para formulários de inscrição no portal
-- ============================================================

-- ─── 1. system_settings ─────────────────────────────────────
-- Remove política permissiva que permitia QUALQUER autenticado LER
-- inclusive efi_client_secret, efi_certificate, etc.
DROP POLICY IF EXISTS "ss_select_authenticated" ON public.system_settings;
DROP POLICY IF EXISTS "ss_select_authorized" ON public.system_settings;

-- Cria política restrita: só roles autorizados podem SELECT
CREATE POLICY "ss_select_authorized" ON public.system_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('dev_master', 'admin_master', 'admin', 'dev', 'contador')
    )
  );

-- Mantém política pública para leitura de seções abertas (seo, general)
-- (já existe: ss_select_public)

-- Atualiza política de escrita para usar mesmos roles (já deve estar correta,
-- mas garantimos consistência)
DROP POLICY IF EXISTS "ss_write_admin" ON public.system_settings;

CREATE POLICY "ss_write_admin" ON public.system_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('dev_master', 'admin_master', 'admin', 'dev', 'contador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('dev_master', 'admin_master', 'admin', 'dev', 'contador')
    )
  );

-- ─── 2. portal_subscribers ──────────────────────────────────
-- Remove políticas permissivas
DROP POLICY IF EXISTS "Allow authenticated staff to read subscribers" ON public.portal_subscribers;
DROP POLICY IF EXISTS "Allow staff to update subscribers" ON public.portal_subscribers;

-- Remove política pública de update (não é segura para dados PII)
DROP POLICY IF EXISTS "Allow public update for subscriptions" ON public.portal_subscribers;

DROP POLICY IF EXISTS "ps_select_authorized" ON public.portal_subscribers;
DROP POLICY IF EXISTS "ps_update_authorized" ON public.portal_subscribers;

-- Cria política SELECT restrita a roles autorizados
CREATE POLICY "ps_select_authorized" ON public.portal_subscribers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('dev_master', 'admin_master', 'admin', 'dev', 'contador')
    )
  );

-- Cria política UPDATE restrita a roles autorizados
CREATE POLICY "ps_update_authorized" ON public.portal_subscribers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('dev_master', 'admin_master', 'admin', 'dev', 'contador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role IN ('dev_master', 'admin_master', 'admin', 'dev', 'contador')
    )
  );

-- Mantém INSERT público para formulários de lead no portal
-- (já existe: "Allow public insert for subscriptions")

-- ─── 3. Atualiza política de subscriptions (já usa email) ──
-- Mantém como está — usuários veem apenas próprias assinaturas por email
