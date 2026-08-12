-- ============================================================
-- Migration: Create whatsapp_communities and related tables
-- Replaces MOCK_COMMUNITIES in WhatsAppCommunitiesTab.tsx
-- All statements are idempotent (IF NOT EXISTS)
-- ============================================================

-- 1. whatsapp_communities
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

-- 2. whatsapp_community_members (associative: members of a community)
CREATE TABLE IF NOT EXISTS public.whatsapp_community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.whatsapp_communities(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  wa_id TEXT,                          -- WhatsApp number of the member
  name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index (functional) — PostgreSQL requires separate index for expressions
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

-- 3. whatsapp_community_groups (groups inside a community)
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

-- 4. Trigger for updated_at in whatsapp_communities
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
