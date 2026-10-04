-- Migration 039: Proposals (Project Retainer Agreements)
--
-- A proposal is prepared from the Remodel Budget and sent to the client
-- before the Construction Agreement (contracts table). Step 1: admin only.
-- Client accept/decline in the portal is added in a later migration.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.proposals (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Draft → Sent → Accepted / Declined / Expired
  status            TEXT        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','accepted','declined','expired')),

  -- Denormalized for the list view
  client_name       TEXT,
  title             TEXT,
  investment_low    NUMERIC(14,2),
  investment_high   NUMERIC(14,2),

  -- Every form value as saved (JSON)
  form_data         JSONB       NOT NULL DEFAULT '{}',

  project_id        UUID        REFERENCES public.projects(id) ON DELETE SET NULL,
  managed_client_id UUID        REFERENCES public.clients(id)  ON DELETE SET NULL,
  created_by        UUID        REFERENCES auth.users(id)      ON DELETE SET NULL DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON public.proposals (project_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS proposals_updated_at ON public.proposals;
CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals: admin all" ON public.proposals;
CREATE POLICY "proposals: admin all"
  ON public.proposals FOR ALL TO authenticated
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

NOTIFY pgrst, 'reload schema';
