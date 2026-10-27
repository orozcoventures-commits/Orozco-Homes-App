-- Migration 062: Welcome Package link for clients
--
-- The saved Welcome & Capabilities Package can be opened by anyone with the
-- link /welcome (no login), so it can be sent to new clients. This function
-- returns only the package content (null until it is saved; the app then
-- shows the original version). Nothing else is readable through it.
--
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.get_public_welcome_package()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT content FROM welcome_package WHERE id = 'default';
$$;

REVOKE ALL ON FUNCTION public.get_public_welcome_package() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_welcome_package() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
