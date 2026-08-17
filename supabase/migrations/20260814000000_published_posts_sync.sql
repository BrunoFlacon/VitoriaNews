-- ============================================================
-- 20260814000000 — Sincronização editar/apagar posts publicados
-- ------------------------------------------------------------
-- 1) published_posts ganha colunas de estado para a ferramenta
--    de editar/apagar posts (sync com as plataformas).
-- 2) Nova tabela post_sync_log para auditoria de cada operação
--    de edição/exclusão (quando, quem, plataforma, resultado).
-- ============================================================

ALTER TABLE public.published_posts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_published_posts_post_id_platform
  ON public.published_posts (post_id, platform);
CREATE INDEX IF NOT EXISTS idx_published_posts_user_status
  ON public.published_posts (user_id, status);

-- ------------------------------------------------------------
-- Auditoria de operações de sincronização (editar/apagar)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id uuid,
  platform text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('publish', 'update', 'delete')),
  platform_post_id text,
  status text NOT NULL,
  message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_sync_log_user_created
  ON public.post_sync_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_sync_log_post_id
  ON public.post_sync_log (post_id);

ALTER TABLE public.post_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam seus próprios dados em post_sync_log" ON public.post_sync_log;
CREATE POLICY "Usuários gerenciam seus próprios dados em post_sync_log"
  ON public.post_sync_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
