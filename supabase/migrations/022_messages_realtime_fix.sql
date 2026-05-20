-- Migration 022: Comprehensive Realtime fix for messages.
--
-- Two problems prevented live delivery:
--
-- 1. REPLICA IDENTITY FULL was never applied (migration 021 file exists but
--    Supabase migrations are not auto-run; the table was still at DEFAULT).
--    Supabase Realtime drops ALL events on a filtered channel when the table
--    lacks REPLICA IDENTITY FULL, even for INSERT events.
--
-- 2. The existing SELECT policy checks project membership via
--    "clients.email = (SELECT email FROM auth.users WHERE id = auth.uid())".
--    That auth.users sub-select is blocked in the Realtime evaluation context
--    for authenticated (non-service-role) users, so managed-client subscribers
--    never passed the policy and received no events.
--
-- Fix:
--   a) Set REPLICA IDENTITY FULL (idempotent).
--   b) Move the complex project-membership logic into a SECURITY DEFINER
--      helper function.  SECURITY DEFINER runs as the postgres owner, which
--      always has access to auth.users — the same pattern already used by
--      get_user_role().  The Realtime evaluator can call it successfully.
--   c) Drop/recreate the SELECT policy to use the helper.

-- ── 1. REPLICA IDENTITY FULL ─────────────────────────────────────────────────
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ── 2. Ensure table is in the realtime publication (idempotent) ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- ── 3. SECURITY DEFINER helper for project membership ────────────────────────
-- Returns TRUE when the calling user (auth.uid()) may see rows for the given
-- project_id.  Runs as the function owner (postgres) so auth.users is always
-- accessible.  STABLE + SECURITY DEFINER matches the pattern of get_user_role().
CREATE OR REPLACE FUNCTION public.user_can_access_project(pid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admin always has access
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR
    -- Direct client link
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = pid
        AND p.client_id = auth.uid()
    )
    OR
    -- Managed-client link via email (requires auth.users; safe here because
    -- this function runs as the postgres owner via SECURITY DEFINER)
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.clients c ON c.id = p.managed_client_id
      JOIN auth.users     u ON u.email = c.email
      WHERE p.id = pid
        AND u.id = auth.uid()
    );
$$;

-- ── 4. Rebuild messages SELECT policy using the helper ────────────────────────
DROP POLICY IF EXISTS "messages: select own project or admin" ON public.messages;

CREATE POLICY "messages: select own project or admin"
  ON public.messages FOR SELECT
  USING (public.user_can_access_project(project_id));

-- ── 5. Rebuild INSERT policy the same way ─────────────────────────────────────
DROP POLICY IF EXISTS "messages: insert own project or admin" ON public.messages;

CREATE POLICY "messages: insert own project or admin"
  ON public.messages FOR INSERT
  WITH CHECK (public.user_can_access_project(project_id));

NOTIFY pgrst, 'reload schema';
