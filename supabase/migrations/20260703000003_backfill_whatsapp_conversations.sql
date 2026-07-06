-- ============================================================
-- Migration: Backfill missing whatsapp_conversations from orphaned
-- WhatsApp messages, and add a trigger to auto-create conversations
-- on INSERT into messages (safety net).
-- ============================================================

-- 1. Backfill: Create whatsapp_conversations for messages that have
--    platform='whatsapp' but no matching conversation row.
--    Only creates for contacts that have a received or sent message.
INSERT INTO public.whatsapp_conversations (
  user_id, connection_id, contact_wa_id, contact_name,
  last_message_preview, last_message_at, unread_count, created_at
)
SELECT DISTINCT ON (m.recipient_phone, conn.id)
  m.user_id,
  conn.id AS connection_id,
  m.recipient_phone AS contact_wa_id,
  COALESCE(m.recipient_name, m.recipient_phone) AS contact_name,
  m.content AS last_message_preview,
  m.created_at AS last_message_at,
  0 AS unread_count,
  LEAST(m.created_at, NOW()) AS created_at
FROM public.messages m
JOIN public.social_connections conn
  ON conn.platform = 'whatsapp'
  AND conn.user_id = m.user_id
  AND conn.phone_number_id IS NOT NULL
WHERE m.platform = 'whatsapp'
  AND m.recipient_phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    WHERE wc.contact_wa_id = m.recipient_phone
      AND wc.connection_id = conn.id
  )
ORDER BY m.recipient_phone, conn.id, m.created_at DESC;

-- 2. Link orphaned messages to the newly created conversations
UPDATE public.messages m
SET conversation_id = wc.id
FROM public.whatsapp_conversations wc
WHERE m.platform = 'whatsapp'
  AND m.recipient_phone = wc.contact_wa_id
  AND m.conversation_id IS NULL
  AND wc.connection_id IN (
    SELECT id FROM public.social_connections WHERE platform = 'whatsapp'
  );

-- 3. Trigger function: auto-create whatsapp_conversation when a WhatsApp
--    message is inserted without a matching conversation
CREATE OR REPLACE FUNCTION public.ensure_whatsapp_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conn_id UUID;
  v_conv_id UUID;
BEGIN
  IF NEW.platform <> 'whatsapp' OR NEW.recipient_phone IS NULL THEN
    RETURN NEW;
  END IF;

  -- If conversation_id already set, just update the preview
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE public.whatsapp_conversations
    SET last_message_preview = NEW.content,
        last_message_at = NEW.created_at,
        contact_name = COALESCE(NEW.recipient_name, contact_name)
    WHERE id = NEW.conversation_id;
    RETURN NEW;
  END IF;

  -- Try to find existing conversation
  SELECT wc.id, wc.connection_id INTO v_conv_id, v_conn_id
  FROM public.whatsapp_conversations wc
  WHERE wc.contact_wa_id = NEW.recipient_phone
    AND wc.user_id = NEW.user_id
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.whatsapp_conversations
    SET last_message_preview = NEW.content,
        last_message_at = NEW.created_at,
        contact_name = COALESCE(NEW.recipient_name, contact_name)
    WHERE id = v_conv_id;
    NEW.conversation_id := v_conv_id;
    RETURN NEW;
  END IF;

  -- Find connection by phone_number_id or user_id
  SELECT id INTO v_conn_id
  FROM public.social_connections
  WHERE platform = 'whatsapp'
    AND (phone_number_id IS NOT NULL OR user_id = NEW.user_id)
  ORDER BY phone_number_id NULLS LAST
  LIMIT 1;

  IF v_conn_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create new conversation
  INSERT INTO public.whatsapp_conversations (
    user_id, connection_id, contact_wa_id, contact_name,
    last_message_preview, last_message_at, unread_count
  ) VALUES (
    NEW.user_id, v_conn_id, NEW.recipient_phone,
    COALESCE(NEW.recipient_name, NEW.recipient_phone),
    NEW.content, NEW.created_at, 0
  )
  RETURNING id INTO v_conv_id;

  NEW.conversation_id := v_conv_id;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then recreate
DROP TRIGGER IF EXISTS tr_ensure_whatsapp_conversation ON public.messages;
CREATE TRIGGER tr_ensure_whatsapp_conversation
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.platform = 'whatsapp')
  EXECUTE FUNCTION public.ensure_whatsapp_conversation();
