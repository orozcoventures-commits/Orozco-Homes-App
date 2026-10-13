-- Migration 051: "Other / Fees" actual cost type
--
-- Actual costs per budget line are entered as Materials, Subcontract and
-- Other / Fees (permits, dumpsters, fees). This adds other_cost; actual_cost
-- stays the line's total. labor_cost is kept for amounts entered earlier
-- (the app counts them as Subcontract).
--
-- Safe to re-run.

ALTER TABLE public.remodel_budget_actuals
  ADD COLUMN IF NOT EXISTS other_cost NUMERIC(14,2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'remodel_budget_actuals_other_cost_check') THEN
    ALTER TABLE public.remodel_budget_actuals
      ADD CONSTRAINT remodel_budget_actuals_other_cost_check CHECK (other_cost >= 0);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
