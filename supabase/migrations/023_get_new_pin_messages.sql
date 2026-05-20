-- Migration 023: Lightweight RPC for polling new messages in PIN sessions.
--
-- PIN-mode clients have no Supabase auth session, so Realtime postgres_changes
-- cannot deliver events to them (auth.uid() is null → RLS blocks everything).
-- PinClientPortal polls this function every 5 s instead of subscribing.
--
-- The function is SECURITY DEFINER (runs as postgres owner) so it can access
-- the messages table without any client-side auth.  It re-verifies the PIN on
-- every call so a client cannot read another project's messages by guessing IDs.

CREATE OR REPLACE FUNCTION public.get_new_pin_messages(
  p_project_id UUID,
  p_pin        TEXT,
  p_after      TIMESTAMPTZ
)
RETURNS TABLE (
  id          UUID,
  sender_role TEXT,
  content     TEXT,
  created_at  TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.sender_role, m.content, m.created_at
  FROM   public.messages m
  JOIN   public.projects pr ON pr.id = m.project_id
  WHERE  pr.id           = p_project_id
    AND  pr.project_pin  = TRIM(p_pin)
    AND  m.created_at    > p_after
  ORDER  BY m.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_new_pin_messages TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
