-- ============================================================
-- Fix: Create missing broadcasts + broadcast_recipients tables
-- These failed to be created in 20260703000001 because deals
-- failed first (missing contacts), stopping the batch before
-- sections 15-16. The fix migration 20260703000010 did not
-- include these tables.
-- All statements are idempotent
-- ============================================================

-- 1. broadcasts
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'en_US',
  template_variables JSONB,
  audience_filter JSONB,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'broadcasts' AND policyname = 'Users manage own broadcasts'
  ) THEN
    CREATE POLICY "Users manage own broadcasts" ON public.broadcasts
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_broadcasts_user ON public.broadcasts(user_id);

-- 2. broadcast_recipients
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','replied','failed')),
  whatsapp_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_broadcast_recipients_wamid ON public.broadcast_recipients(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'broadcast_recipients' AND policyname = 'Users manage broadcast recipients via broadcasts'
  ) THEN
    CREATE POLICY "Users manage broadcast recipients via broadcasts" ON public.broadcast_recipients
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.broadcasts WHERE id = broadcast_recipients.broadcast_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.broadcasts WHERE id = broadcast_recipients.broadcast_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON public.broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_contact ON public.broadcast_recipients(contact_id);
