-- Migration 057: Cost Catalog
--
-- Saved items with your own prices (name, category, unit, unit cost, optional
-- materials %, notes) that can be picked into any Remodel Estimate with
-- "+ Add line item → From catalog". Admins only, like the budgets.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.cost_catalog_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  category      TEXT          NOT NULL DEFAULT '' CHECK (char_length(category) <= 60),
  unit          TEXT          NOT NULL DEFAULT 'ls' CHECK (unit IN ('ls', 'sqft', 'lf', 'ea', 'hr', 'day')),
  unit_cost     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  materials_pct INTEGER       CHECK (materials_pct BETWEEN 0 AND 100),
  notes         TEXT          NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by    UUID          DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.cost_catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cost_catalog_items: admin all" ON public.cost_catalog_items;
CREATE POLICY "cost_catalog_items: admin all"
  ON public.cost_catalog_items
  FOR ALL
  TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP TRIGGER IF EXISTS cost_catalog_items_set_updated_at ON public.cost_catalog_items;
CREATE TRIGGER cost_catalog_items_set_updated_at
  BEFORE UPDATE ON public.cost_catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
