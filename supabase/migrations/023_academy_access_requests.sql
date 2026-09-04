-- Migration 023: Genesis Academy access requests
-- Before requesting an access code, visitors fill out a short form (name,
-- email, why they want in). This gives Roger a real list of leads to review
-- and approve manually, instead of relying on people remembering to email
-- him. Same public-insert / admin-only-read pattern as migration 021.

CREATE TABLE IF NOT EXISTS public.ec_academy_requests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT        NOT NULL,
  email               TEXT        NOT NULL,
  reason              TEXT        NOT NULL,
  language            TEXT        NOT NULL DEFAULT 'en'
                      CHECK (language IN ('en', 'es')),
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'declined')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ec_academy_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous site visitors) can submit a request.
CREATE POLICY "ec_academy_requests: public insert"
  ON public.ec_academy_requests FOR INSERT
  WITH CHECK (TRUE);

-- Only admins can read, update (moderate/approve), or delete requests.
-- Reuses get_user_role() from migration 001.
CREATE POLICY "ec_academy_requests: admin select"
  ON public.ec_academy_requests FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "ec_academy_requests: admin update"
  ON public.ec_academy_requests FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "ec_academy_requests: admin delete"
  ON public.ec_academy_requests FOR DELETE
  USING (get_user_role() = 'admin');

NOTIFY pgrst, 'reload schema';
