-- ============================================================
-- RUN ALL FIXES — Execute this no SQL Editor do Supabase
-- Ordem correta: 10 → 11 → 12 → 99
-- ============================================================

-- ============================================================
-- 1. Migration 20260706000010: Communities
-- ============================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  photo_url TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_communities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'whatsapp_communities'
    AND policyname = 'Users manage own communities'
  ) THEN
    CREATE POLICY "Users manage own communities"
      ON public.whatsapp_communities
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_communities_user
  ON public.whatsapp_communities (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.whatsapp_communities(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  wa_id TEXT,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_community_members_unique
  ON public.whatsapp_community_members (community_id, COALESCE(CAST(contact_id AS TEXT), wa_id, ''));

ALTER TABLE public.whatsapp_community_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'whatsapp_community_members'
    AND policyname = 'Users manage own community members'
  ) THEN
    CREATE POLICY "Users manage own community members"
      ON public.whatsapp_community_members
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.whatsapp_communities WHERE id = community_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.whatsapp_communities WHERE id = community_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_community_members_community
  ON public.whatsapp_community_members (community_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.whatsapp_communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, name)
);

ALTER TABLE public.whatsapp_community_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'whatsapp_community_groups'
    AND policyname = 'Users manage own community groups'
  ) THEN
    CREATE POLICY "Users manage own community groups"
      ON public.whatsapp_community_groups
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.whatsapp_communities WHERE id = community_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.whatsapp_communities WHERE id = community_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_community_groups_community
  ON public.whatsapp_community_groups (community_id);

CREATE OR REPLACE FUNCTION update_whatsapp_communities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_whatsapp_communities_updated_at ON public.whatsapp_communities;
CREATE TRIGGER tr_whatsapp_communities_updated_at
  BEFORE UPDATE ON public.whatsapp_communities
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_communities_updated_at();

-- ============================================================
-- 2. Migration 20260706000011: Statuses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE SET NULL,
  contact_wa_id TEXT,
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

-- NOTE: Partial index with WHERE expires_at > now() not possible
-- (now() is STABLE, not IMMUTABLE). Expired filtered at query time.

-- ============================================================
-- 3. Migration 20260706000012: Pinned, Muted, Disappearing
-- ============================================================
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_pinned
  ON public.whatsapp_conversations (user_id, updated_at DESC)
  WHERE is_pinned = true;

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS disappearing_mode BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS disappearing_duration INTEGER NOT NULL DEFAULT 86400;

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'archived', 'left_group'));

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

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

-- ============================================================
-- 4. Adicionar tabelas à publicação supabase_realtime
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tables_to_add TEXT[] := ARRAY[
    'whatsapp_communities',
    'whatsapp_community_members',
    'whatsapp_community_groups',
    'whatsapp_statuses'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_add
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND tablename = tbl
      AND schemaname = 'public'
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- ✅ FEITO! Todas as migrações aplicadas com sucesso.
-- ============================================================
