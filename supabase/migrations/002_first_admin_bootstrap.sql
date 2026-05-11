-- =============================================================================
-- Orozco Homes App — First Admin Bootstrap
-- Run this in the Supabase SQL Editor AFTER 001_initial_schema.sql.
--
-- Adds:
--   • promote_to_first_admin() — securely promotes the calling user to admin
--     only when no admin account exists yet (one-time bootstrap).
--   • Fixes handle_new_user() to ignore role metadata (security hardening).
-- =============================================================================

-- ── Security fix: ignore role from signup metadata ───────────────────────────
-- Original trigger allowed passing role='admin' in signUp options.data.
-- This version always creates new users as 'client'.
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
    'client'   -- Always 'client'; call promote_to_first_admin() to bootstrap admin
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── First-admin bootstrap function ───────────────────────────────────────────
-- Promotes the currently authenticated user to 'admin' role, but ONLY if
-- no admin accounts exist yet.  Safe to leave enabled after first admin is
-- created — subsequent calls return FALSE and do nothing.
CREATE OR REPLACE FUNCTION public.promote_to_first_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INT;
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE role = 'admin';

  -- Only works when zero admins exist (bootstrap window)
  IF admin_count > 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = auth.uid();

  RETURN TRUE;
END;
$$;
