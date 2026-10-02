-- Migration 036: Crew and equipment lists are no longer public
--
-- "subcontractors: anyone read" and "resources: anyone read" (migration 024)
-- used USING (true), so anyone, even signed out, could read the Job Schedule
-- crew list and equipment list. Reading now requires a signed-in user; admin
-- write policies are unchanged.
--
-- Safe to re-run.

DROP POLICY IF EXISTS "subcontractors: anyone read"       ON public.subcontractors;
DROP POLICY IF EXISTS "subcontractors: signed-in read"    ON public.subcontractors;
CREATE POLICY "subcontractors: signed-in read"
  ON public.subcontractors FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "resources: anyone read"            ON public.resources;
DROP POLICY IF EXISTS "resources: signed-in read"         ON public.resources;
CREATE POLICY "resources: signed-in read"
  ON public.resources FOR SELECT TO authenticated
  USING (true);
