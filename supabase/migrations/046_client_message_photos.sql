-- Migration 046: Photos in Messages (step 2 — clients send photos)
--
-- Account clients upload straight to "message-photos", but only into the
-- folder of a project they belong to. PIN-portal clients have no login, so
-- the Netlify function /api/message-photo-upload checks their PIN
-- (pin_photo_upload_allowed, service role only) and hands back a one-time
-- upload link; send_pin_photo_message then posts the message after checking
-- the PIN again and that the photo was really uploaded to that project.
--
-- Safe to re-run.

-- ── Part A: functions ──────────────────────────────────────────────────────

-- PIN check for the Netlify upload function. Same lockout as the portal.
CREATE OR REPLACE FUNCTION public.pin_photo_upload_allowed(p_project_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key TEXT := 'project:' || coalesce(p_project_id::text, '');
BEGIN
  PERFORM pin_assert_not_locked(v_key);
  IF NOT pin_is_valid(p_project_id, p_pin) THEN
    PERFORM pin_record_failure(v_key);
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.pin_photo_upload_allowed(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pin_photo_upload_allowed(UUID, TEXT) TO service_role;

-- PIN client posts a photo message (optional text).
CREATE OR REPLACE FUNCTION public.send_pin_photo_message(p_project_id UUID, p_pin TEXT, p_content TEXT, p_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key TEXT := 'project:' || coalesce(p_project_id::text, '');
BEGIN
  PERFORM pin_assert_not_locked(v_key);
  IF NOT pin_is_valid(p_project_id, p_pin) THEN
    PERFORM pin_record_failure(v_key);
    RETURN FALSE;
  END IF;
  IF p_path IS NULL
     OR left(p_path, 37) <> p_project_id::text || '/'
     OR position('..' IN p_path) > 0
     OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'message-photos' AND o.name = p_path)
     OR EXISTS (SELECT 1 FROM messages m WHERE m.attachment_path = p_path) THEN
    RETURN FALSE;
  END IF;
  INSERT INTO messages (project_id, sender_id, sender_role, content, attachment_path)
  VALUES (p_project_id, NULL, 'client', left(trim(coalesce(p_content, '')), 5000), p_path);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.send_pin_photo_message(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_pin_photo_message(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── Part B: storage policy ─────────────────────────────────────────────────

-- Account clients may upload only into a project folder they have access to.
DROP POLICY IF EXISTS "message-photos: client upload" ON storage.objects;
CREATE POLICY "message-photos: client upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-photos'
    AND get_user_role() = 'client'
    AND CASE
          WHEN split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN public.user_can_access_project(split_part(name, '/', 1)::uuid)
          ELSE false
        END
  );
