-- =============================================================================
-- Migration 026: remodel budget persistence and Budget vs Actual tracking
--
--   • remodel_budgets        — one row per project; stores calculator state
--                              (project type, inputs, spec level, pct rates,
--                               manual overrides) so estimates survive a page
--                              refresh and are isolated per project_id.
--
--   • remodel_budget_actuals — one row per (project_id, wbs_key); stores the
--                              real-world cost entered by the contractor as work
--                              progresses, enabling Budget vs Actual variance
--                              reporting on every line item.
-- =============================================================================

-- ── remodel_budgets ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.remodel_budgets (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID          NOT NULL UNIQUE
                                 REFERENCES public.projects(id) ON DELETE CASCADE,
  project_type     TEXT          NOT NULL DEFAULT 'bathroom-medium',
  spec_level       TEXT          NOT NULL DEFAULT 'mid',
  -- Calculator parameter inputs (sqft, linear_feet, fixture counts, etc.)
  inputs_json      JSONB         NOT NULL DEFAULT '{}',
  -- Overhead / profit / contingency percentages
  pct_rates_json   JSONB         NOT NULL DEFAULT '{"overheadPct":18,"profitPct":12,"contingencyPct":10}',
  -- User-overridden WBS line values  { "1.1": 4200, "3.2": 8800 }
  overrides_json   JSONB         NOT NULL DEFAULT '{}',
  -- Boolean map of which WBS keys are overridden  { "1.1": true, "3.2": true }
  flags_json       JSONB         NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.remodel_budgets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS remodel_budgets_set_updated_at ON public.remodel_budgets;
CREATE TRIGGER remodel_budgets_set_updated_at
  BEFORE UPDATE ON public.remodel_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admins only — budget data is a contractor-confidential tool
CREATE POLICY "remodel_budgets: admin all"
  ON public.remodel_budgets
  FOR ALL
  TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ── remodel_budget_actuals ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.remodel_budget_actuals (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID          NOT NULL
               REFERENCES public.projects(id) ON DELETE CASCADE,
  -- WBS key exactly as used in the calculator (e.g. '1.1', 'M.2')
  wbs_key      TEXT          NOT NULL,
  -- Real-world cost: invoices, subcontractor payments, material receipts
  actual_cost  NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- One actual row per (project, WBS line) — enforces project isolation
  CONSTRAINT remodel_budget_actuals_project_wbs_key UNIQUE (project_id, wbs_key)
);

ALTER TABLE public.remodel_budget_actuals ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS remodel_budget_actuals_set_updated_at ON public.remodel_budget_actuals;
CREATE TRIGGER remodel_budget_actuals_set_updated_at
  BEFORE UPDATE ON public.remodel_budget_actuals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "remodel_budget_actuals: admin all"
  ON public.remodel_budget_actuals
  FOR ALL
  TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ── Helpful indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_remodel_budgets_project_id
  ON public.remodel_budgets (project_id);

CREATE INDEX IF NOT EXISTS idx_remodel_budget_actuals_project_id
  ON public.remodel_budget_actuals (project_id);

NOTIFY pgrst, 'reload schema';
