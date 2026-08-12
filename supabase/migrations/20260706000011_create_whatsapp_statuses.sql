-- ============================================================
-- Migration: Create whatsapp_statuses table
-- Replaces MOCK_STATUSES in WhatsAppStatusView.tsx
-- All statements are idempotent (IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE SET NULL,
  contact_wa_id TEXT,                   -- WhatsApp number of the contact (NULL = my own status)
  contact_name TEXT,
  photo_url TEXT,
  text_content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'text', 'audio')),
  viewed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_statuses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'whatsapp_statuses'
    AND policyname = 'Users manage own statuses'
  ) THEN
    CREATE POLICY "Users manage own statuses"
      ON public.whatsapp_statuses
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_statuses_user
  ON public.whatsapp_statuses (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_statuses_expires
  ON public.whatsapp_statuses (expires_at);

-- NOTE: Partial index with WHERE expires_at > now() is not possible
-- because now() is STABLE, not IMMUTABLE.
-- Expired statuses are filtered at query time via WHERE expires_at > now()
