-- Migration 053: default Scope of Work per trade
--
-- Remodel Budget → Subs & Materials shows a Scope of Work for each
-- subcontractor trade. "Save as my default scope" stores the wording here so
-- new budgets start with it. Each budget's own edits stay in
-- remodel_budgets.layout_json (scopes). Admins only, like the budgets.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.trade_scope_templates (
  trade_key  TEXT        PRIMARY KEY CHECK (trade_key ~ '^[a-z-]{2,30}$'),
  scope      TEXT        NOT NULL DEFAULT '' CHECK (char_length(scope) <= 8000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.trade_scope_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_scope_templates: admin all" ON public.trade_scope_templates;
CREATE POLICY "trade_scope_templates: admin all"
  ON public.trade_scope_templates
  FOR ALL
  TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP TRIGGER IF EXISTS trade_scope_templates_set_updated_at ON public.trade_scope_templates;
CREATE TRIGGER trade_scope_templates_set_updated_at
  BEFORE UPDATE ON public.trade_scope_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
