-- Add muted column to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS muted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_muted
  ON public.whatsapp_conversations (muted)
  WHERE muted = true;
