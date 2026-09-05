-- Migration 020: standalone admin-role support for the Entrepreneurship
-- Club site.
--
-- Migrations 021 and 023 both use get_user_role() = 'admin' in their RLS
-- policies (the same helper the main Orozco Homes app defines in migration
-- 001) to decide who can read submitted forms. If this site is deployed
-- against its OWN, brand-new Supabase project -- not the same project the
-- Orozco Homes app uses -- that function and its backing `profiles` table
-- don't exist yet, and 021/023 would fail with
-- "function get_user_role() does not exist".
--
-- This migration creates that same profiles table + function + trigger,
-- using IF NOT EXISTS / OR REPLACE / DROP-then-CREATE everywhere so it's
-- always safe to run:
--   - On a brand-new standalone project: creates everything fresh.
--   - On the same shared project the Orozco Homes app already uses:
--     every object here already exists in an identical form from migration
--     001, so this is a harmless no-op.
--
-- Run this BEFORE 021_entrepreneurship_club.sql and 023_academy_access_requests.sql.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL DEFAULT '',
  role        TEXT        NOT NULL DEFAULT 'client'
              CHECK (role IN ('admin', 'client')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS,
-- so policies can call get_user_role() without recursing into the
-- profiles RLS policy below.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Auto-create a profile row whenever someone signs up (e.g. via the
-- Genesis Academy magic-link sign-in).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    -- Everyone signs up as 'client' by default; promote yourself to
    -- 'admin' manually afterward (see README) once you've signed in once.
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: own row or admin" ON public.profiles;
CREATE POLICY "profiles: own row or admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR get_user_role() = 'admin');

DROP POLICY IF EXISTS "profiles: update own row" ON public.profiles;
CREATE POLICY "profiles: update own row"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

NOTIFY pgrst, 'reload schema';
