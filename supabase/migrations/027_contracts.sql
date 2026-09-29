-- Migration 021: Contracts table
-- Stores generated remodeling contracts (draft → sent → signed lifecycle)

CREATE TABLE IF NOT EXISTS public.contracts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Denormalized for quick listing without parsing form_data
  client_name      TEXT,
  project_address  TEXT,
  contract_date    DATE,

  -- Lifecycle: draft | sent | signed | voided
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','sent','signed','voided')),

  -- Full form values as submitted (JSON blob)
  form_data        JSONB NOT NULL DEFAULT '{}',

  -- Optional: link to a managed client and project
  managed_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Who created it
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'contracts_updated_at'
  ) THEN
    CREATE TRIGGER contracts_updated_at
      BEFORE UPDATE ON public.contracts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- Index for common queries
CREATE INDEX IF NOT EXISTS contracts_status_idx        ON public.contracts(status);
CREATE INDEX IF NOT EXISTS contracts_client_name_idx   ON public.contracts(client_name);
CREATE INDEX IF NOT EXISTS contracts_created_at_idx    ON public.contracts(created_at DESC);

-- RLS: only admins can read/write contracts
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage contracts"  ON public.contracts;
CREATE POLICY "Admins manage contracts"
  ON public.contracts
  FOR ALL
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

NOTIFY pgrst, 'reload schema';
