-- Migration 031: Remodel budgets price profit as a 35% margin of the client price
-- The calculator now computes Net Profit as a margin (Total Price = Total Cost / 0.65,
-- Total Cost = direct + overhead + contingency) instead of a 12% markup on direct
-- costs. Move every saved budget and the column default to 35%.

UPDATE public.remodel_budgets
SET    pct_rates_json = jsonb_set(COALESCE(pct_rates_json, '{}'::jsonb), '{profitPct}', '35'::jsonb)
WHERE  (pct_rates_json->>'profitPct') IS DISTINCT FROM '35';

ALTER TABLE public.remodel_budgets
  ALTER COLUMN pct_rates_json SET DEFAULT '{"overheadPct":18,"profitPct":35,"contingencyPct":10}';
