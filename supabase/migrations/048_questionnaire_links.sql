-- Migration 048: Pre-Consultation Questionnaire (step 2 — customer links)
--
-- 1. Private links: each questionnaire gets a long random access_token. The
--    customer opens /q/<token> (no login), sees the questions that were sent
--    and submits once; after that the link only shows "already submitted".
-- 2. Website link: /questionnaire, using the saved questions, only while
--    questionnaire_templates.public_enabled is on. Limited to 30
--    submissions an hour so it can't be flooded.
-- The browser never reads the tables: these SECURITY DEFINER functions
-- return only the questions, and keep only answers to those questions.
--
-- Safe to re-run.

-- ── Part A: columns ────────────────────────────────────────────────────────
ALTER TABLE public.questionnaires
  ADD COLUMN IF NOT EXISTS access_token TEXT
    DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
UPDATE public.questionnaires SET access_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  WHERE access_token IS NULL;
ALTER TABLE public.questionnaires ALTER COLUMN access_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS questionnaires_access_token_key ON public.questionnaires (access_token);

ALTER TABLE public.questionnaire_templates
  ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN NOT NULL DEFAULT false;

-- ── Part B: helper (internal) ──────────────────────────────────────────────
-- Keeps only answers to the questionnaire's questions (plus their "Other"
-- text), as trimmed strings or short lists of strings.
CREATE OR REPLACE FUNCTION public.questionnaire_clean_answers(p_q JSONB, p_answers JSONB)
RETURNS JSONB
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  WITH ids AS (
    SELECT q->>'id' AS id
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_q->'sections') = 'array' THEN p_q->'sections' ELSE '[]'::jsonb END) s,
           jsonb_array_elements(CASE WHEN jsonb_typeof(s->'questions') = 'array' THEN s->'questions' ELSE '[]'::jsonb END) q
  ), allowed AS (
    SELECT id FROM ids UNION SELECT id || '__other' FROM ids
  ), cleaned AS (
    SELECT a.key,
           CASE jsonb_typeof(a.value)
             WHEN 'string' THEN to_jsonb(left(btrim(a.value #>> '{}'), 5000))
             WHEN 'array'  THEN (SELECT coalesce(jsonb_agg(left(e #>> '{}', 500)), '[]'::jsonb)
                                   FROM (SELECT e FROM jsonb_array_elements(a.value) e
                                          WHERE jsonb_typeof(e) = 'string' LIMIT 20) x)
           END AS value
      FROM jsonb_each(CASE WHEN jsonb_typeof(p_answers) = 'object' THEN p_answers ELSE '{}'::jsonb END) a
     WHERE a.key IN (SELECT id FROM allowed)
       AND jsonb_typeof(a.value) IN ('string', 'array')
  )
  SELECT coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    FROM cleaned
   WHERE value IS NOT NULL AND value <> '""'::jsonb AND value <> '[]'::jsonb;
$$;

REVOKE ALL ON FUNCTION public.questionnaire_clean_answers(JSONB, JSONB) FROM PUBLIC, anon, authenticated;

-- ── Part C: private link functions ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_questionnaire_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r questionnaires%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) <> 64 THEN RETURN NULL; END IF;
  SELECT * INTO r FROM questionnaires WHERE access_token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF r.status <> 'sent' THEN
    RETURN jsonb_build_object('status', 'submitted',
      'title', r.questionnaire->'title', 'closing', r.questionnaire->'closing');
  END IF;
  RETURN jsonb_build_object('status', 'sent', 'questionnaire', r.questionnaire,
    'prefill', jsonb_build_object('full_name', r.respondent_name, 'email', r.respondent_email, 'phone', r.respondent_phone));
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_questionnaire_by_token(p_token TEXT, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r questionnaires%ROWTYPE;
  v JSONB;
BEGIN
  IF p_token IS NULL OR length(p_token) <> 64 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This questionnaire link is not valid.');
  END IF;
  IF octet_length(coalesce(p_answers::text, '')) > 200000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Your answers are too long. Please shorten them and try again.');
  END IF;
  SELECT * INTO r FROM questionnaires WHERE access_token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This questionnaire link is not valid.');
  END IF;
  IF r.status <> 'sent' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This questionnaire was already submitted.');
  END IF;
  v := questionnaire_clean_answers(r.questionnaire, p_answers);
  IF coalesce(v->>'full_name', '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please enter your name.');
  END IF;
  UPDATE questionnaires SET
    answers          = v,
    status           = 'submitted',
    submitted_at     = now(),
    respondent_name  = left(coalesce(v->>'full_name', ''), 300),
    respondent_email = left(coalesce(v->>'email', respondent_email), 300),
    respondent_phone = left(coalesce(v->>'phone', respondent_phone), 300),
    project_address  = left(coalesce(v->>'project_address', ''), 300)
  WHERE id = r.id;
  RETURN jsonb_build_object('ok', true, 'closing', r.questionnaire->'closing');
END;
$$;

REVOKE ALL ON FUNCTION public.get_questionnaire_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_questionnaire_by_token(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_questionnaire_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_questionnaire_by_token(TEXT, JSONB) TO anon, authenticated;

-- ── Part D: website link functions ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_public_questionnaire()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT questionnaire FROM questionnaire_templates WHERE id = 'default' AND public_enabled;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_questionnaire(p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q JSONB;
  v JSONB;
BEGIN
  SELECT questionnaire INTO q FROM questionnaire_templates WHERE id = 'default' AND public_enabled;
  IF q IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This questionnaire is not available right now. Please contact Orozco Homes.');
  END IF;
  IF octet_length(coalesce(p_answers::text, '')) > 200000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Your answers are too long. Please shorten them and try again.');
  END IF;
  IF (SELECT count(*) FROM questionnaires WHERE source = 'public' AND created_at > now() - interval '1 hour') >= 30 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'We are receiving a lot of questionnaires right now. Please try again in an hour, or contact Orozco Homes.');
  END IF;
  v := questionnaire_clean_answers(q, p_answers);
  IF coalesce(v->>'full_name', '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please enter your name.');
  END IF;
  INSERT INTO questionnaires (status, source, questionnaire, answers, submitted_at, created_by,
                              respondent_name, respondent_email, respondent_phone, project_address)
  VALUES ('submitted', 'public', q, v, now(), NULL,
          left(coalesce(v->>'full_name', ''), 300), left(coalesce(v->>'email', ''), 300),
          left(coalesce(v->>'phone', ''), 300), left(coalesce(v->>'project_address', ''), 300));
  RETURN jsonb_build_object('ok', true, 'closing', q->'closing');
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_questionnaire() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_questionnaire(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_questionnaire() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_questionnaire(JSONB) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
