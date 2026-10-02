-- Migration 032: Security fixes from the October 2026 access audit
--
-- 1. Role lock — "profiles: update own row" let any signed-in user change their
--    own profiles.role, including to 'admin'. A trigger now rejects role (or id)
--    changes made through the app (anon/authenticated) unless the caller is an
--    admin. Trusted paths still work: the SQL editor, the service role, and
--    SECURITY DEFINER functions such as promote_to_first_admin().
--
-- 2. Client PIN lockout — PINs are 4 digits with unlimited guesses. Each PIN
--    function is renamed to *_unguarded (body untouched, no longer callable by
--    clients) and fronted by a guard with the original name and signature.
--    After 5 wrong PINs in 15 minutes, or 20 in 24 hours, for the same email
--    (login) or project (portal), further attempts are refused — even with the
--    right PIN — until the window passes.
--
-- Safe to re-run.

-- ── 1. Role lock ──────────────────────────────────────────────────────────────
-- SECURITY INVOKER on purpose: current_user is then the role that issued the
-- UPDATE ('authenticated' for app users, the owner inside SECURITY DEFINER code).
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.id IS DISTINCT FROM OLD.id)
     AND current_user IN ('anon', 'authenticated')
     AND COALESCE(public.get_user_role(), '') <> 'admin' THEN
    RAISE EXCEPTION 'Only an admin can change user roles' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

-- ── 2. PIN lockout ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pin_failed_attempts (
  id           BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  attempt_key  TEXT        NOT NULL,   -- 'email:<address>' or 'project:<uuid>'
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pin_failed_attempts_key_time_idx
  ON public.pin_failed_attempts (attempt_key, attempted_at DESC);

-- Internal bookkeeping: RLS on with no policies, and no app access at all.
ALTER TABLE public.pin_failed_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pin_failed_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.pin_assert_not_locked(p_key TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM pin_failed_attempts
      WHERE attempt_key = p_key AND attempted_at > now() - interval '15 minutes') >= 5
  OR (SELECT count(*) FROM pin_failed_attempts
      WHERE attempt_key = p_key AND attempted_at > now() - interval '24 hours') >= 20 THEN
    RAISE EXCEPTION 'Too many incorrect PIN attempts. Please wait 15 minutes and try again, or contact your contractor.'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.pin_record_failure(p_key TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO pin_failed_attempts (attempt_key) VALUES (p_key);
  DELETE FROM pin_failed_attempts WHERE attempted_at < now() - interval '2 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.pin_is_valid(p_project_id UUID, p_pin TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND project_pin = TRIM(p_pin));
$$;

REVOKE ALL ON FUNCTION public.pin_assert_not_locked(TEXT)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pin_record_failure(TEXT)     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pin_is_valid(UUID, TEXT)     FROM PUBLIC, anon, authenticated;

-- Move each original PIN function aside (once) and lock it down.
DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'verify_project_pin(text, text)',
    'get_pin_portal_data(uuid, text)',
    'get_new_pin_messages(uuid, text, timestamptz)',
    'send_pin_message(uuid, text, text)'
  ] LOOP
    IF to_regprocedure('public.' || replace(f, '(', '_unguarded(')) IS NULL THEN
      EXECUTE format('ALTER FUNCTION public.%s RENAME TO %s',
                     f, split_part(f, '(', 1) || '_unguarded');
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated',
                   replace(f, '(', '_unguarded('));
  END LOOP;
END $$;

-- Guards with the original names and signatures (the app calls these).
CREATE OR REPLACE FUNCTION public.verify_project_pin(p_email TEXT, p_pin TEXT)
RETURNS TABLE(project_id UUID, project_name TEXT, client_name TEXT, label TEXT, category TEXT)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key TEXT := 'email:' || lower(trim(coalesce(p_email, '')));
BEGIN
  PERFORM pin_assert_not_locked(v_key);
  RETURN QUERY SELECT * FROM verify_project_pin_unguarded(p_email, p_pin);
  IF NOT FOUND THEN
    PERFORM pin_record_failure(v_key);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pin_portal_data(p_project_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key TEXT := 'project:' || coalesce(p_project_id::text, '');
BEGIN
  PERFORM pin_assert_not_locked(v_key);
  IF NOT pin_is_valid(p_project_id, p_pin) THEN
    PERFORM pin_record_failure(v_key);
    RETURN NULL;
  END IF;
  RETURN get_pin_portal_data_unguarded(p_project_id, p_pin);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_new_pin_messages(p_project_id UUID, p_pin TEXT, p_after TIMESTAMPTZ)
RETURNS TABLE(id UUID, sender_role TEXT, content TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key TEXT := 'project:' || coalesce(p_project_id::text, '');
BEGIN
  PERFORM pin_assert_not_locked(v_key);
  IF NOT pin_is_valid(p_project_id, p_pin) THEN
    PERFORM pin_record_failure(v_key);
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM get_new_pin_messages_unguarded(p_project_id, p_pin, p_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_pin_message(p_project_id UUID, p_pin TEXT, p_content TEXT)
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
  RETURN send_pin_message_unguarded(p_project_id, p_pin, p_content);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_project_pin(TEXT, TEXT)                    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pin_portal_data(UUID, TEXT)                   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_new_pin_messages(UUID, TEXT, TIMESTAMPTZ)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_pin_message(UUID, TEXT, TEXT)                TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
