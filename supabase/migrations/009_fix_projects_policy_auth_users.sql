-- Migration 009: fix "permission denied for table users" on project INSERT
--
-- Root cause: the projects SELECT policy (migration 005) contains an inline
--   SELECT email FROM auth.users WHERE id = auth.uid()
-- The authenticated role cannot read auth.users directly. Postgres evaluates
-- this policy when PostgREST tries to return the newly-created row after
-- INSERT ... SELECT, which triggers the permission error.
--
-- Fix: add a SECURITY DEFINER helper that reads auth.users as the DB owner,
-- then rewrite the projects SELECT policy to use it.

-- ── 1. Helper function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- ── 2. Rebuild the projects SELECT policy without the inline auth.users ref ──
DROP POLICY IF EXISTS "projects: client select"  ON public.projects;
DROP POLICY IF EXISTS "projects: client owns or admin" ON public.projects;

CREATE POLICY "projects: client select"
  ON public.projects FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR client_id = auth.uid()
    OR managed_client_id IN (
      SELECT c.id FROM public.clients c
      WHERE c.email = get_current_user_email()
    )
  );

-- ── 3. Rebuild messages SELECT + INSERT policies with the same fix ────────
DROP POLICY IF EXISTS "messages: select own project or admin" ON public.messages;
DROP POLICY IF EXISTS "messages: insert own project or admin" ON public.messages;

CREATE POLICY "messages: select own project or admin"
  ON public.messages FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.client_id = auth.uid()
          OR p.managed_client_id IN (
            SELECT c.id FROM public.clients c
            WHERE c.email = get_current_user_email()
          )
        )
    )
  );

CREATE POLICY "messages: insert own project or admin"
  ON public.messages FOR INSERT
  WITH CHECK (
    get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.client_id = auth.uid()
          OR p.managed_client_id IN (
            SELECT c.id FROM public.clients c
            WHERE c.email = get_current_user_email()
          )
        )
    )
  );

NOTIFY pgrst, 'reload schema';
