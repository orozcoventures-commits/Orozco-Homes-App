-- Migration 054: "My template" per Remodel Budget project type
--
-- "Save as my template" stores a budget's setup (lines added / renamed /
-- removed, price adjustments, cost splits, trades, allowances, margin and
-- contingency) for its project type. New budgets of that type start from it.
-- Size inputs, actuals, scopes and subcontractors stay with each budget.
-- Admins only, like the budgets.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.remodel_budget_templates (
  project_type  TEXT        PRIMARY KEY CHECK (project_type ~ '^[a-z0-9-]{2,60}$'),
  template_json JSONB       NOT NULL CHECK (jsonb_typeof(template_json) = 'object' AND octet_length(template_json::text) <= 200000),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.remodel_budget_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "remodel_budget_templates: admin all" ON public.remodel_budget_templates;
CREATE POLICY "remodel_budget_templates: admin all"
  ON public.remodel_budget_templates
  FOR ALL
  TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP TRIGGER IF EXISTS remodel_budget_templates_set_updated_at ON public.remodel_budget_templates;
CREATE TRIGGER remodel_budget_templates_set_updated_at
  BEFORE UPDATE ON public.remodel_budget_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
