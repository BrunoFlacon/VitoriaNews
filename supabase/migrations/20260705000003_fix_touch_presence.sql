-- Fix touch_presence: remove account_id dependency
-- The original function queried profiles.account_id which doesn't exist in this schema
-- (it was from wacrm's multi-tenant setup that wasn't ported)
-- Instead, use NULL for account_id since this is a single-user system

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

  -- Single-user mode: account_id is always NULL
  INSERT INTO public.member_presence (user_id, account_id, status, last_seen_at)
  VALUES (v_user_id, NULL, p_status, now())
  ON CONFLICT (user_id, account_id)
  DO UPDATE SET status = p_status, last_seen_at = now();
END;
$$;

-- Ensure RLS is enabled and policy exists
ALTER TABLE public.member_presence ENABLE ROW LEVEL SECURITY;

-- Recreate policy (idempotent)
DROP POLICY IF EXISTS "Anyone can read member_presence" ON public.member_presence;
CREATE POLICY "Anyone can read member_presence"
  ON public.member_presence
  FOR SELECT
  USING (true);

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.touch_presence TO authenticated;

-- Reload PostgREST schema cache so broadcasts and other new tables are visible
NOTIFY pgrst, 'reload schema';
