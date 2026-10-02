-- Migration 037: Actual costs by type (Material / Labor / Subcontractor)
--
-- remodel_budget_actuals keeps one row per (project, WBS line). actual_cost
-- stays the line's total actual; these columns split it by type. Rows saved
-- before this migration keep their total with all three at 0 ("not split").
--
-- Safe to re-run.

ALTER TABLE public.remodel_budget_actuals
  ADD COLUMN IF NOT EXISTS material_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_cost    NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sub_cost      NUMERIC(14,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'remodel_budget_actuals_by_type_check'
  ) THEN
    ALTER TABLE public.remodel_budget_actuals
      ADD CONSTRAINT remodel_budget_actuals_by_type_check CHECK (
        material_cost >= 0 AND labor_cost >= 0 AND sub_cost >= 0
        AND actual_cost >= material_cost + labor_cost + sub_cost
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
