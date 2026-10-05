-- Migration 047: Pre-Consultation Questionnaire (step 1 — admin page)
--
-- questionnaire_templates: one row (id = 'default') with the admin's own
--   version of the questions. Without it the app uses the built-in questions.
-- questionnaires: one row per questionnaire. Keeps a copy of the questions it
--   was answered with plus the answers. Status: sent → submitted → reviewed.
--   Admin only for now; step 2 adds the private link customers answer with.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.questionnaire_templates (
  id             TEXT        PRIMARY KEY CHECK (id = 'default'),
  questionnaire  JSONB       NOT NULL CHECK (jsonb_typeof(questionnaire) = 'object'),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.questionnaires (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status            TEXT        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'submitted', 'reviewed')),
  source            TEXT        NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'link', 'public')),
  respondent_name   TEXT        NOT NULL DEFAULT '',
  respondent_email  TEXT        NOT NULL DEFAULT '',
  respondent_phone  TEXT        NOT NULL DEFAULT '',
  project_address   TEXT        NOT NULL DEFAULT '',
  questionnaire     JSONB       NOT NULL CHECK (jsonb_typeof(questionnaire) = 'object'),
  answers           JSONB       NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(answers) = 'object'),
  admin_notes       TEXT        NOT NULL DEFAULT '',
  submitted_at      TIMESTAMPTZ,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_questionnaires_status ON public.questionnaires (status, submitted_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS questionnaire_templates_updated_at ON public.questionnaire_templates;
CREATE TRIGGER questionnaire_templates_updated_at
  BEFORE UPDATE ON public.questionnaire_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS questionnaires_updated_at ON public.questionnaires;
CREATE TRIGGER questionnaires_updated_at
  BEFORE UPDATE ON public.questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaires          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questionnaire_templates: admin all" ON public.questionnaire_templates;
CREATE POLICY "questionnaire_templates: admin all"
  ON public.questionnaire_templates FOR ALL TO authenticated
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "questionnaires: admin all" ON public.questionnaires;
CREATE POLICY "questionnaires: admin all"
  ON public.questionnaires FOR ALL TO authenticated
  USING      (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

NOTIFY pgrst, 'reload schema';
