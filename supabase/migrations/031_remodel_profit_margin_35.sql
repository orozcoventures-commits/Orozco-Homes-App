-- Migration 031: Remodel budgets price with a 35% gross margin
-- Final Price = (Direct Costs + Contingency) / (1 - Target Gross Margin %).
-- The gross margin (stored as profitPct) covers overhead and profit, so the
-- separate 18% overhead line is gone; overheadPct is no longer used.
-- Move every saved budget and the column default to a 35% margin.

UPDATE public.remodel_budgets
SET    pct_rates_json = jsonb_set(COALESCE(pct_rates_json, '{}'::jsonb), '{profitPct}', '35'::jsonb)
WHERE  (pct_rates_json->>'profitPct') IS DISTINCT FROM '35';

ALTER TABLE public.remodel_budgets
  ALTER COLUMN pct_rates_json SET DEFAULT '{"profitPct":35,"contingencyPct":10}';
