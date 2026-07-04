-- Member presence tracking (ported from wacrm migration 024)
-- Tracks online/away status with heartbeat-based staleness detection.
-- "offline" is never stored — it's derived from staleness on read.

CREATE TABLE IF NOT EXISTS public.member_presence (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  status TEXT NOT NULL CHECK (status IN ('online', 'away')) DEFAULT 'online',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, account_id)
);

ALTER TABLE public.member_presence ENABLE ROW LEVEL SECURITY;

-- Users can read presence of all members (for display)
CREATE POLICY "Anyone can read member_presence"
  ON public.member_presence
  FOR SELECT
  USING (true);

-- touch_presence RPC — upserts the caller's presence row.
-- Called by PresenceHeartbeat every ~30s.
CREATE OR REPLACE FUNCTION public.touch_presence(p_status TEXT DEFAULT 'online')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_account_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the user's account_id from profiles
  SELECT account_id INTO v_account_id FROM public.profiles WHERE id = v_user_id;

  INSERT INTO public.member_presence (user_id, account_id, status, last_seen_at)
  VALUES (v_user_id, v_account_id, p_status, now())
  ON CONFLICT (user_id, account_id)
  DO UPDATE SET status = p_status, last_seen_at = now();
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.touch_presence TO authenticated;
