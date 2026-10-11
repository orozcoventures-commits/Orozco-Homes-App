-- Migration 050: Custom line items in the Remodel Budget
--
-- Each saved budget can rename or remove the built-in lines and add its own:
--   { "added": [{ "id", "div", "label" }], "labels": { wbs: label }, "removed": [wbs] }
-- Amounts of added lines are stored with the other line amounts
-- (overrides_json), and their actual costs in remodel_budget_actuals.
--
-- Safe to re-run.

ALTER TABLE public.remodel_budgets
  ADD COLUMN IF NOT EXISTS layout_json JSONB NOT NULL DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
