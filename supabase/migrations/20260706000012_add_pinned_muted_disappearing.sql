-- ============================================================
-- Migration: Add is_pinned, muted_until, disappearing_mode,
--             last_read_at to whatsapp_conversations
-- Replaces stub toasts in WhatsAppChatList.tsx / WhatsAppChatWindow.tsx
-- All statements are idempotent (IF NOT EXISTS)
-- ============================================================

-- 1. is_pinned — for pin/unpin conversations
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_pinned
  ON public.whatsapp_conversations (user_id, updated_at DESC)
  WHERE is_pinned = true;

-- 2. muted_until — for "silenciar notificações" (NULL = não silenciado)
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

-- 3. disappearing_mode — for "mensagens temporárias"
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS disappearing_mode BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS disappearing_duration INTEGER NOT NULL DEFAULT 86400; -- seconds (24h)

-- 4. status — add 'left_group' support for leaving groups
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'archived', 'left_group'));

-- 5. last_read_at — for "marcar como lida" control
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

-- 6. RPC function: mark_conversation_read
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET unread_count = 0,
      last_read_at = now()
  WHERE id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;

-- 7. RPC function: toggle_pin_conversation
CREATE OR REPLACE FUNCTION toggle_pin_conversation(p_conversation_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_pinned BOOLEAN;
BEGIN
  UPDATE public.whatsapp_conversations
  SET is_pinned = NOT is_pinned
  WHERE id = p_conversation_id
    AND user_id = auth.uid()
  RETURNING is_pinned INTO v_new_pinned;

  RETURN v_new_pinned;
END;
$$;

-- 8. RPC function: mute_conversation
CREATE OR REPLACE FUNCTION mute_conversation(
  p_conversation_id UUID,
  p_duration_hours INTEGER DEFAULT 8
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_conversations
  SET muted_until = now() + (p_duration_hours || ' hours')::INTERVAL
  WHERE id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;

-- 9. RPC function: toggle_disappearing_mode
CREATE OR REPLACE FUNCTION toggle_disappearing_mode(
  p_conversation_id UUID,
  p_duration INTEGER DEFAULT 86400
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_value BOOLEAN;
BEGIN
  UPDATE public.whatsapp_conversations
  SET disappearing_mode = NOT disappearing_mode,
      disappearing_duration = p_duration
  WHERE id = p_conversation_id
    AND user_id = auth.uid()
  RETURNING disappearing_mode INTO v_new_value;

  RETURN v_new_value;
END;
$$;
