-- Migration 061: Welcome & Capabilities Package (Sales → Welcome Package)
--
-- One saved copy of the client welcome package that admins edit in the app
-- (cover, contact details and sections). Until it is saved the app shows the
-- built-in version. Admins only.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.welcome_package (
  id          TEXT        PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  content     JSONB       NOT NULL CHECK (jsonb_typeof(content) = 'object' AND octet_length(content::text) <= 300000),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.welcome_package ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "welcome_package: admin all" ON public.welcome_package;
CREATE POLICY "welcome_package: admin all"
  ON public.welcome_package FOR ALL TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP TRIGGER IF EXISTS welcome_package_set_updated_at ON public.welcome_package;
CREATE TRIGGER welcome_package_set_updated_at
  BEFORE UPDATE ON public.welcome_package
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
