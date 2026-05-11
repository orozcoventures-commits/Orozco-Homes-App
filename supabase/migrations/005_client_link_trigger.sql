-- Update projects SELECT policy to also allow managed clients (email-matched)
DROP POLICY IF EXISTS "projects: client owns or admin" ON public.projects;

CREATE POLICY "projects: client select"
  ON public.projects FOR SELECT
  USING (
    get_user_role() = 'admin'
    OR client_id = auth.uid()
    OR managed_client_id IN (
      SELECT c.id FROM public.clients c
      WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Auto-link a newly-signed-up client's auth id to any projects already
-- assigned to them via the managed_client_id → clients.email path.
CREATE OR REPLACE FUNCTION public.link_profile_to_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email      TEXT;
  v_client_id  UUID;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;

  SELECT id INTO v_client_id
  FROM public.clients
  WHERE email = v_email
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    UPDATE public.projects
    SET client_id = NEW.id
    WHERE managed_client_id = v_client_id
      AND (client_id IS NULL OR client_id != NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_link_client ON public.profiles;
CREATE TRIGGER on_profile_created_link_client
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_profile_to_client();

-- Back-fill: link any profiles that already exist whose email matches a client
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.id AS profile_id, c.id AS client_id
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    JOIN public.clients c ON c.email = u.email
  LOOP
    UPDATE public.projects
    SET client_id = r.profile_id
    WHERE managed_client_id = r.client_id
      AND (client_id IS NULL OR client_id != r.profile_id);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
