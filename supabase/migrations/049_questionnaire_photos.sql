-- Migration 049: Pre-Consultation Questionnaire (step 3 — photos)
--
-- Customers attach photos of their space and inspiration pictures.
-- 1. Private "questionnaire-photos" bucket (customers' homes): only admins
--    can view (short-lived signed links) or delete; nobody uploads directly.
-- 2. The Netlify function /api/questionnaire-photo-upload asks
--    questionnaire_photo_upload_folder (service role only) which folder a
--    link may upload to, then hands back a one-time upload link:
--      private link  → link/<questionnaire id>/   (max 40 files per link)
--      website link  → public/                    (max 300 files an hour)
-- 3. On submit, questionnaire_keep_photos keeps only photos that were really
--    uploaded to that folder, are not used by another questionnaire, and
--    fit the question's limit.
--
-- Safe to re-run.

-- ── Part A: functions ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.questionnaire_photo_upload_folder(p_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_token IS NULL OR p_token = '' THEN
    IF NOT EXISTS (SELECT 1 FROM questionnaire_templates WHERE id = 'default' AND public_enabled) THEN RETURN NULL; END IF;
    IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'questionnaire-photos'
          AND name LIKE 'public/%' AND created_at > now() - interval '1 hour') >= 300 THEN RETURN NULL; END IF;
    RETURN 'public/';
  END IF;
  SELECT id INTO v_id FROM questionnaires WHERE access_token = p_token AND status = 'sent';
  IF v_id IS NULL THEN RETURN NULL; END IF;
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'questionnaire-photos'
        AND name LIKE 'link/' || v_id::text || '/%') >= 40 THEN RETURN NULL; END IF;
  RETURN 'link/' || v_id::text || '/';
END;
$$;

REVOKE ALL ON FUNCTION public.questionnaire_photo_upload_folder(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.questionnaire_photo_upload_folder(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.questionnaire_keep_photos(p_q JSONB, p_answers JSONB, p_folder TEXT, p_self UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q    JSONB;
  kept JSONB;
  v    JSONB := p_answers;
BEGIN
  FOR q IN
    SELECT x FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_q->'sections') = 'array' THEN p_q->'sections' ELSE '[]'::jsonb END) s,
                  jsonb_array_elements(CASE WHEN jsonb_typeof(s->'questions') = 'array' THEN s->'questions' ELSE '[]'::jsonb END) x
     WHERE x->>'type' = 'photos'
  LOOP
    IF jsonb_typeof(v->(q->>'id')) = 'array' THEN
      SELECT coalesce(jsonb_agg(p), '[]'::jsonb) INTO kept FROM (
        SELECT DISTINCT ON (p) p FROM jsonb_array_elements_text(v->(q->>'id')) p
         WHERE left(p, length(p_folder)) = p_folder
           AND position('..' IN p) = 0
           AND EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'questionnaire-photos' AND o.name = p)
           AND NOT EXISTS (SELECT 1 FROM questionnaires o2 WHERE o2.id IS DISTINCT FROM p_self AND strpos(o2.answers::text, '"' || p || '"') > 0)
         LIMIT LEAST(10, GREATEST(1, coalesce((q->>'maxFiles')::int, 5)))
      ) t;
      v := CASE WHEN kept = '[]'::jsonb THEN v - (q->>'id') ELSE jsonb_set(v, ARRAY[q->>'id'], kept) END;
    ELSE
      v := v - (q->>'id');
    END IF;
  END LOOP;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.questionnaire_keep_photos(JSONB, JSONB, TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- Same as migration 048, plus questionnaire_keep_photos.
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
  v := questionnaire_keep_photos(r.questionnaire, v, 'link/' || r.id::text || '/', r.id);
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

REVOKE ALL ON FUNCTION public.submit_questionnaire_by_token(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_questionnaire_by_token(TEXT, JSONB) TO anon, authenticated;

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
  v := questionnaire_keep_photos(q, v, 'public/', NULL);
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

REVOKE ALL ON FUNCTION public.submit_public_questionnaire(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_questionnaire(JSONB) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── Part B: storage bucket + policies ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('questionnaire-photos', 'questionnaire-photos', false, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'])
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'];

DROP POLICY IF EXISTS "questionnaire-photos: admin read"   ON storage.objects;
DROP POLICY IF EXISTS "questionnaire-photos: admin delete" ON storage.objects;

CREATE POLICY "questionnaire-photos: admin read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'questionnaire-photos' AND get_user_role() = 'admin');

CREATE POLICY "questionnaire-photos: admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'questionnaire-photos' AND get_user_role() = 'admin');
