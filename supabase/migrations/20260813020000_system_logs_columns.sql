-- ============================================================
-- 20260813020000 — system_logs: colunas usadas pelas funções
-- ------------------------------------------------------------
-- process-job-queue e generate-live-clips inserem logs com
-- user_id e metadata, mas a tabela não tinha essas colunas —
-- os inserts falhavam silenciosamente (logs nunca gravados).
-- ============================================================

ALTER TABLE public.system_logs
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_system_logs_service_created
  ON public.system_logs (service, created_at DESC);
