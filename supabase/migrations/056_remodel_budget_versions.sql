-- Migration 056: saved versions of a Remodel Estimate
--
-- "Save version" keeps a named snapshot of a project's estimate (the same
-- fields as remodel_budgets, plus each line's amount and the totals at that
-- moment) so it can be compared with the current estimate or restored.
-- Admins only, like the budgets. Deleting the project deletes its versions.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.remodel_budget_versions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_no  INTEGER     NOT NULL CHECK (version_no > 0),
  name        TEXT        NOT NULL DEFAULT '' CHECK (char_length(name) <= 80),
  snapshot    JSONB       NOT NULL CHECK (jsonb_typeof(snapshot) = 'object' AND octet_length(snapshot::text) <= 500000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (project_id, version_no)
);

ALTER TABLE public.remodel_budget_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "remodel_budget_versions: admin all" ON public.remodel_budget_versions;
CREATE POLICY "remodel_budget_versions: admin all"
  ON public.remodel_budget_versions
  FOR ALL
  TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

NOTIFY pgrst, 'reload schema';
