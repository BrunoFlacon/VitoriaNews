-- Fix member_presence: change PK to user_id only
-- The composite PK (user_id, account_id) makes account_id NOT NULL automatically,
-- but in single-user mode we use NULL for account_id.
-- This migration:
--   1. Drops the composite PK
--   2. Makes user_id the sole PK (account_id remains nullable)
--   3. Updates touch_presence to match
--   4. Reloads PostgREST schema cache

-- Step 1: Drop the existing PK constraint and NOT NULL on account_id
ALTER TABLE public.member_presence DROP CONSTRAINT member_presence_pkey CASCADE;

-- Step 2: Ensure account_id is truly nullable
ALTER TABLE public.member_presence ALTER COLUMN account_id DROP NOT NULL;

-- Step 3: Add PK on user_id only
ALTER TABLE public.member_presence ADD PRIMARY KEY (user_id);

-- Step 4: Update touch_presence (no account_id dependency)
CREATE OR REPLACE FUNCTION public.touch_presence(p_status TEXT DEFAULT 'online')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.member_presence (user_id, account_id, status, last_seen_at)
  VALUES (v_user_id, NULL, p_status, now())
  ON CONFLICT (user_id)
  DO UPDATE SET status = p_status, last_seen_at = now();
END;
$$;

-- Reload PostgREST schema cache so automations and other tables are visible
NOTIFY pgrst, 'reload schema';
