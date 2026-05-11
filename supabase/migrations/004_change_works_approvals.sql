CREATE TABLE IF NOT EXISTS public.change_works (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  description   TEXT,
  category      TEXT,
  original_cost NUMERIC     NOT NULL DEFAULT 0,
  new_cost      NUMERIC     NOT NULL DEFAULT 0,
  status        TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'declined')),
  approved_at   TIMESTAMPTZ,
  approved_by   TEXT,
  declined_at   TIMESTAMPTZ,
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approvals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  change_work_id UUID        NOT NULL REFERENCES public.change_works(id) ON DELETE CASCADE,
  action         TEXT        NOT NULL CHECK (action IN ('approved', 'declined')),
  signed_by      TEXT,
  signed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes          TEXT
);

ALTER TABLE public.change_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_works: admin full access"
  ON public.change_works FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "change_works: client select own"
  ON public.change_works FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.client_id = auth.uid()
    )
  );

CREATE POLICY "change_works: client update status"
  ON public.change_works FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.client_id = auth.uid()
    )
  );

CREATE POLICY "approvals: admin full access"
  ON public.approvals FOR ALL
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "approvals: client select own"
  ON public.approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.change_works cw
      JOIN public.projects p ON p.id = cw.project_id
      WHERE cw.id = change_work_id
        AND p.client_id = auth.uid()
    )
  );

CREATE POLICY "approvals: client insert own"
  ON public.approvals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_works cw
      JOIN public.projects p ON p.id = cw.project_id
      WHERE cw.id = change_work_id
        AND p.client_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
