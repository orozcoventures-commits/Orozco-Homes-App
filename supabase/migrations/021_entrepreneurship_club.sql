-- Migration 021: Entrepreneurship Club site
-- Standalone public-facing site (served from /entrepreneurship-club/) with two
-- forms: a membership request and a success-story submission. Both are public
-- (unauthenticated) inserts; only admins can read, moderate, or delete rows.

-- ── ec_membership_requests ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ec_membership_requests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT        NOT NULL,
  email               TEXT        NOT NULL,
  location            TEXT        NOT NULL,
  stage               TEXT        NOT NULL,
  about               TEXT        NOT NULL,
  agreed_to_policy    BOOLEAN     NOT NULL DEFAULT FALSE
                      CHECK (agreed_to_policy = TRUE),
  language            TEXT        NOT NULL DEFAULT 'en'
                      CHECK (language IN ('en', 'es')),
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'declined')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ec_success_stories ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ec_success_stories (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT        NOT NULL,
  venture_name        TEXT        NOT NULL,
  milestone_type      TEXT        NOT NULL,
  story_text          TEXT        NOT NULL,
  permission_granted  BOOLEAN     NOT NULL DEFAULT FALSE
                      CHECK (permission_granted = TRUE),
  language            TEXT        NOT NULL DEFAULT 'en'
                      CHECK (language IN ('en', 'es')),
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'declined')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.ec_membership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ec_success_stories     ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous site visitors) can submit a request or story.
CREATE POLICY "ec_membership_requests: public insert"
  ON public.ec_membership_requests FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "ec_success_stories: public insert"
  ON public.ec_success_stories FOR INSERT
  WITH CHECK (TRUE);

-- Only admins can read, update (moderate/approve), or delete submissions.
-- Reuses get_user_role() from migration 001.
CREATE POLICY "ec_membership_requests: admin select"
  ON public.ec_membership_requests FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "ec_membership_requests: admin update"
  ON public.ec_membership_requests FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "ec_membership_requests: admin delete"
  ON public.ec_membership_requests FOR DELETE
  USING (get_user_role() = 'admin');

CREATE POLICY "ec_success_stories: admin select"
  ON public.ec_success_stories FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "ec_success_stories: admin update"
  ON public.ec_success_stories FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "ec_success_stories: admin delete"
  ON public.ec_success_stories FOR DELETE
  USING (get_user_role() = 'admin');

NOTIFY pgrst, 'reload schema';
