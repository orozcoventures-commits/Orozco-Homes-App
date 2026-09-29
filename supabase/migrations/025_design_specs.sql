-- Migration 025: Designer Role + Design Specifications Workflow
-- Adds 'designer' role; creates design_specs table + client respond RPC

-- ── 1. Expand profiles role constraint to include designer ───────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'client', 'designer'));

-- ── 2. Design Specs table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.design_specs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID          NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  room_category   TEXT          NOT NULL DEFAULT 'other',
  product_name    TEXT          NOT NULL,
  supplier        TEXT          NOT NULL DEFAULT '',
  unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_type       TEXT          NOT NULL DEFAULT 'sqft'
                                CHECK (unit_type IN ('sqft','lf','ea','hr','ls','cy','sy')),
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
  labor_rate      NUMERIC(12,2) NOT NULL DEFAULT 0,
  installed_cost  NUMERIC(14,2) GENERATED ALWAYS AS ((unit_price + labor_rate) * quantity) STORED,
  phase_tag       TEXT          NOT NULL DEFAULT '',
  designer_notes  TEXT          NOT NULL DEFAULT '',
  status          TEXT          NOT NULL DEFAULT 'pending_review'
                                CHECK (status IN ('pending_review','approved','declined')),
  client_feedback TEXT          NOT NULL DEFAULT '',
  created_by      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.design_specs ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_design_spec_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_design_spec_updated_at ON public.design_specs;
CREATE TRIGGER trg_design_spec_updated_at
  BEFORE UPDATE ON public.design_specs
  FOR EACH ROW EXECUTE FUNCTION public.set_design_spec_updated_at();

-- ── 3. RLS Policies ──────────────────────────────────────────────────────────

-- Admins: full access across all projects
CREATE POLICY "design_specs: admin full"
  ON public.design_specs FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Designers: read all specs; write/update their own
CREATE POLICY "design_specs: designer read"
  ON public.design_specs FOR SELECT
  USING (get_user_role() = 'designer');

CREATE POLICY "design_specs: designer insert"
  ON public.design_specs FOR INSERT
  WITH CHECK (get_user_role() = 'designer');

CREATE POLICY "design_specs: designer update own"
  ON public.design_specs FOR UPDATE
  USING (get_user_role() = 'designer' AND created_by = auth.uid())
  WITH CHECK (get_user_role() = 'designer');

CREATE POLICY "design_specs: designer delete own"
  ON public.design_specs FOR DELETE
  USING (get_user_role() = 'designer' AND created_by = auth.uid());

-- Clients: read-only for their own project
CREATE POLICY "design_specs: client read own project"
  ON public.design_specs FOR SELECT
  USING (public.user_can_access_project(project_id));

-- ── 4. Client Respond RPC ─────────────────────────────────────────────────────
-- Allows clients to approve or decline a design spec (status + optional feedback).
-- SECURITY DEFINER ensures it bypasses RLS while still validating access.
CREATE OR REPLACE FUNCTION public.client_respond_to_spec(
  p_spec_id  UUID,
  p_status   TEXT,
  p_feedback TEXT DEFAULT ''
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project_id UUID;
BEGIN
  SELECT project_id INTO v_project_id FROM public.design_specs WHERE id = p_spec_id;
  IF v_project_id IS NULL THEN RAISE EXCEPTION 'Spec not found'; END IF;
  IF NOT public.user_can_access_project(v_project_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF p_status NOT IN ('approved', 'declined') THEN
    RAISE EXCEPTION 'Invalid status: must be approved or declined';
  END IF;
  UPDATE public.design_specs
  SET    status = p_status, client_feedback = COALESCE(p_feedback, '')
  WHERE  id = p_spec_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_respond_to_spec TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
