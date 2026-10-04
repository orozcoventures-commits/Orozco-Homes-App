-- Migration 040: Saved default template for proposals
--
-- One row (id = 'default') holding the admin's own proposal sections plus the
-- company and retainer-term fields. New proposals start from it; each saved
-- proposal keeps its own copy in proposals.form_data. Admin only.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id          TEXT        PRIMARY KEY CHECK (id = 'default'),
  fields      JSONB       NOT NULL DEFAULT '{}',
  sections    JSONB       NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(sections) = 'array'),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS proposal_templates_updated_at ON public.proposal_templates;
CREATE TRIGGER proposal_templates_updated_at
  BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_templates: admin all" ON public.proposal_templates;
CREATE POLICY "proposal_templates: admin all"
  ON public.proposal_templates FOR ALL TO authenticated
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

NOTIFY pgrst, 'reload schema';
