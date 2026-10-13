-- Migration 052: Compare design selections with client allowances
--
-- 1. remodel_budgets.allowances_json: the budget's client allowances
--    [{ key, label, amount }] (saved by the Remodel Budget page; only names
--    and allowance amounts, the same figures shown on proposals/contracts).
-- 2. design_specs.allowance_key: which allowance a selection counts toward.
-- 3. get_project_allowances(project): returns only that list to admins,
--    designers and the project's client — never the rest of the budget.
--
-- Safe to re-run.

ALTER TABLE public.remodel_budgets
  ADD COLUMN IF NOT EXISTS allowances_json JSONB NOT NULL DEFAULT '[]';

ALTER TABLE public.design_specs
  ADD COLUMN IF NOT EXISTS allowance_key TEXT;

CREATE OR REPLACE FUNCTION public.get_project_allowances(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v JSONB;
BEGIN
  IF NOT (coalesce(get_user_role(), '') IN ('admin', 'designer') OR user_can_access_project(p_project_id)) THEN
    RETURN '[]'::jsonb;
  END IF;
  SELECT allowances_json INTO v FROM remodel_budgets WHERE project_id = p_project_id;
  RETURN CASE WHEN jsonb_typeof(v) = 'array' THEN v ELSE '[]'::jsonb END;
END;
$$;

REVOKE ALL ON FUNCTION public.get_project_allowances(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_allowances(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
