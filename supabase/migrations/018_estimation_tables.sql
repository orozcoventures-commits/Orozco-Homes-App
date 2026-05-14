-- =============================================================================
-- Migration 018: estimation tables
--   • project_dimensions  — one row per project storing room measurements
--   • material_selections — per-project material picks with installed cost
-- =============================================================================

-- ── project_dimensions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_dimensions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  floor_sqft   NUMERIC     NOT NULL DEFAULT 0,
  wall_sqft    NUMERIC     NOT NULL DEFAULT 0,
  linear_feet  NUMERIC     NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_dimensions ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on every write (reuses existing set_updated_at())
DROP TRIGGER IF EXISTS project_dimensions_set_updated_at ON public.project_dimensions;
CREATE TRIGGER project_dimensions_set_updated_at
  BEFORE UPDATE ON public.project_dimensions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin: full access
CREATE POLICY "project_dimensions: admin all"
  ON public.project_dimensions
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Client: read/write own project dimensions
CREATE POLICY "project_dimensions: client own project"
  ON public.project_dimensions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.client_id = auth.uid()
          OR p.managed_client_id IN (
            SELECT c.id FROM public.clients c
            WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.client_id = auth.uid()
          OR p.managed_client_id IN (
            SELECT c.id FROM public.clients c
            WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        )
    )
  );

-- ── material_selections ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.material_selections (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  material_id    TEXT        NOT NULL,
  category       TEXT        NOT NULL,
  product_name   TEXT        NOT NULL,
  unit_price     NUMERIC     NOT NULL DEFAULT 0,
  unit_type      TEXT        NOT NULL DEFAULT 'sq ft',
  labor_rate     NUMERIC     NOT NULL DEFAULT 0,
  installed_cost NUMERIC     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'Considering'
                 CHECK (status IN ('Considering', 'Selected', 'Ordered')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, material_id)
);

ALTER TABLE public.material_selections ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "material_selections: admin all"
  ON public.material_selections
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Client: read/write own project material selections
CREATE POLICY "material_selections: client own project"
  ON public.material_selections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.client_id = auth.uid()
          OR p.managed_client_id IN (
            SELECT c.id FROM public.clients c
            WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.client_id = auth.uid()
          OR p.managed_client_id IN (
            SELECT c.id FROM public.clients c
            WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        )
    )
  );

NOTIFY pgrst, 'reload schema';
