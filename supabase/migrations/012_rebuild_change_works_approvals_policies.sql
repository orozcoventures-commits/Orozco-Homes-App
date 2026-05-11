-- Migration 012: rebuild all change_works and approvals RLS policies
--
-- Problem: migration 004 was partially applied to the live DB (columns were
-- missing, so policies likely weren't created either). The FOR ALL admin
-- policy also silently fails for INSERT when get_user_role() can't resolve.
--
-- Fix: drop everything and recreate with explicit per-operation policies.
-- Also fixes the client SELECT/UPDATE policies to include the managed_client
-- email-match path (matching the pattern established in migration 009).

-- ── change_works ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "change_works: admin full access"    ON public.change_works;
DROP POLICY IF EXISTS "change_works: client select own"    ON public.change_works;
DROP POLICY IF EXISTS "change_works: client update status" ON public.change_works;
DROP POLICY IF EXISTS "change_works: admin select"         ON public.change_works;
DROP POLICY IF EXISTS "change_works: admin insert"         ON public.change_works;
DROP POLICY IF EXISTS "change_works: admin update"         ON public.change_works;
DROP POLICY IF EXISTS "change_works: admin delete"         ON public.change_works;

CREATE POLICY "change_works: admin select"
  ON public.change_works FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "change_works: admin insert"
  ON public.change_works FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "change_works: admin update"
  ON public.change_works FOR UPDATE
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "change_works: admin delete"
  ON public.change_works FOR DELETE
  USING (get_user_role() = 'admin');

CREATE POLICY "change_works: client select own"
  ON public.change_works FOR SELECT
  USING (
    EXISTS (
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

CREATE POLICY "change_works: client update status"
  ON public.change_works FOR UPDATE
  USING (
    EXISTS (
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

-- ── approvals ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "approvals: admin full access" ON public.approvals;
DROP POLICY IF EXISTS "approvals: client select own" ON public.approvals;
DROP POLICY IF EXISTS "approvals: client insert own" ON public.approvals;
DROP POLICY IF EXISTS "approvals: admin select"      ON public.approvals;
DROP POLICY IF EXISTS "approvals: admin insert"      ON public.approvals;
DROP POLICY IF EXISTS "approvals: admin update"      ON public.approvals;
DROP POLICY IF EXISTS "approvals: admin delete"      ON public.approvals;

CREATE POLICY "approvals: admin select"
  ON public.approvals FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "approvals: admin insert"
  ON public.approvals FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "approvals: admin update"
  ON public.approvals FOR UPDATE
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "approvals: admin delete"
  ON public.approvals FOR DELETE
  USING (get_user_role() = 'admin');

CREATE POLICY "approvals: client select own"
  ON public.approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.change_works cw
      JOIN public.projects p ON p.id = cw.project_id
      WHERE cw.id = change_work_id
        AND (
          p.client_id = auth.uid()
          OR p.managed_client_id IN (
            SELECT c.id FROM public.clients c
            WHERE c.email = get_current_user_email()
          )
        )
    )
  );

CREATE POLICY "approvals: client insert own"
  ON public.approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_works cw
      JOIN public.projects p ON p.id = cw.project_id
      WHERE cw.id = change_work_id
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
