-- =============================================================================
-- Migration 024: home_budgets
--   One row per user holding their Home Budget Tracker data (budget-tracker/)
--   as JSON, so the tracker syncs across devices. Owner-only access: no admin
--   policy, a personal budget is private to the person who signed in.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.home_budgets (
  user_id     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.home_budgets ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at on every write. set_updated_at() is identical to the one
-- in 001_initial_schema.sql; redefined here so this file also runs on a new project.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS home_budgets_set_updated_at ON public.home_budgets;
CREATE TRIGGER home_budgets_set_updated_at
  BEFORE UPDATE ON public.home_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "home_budgets: owner select" ON public.home_budgets;
CREATE POLICY "home_budgets: owner select"
  ON public.home_budgets FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "home_budgets: owner insert" ON public.home_budgets;
CREATE POLICY "home_budgets: owner insert"
  ON public.home_budgets FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "home_budgets: owner update" ON public.home_budgets;
CREATE POLICY "home_budgets: owner update"
  ON public.home_budgets FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "home_budgets: owner delete" ON public.home_budgets;
CREATE POLICY "home_budgets: owner delete"
  ON public.home_budgets FOR DELETE
  USING (user_id = auth.uid());
