-- ============================================================
-- Fix: Create missing CRM tables that failed due to contacts
-- not existing when 20260703000001 ran
-- All statements are idempotent
-- ============================================================

-- 1. contacts table (required by contact_notes, contact_tags, deals, whatsapp_conversations)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  company TEXT,
  notes TEXT,
  avatar_url TEXT,
  phone_normalized TEXT GENERATED ALWAYS AS (regexp_replace(COALESCE(phone, ''), '\D', '', 'g')) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Users manage own contacts'
  ) THEN
    CREATE POLICY "Users manage own contacts" ON public.contacts
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_normalized ON public.contacts(phone_normalized);

-- 2. message_reactions (depends on messages + whatsapp_conversations)
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer','agent')),
  actor_id UUID,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, actor_type, actor_id)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_reactions' AND policyname = 'Users manage message reactions via messages'
  ) THEN
    CREATE POLICY "Users manage message reactions via messages" ON public.message_reactions
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.messages WHERE id = message_reactions.message_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.messages WHERE id = message_reactions.message_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_message_reactions_conversation ON public.message_reactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

-- 3. contact_tags (depends on contacts + tags)
CREATE TABLE IF NOT EXISTS public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_tags' AND policyname = 'Users manage contact tags via contacts'
  ) THEN
    CREATE POLICY "Users manage contact tags via contacts" ON public.contact_tags
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.contacts WHERE id = contact_tags.contact_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.contacts WHERE id = contact_tags.contact_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON public.contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON public.contact_tags(tag_id);

-- 4. contact_notes (depends on contacts)
CREATE TABLE IF NOT EXISTS public.contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_notes' AND policyname = 'Users manage own contact notes'
  ) THEN
    CREATE POLICY "Users manage own contact notes" ON public.contact_notes
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON public.contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_user ON public.contact_notes(user_id);

-- 5. deals (depends on contacts, pipelines, pipeline_stages, whatsapp_conversations)
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  notes TEXT,
  expected_close_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','won','lost')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Users manage own deals'
  ) THEN
    CREATE POLICY "Users manage own deals" ON public.deals
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deals_user ON public.deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON public.deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON public.deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage_id);

-- 6. Add CRM columns to whatsapp_conversations if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'contact_id'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN status TEXT DEFAULT 'open' CHECK (status IN ('open','pending','closed'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'assigned_agent_id'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN assigned_agent_id UUID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'ai_autoreply_disabled'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN ai_autoreply_disabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'ai_reply_count'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN ai_reply_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 7. Add CRM columns to messages if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN sender_type TEXT CHECK (sender_type IN ('customer','agent','bot'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN sender_id UUID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN content_type TEXT DEFAULT 'text';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'template_name'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN template_name TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'wa_message_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN wa_message_id TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'reply_to_message_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_wa_message_id ON public.messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
