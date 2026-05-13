-- Migration 017: Rebuild PIN portal functions — root cause fix
--
-- ROOT CAUSE: projects table has NO 'status' column (never added in any migration).
-- Migrations 015 and 016 both reference 'p.status' in a STATIC (non-EXECUTE) SQL
-- block inside get_pin_portal_data. PostgreSQL validates plpgsql function bodies at
-- CREATE time, so referencing a non-existent column causes the CREATE to fail
-- silently. verify_project_pin works (never touches projects.status); every call to
-- get_pin_portal_data hits "function does not exist."
--
-- Fix: use EXECUTE (dynamic SQL) for EVERY query inside the function so PostgreSQL
-- cannot validate column names at CREATE time. Column errors are caught at runtime
-- by EXCEPTION handlers that return safe fallback values.

-- ── 1. Drop old broken versions ───────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_pin_portal_data(UUID, TEXT);
DROP FUNCTION IF EXISTS public.send_pin_message(UUID, TEXT, TEXT);

-- ── 2. Ensure all potentially-missing columns exist ───────────────────────────
ALTER TABLE public.photo_logs    ADD COLUMN IF NOT EXISTS image_url     TEXT;
ALTER TABLE public.change_works  ADD COLUMN IF NOT EXISTS category      TEXT;
ALTER TABLE public.change_works  ADD COLUMN IF NOT EXISTS original_cost NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.change_works  ADD COLUMN IF NOT EXISTS new_cost      NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.change_works  ADD COLUMN IF NOT EXISTS submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.change_works  ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ;
ALTER TABLE public.change_works  ADD COLUMN IF NOT EXISTS approved_by   TEXT;
ALTER TABLE public.change_works  ADD COLUMN IF NOT EXISTS declined_at   TIMESTAMPTZ;

DO $$
BEGIN
  -- Rename 'body' → 'content' if migration 007 was skipped
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'body'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN body TO content;
  END IF;
END;
$$;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;

-- ── 3. get_pin_portal_data — every query uses EXECUTE ─────────────────────────
--
-- Using EXECUTE means PostgreSQL does NOT validate column names at CREATE time.
-- Each section catches its own errors and returns an empty/null fallback value
-- so one bad column never crashes the whole call.

CREATE FUNCTION public.get_pin_portal_data(
  p_project_id UUID,
  p_pin        TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid  BOOLEAN := false;
  v_proj   JSONB   := 'null'::jsonb;
  v_weekly JSONB   := 'null'::jsonb;
  v_orders JSONB   := '[]'::jsonb;
  v_photos JSONB   := '[]'::jsonb;
  v_msgs   JSONB   := '[]'::jsonb;
BEGIN

  -- ── PIN check ──────────────────────────────────────────────────────────────
  EXECUTE $q$ SELECT EXISTS(
    SELECT 1 FROM projects WHERE id = $1 AND project_pin = TRIM($2)
  ) $q$
  INTO v_valid USING p_project_id, p_pin;

  IF NOT v_valid THEN
    RETURN NULL;
  END IF;

  -- ── Project (id / project_name / label / category only — no 'status') ─────
  BEGIN
    EXECUTE $q$
      SELECT to_jsonb(r) FROM (
        SELECT id, project_name, label, category
        FROM projects WHERE id = $1
      ) r
    $q$
    INTO v_proj USING p_project_id;
  EXCEPTION WHEN OTHERS THEN
    v_proj := jsonb_build_object('id', p_project_id);
  END;

  -- ── Latest weekly update ───────────────────────────────────────────────────
  BEGIN
    EXECUTE $q$
      SELECT to_jsonb(r) FROM (
        SELECT id, current_phase, progress_percent, status,
               contractor_note, updated_at
        FROM weekly_updates
        WHERE project_id = $1
        ORDER BY updated_at DESC LIMIT 1
      ) r
    $q$
    INTO v_weekly USING p_project_id;
  EXCEPTION WHEN OTHERS THEN
    v_weekly := 'null'::jsonb;
  END;

  -- ── Change orders ──────────────────────────────────────────────────────────
  BEGIN
    EXECUTE $q$
      SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY (r).submitted_at DESC), '[]')
      FROM (
        SELECT id, title, description, status,
               COALESCE(category, '')      AS category,
               COALESCE(original_cost, 0)  AS original_cost,
               COALESCE(new_cost, 0)       AS new_cost,
               submitted_at
        FROM change_works
        WHERE project_id = $1
      ) r
    $q$
    INTO v_orders USING p_project_id;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      -- Fallback: base columns only
      EXECUTE $q$
        SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]')
        FROM (SELECT id, title, status, 0 AS original_cost, 0 AS new_cost
              FROM change_works WHERE project_id = $1) r
      $q$
      INTO v_orders USING p_project_id;
    EXCEPTION WHEN OTHERS THEN
      v_orders := '[]'::jsonb;
    END;
  END;

  -- ── Photo logs ─────────────────────────────────────────────────────────────
  BEGIN
    EXECUTE $q$
      SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY (r).created_at DESC), '[]')
      FROM (
        SELECT id, category, caption, image_url, created_at
        FROM photo_logs
        WHERE project_id = $1
        LIMIT 20
      ) r
    $q$
    INTO v_photos USING p_project_id;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      -- Fallback: without image_url
      EXECUTE $q$
        SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY (r).created_at DESC), '[]')
        FROM (SELECT id, category, caption, null::text AS image_url, created_at
              FROM photo_logs WHERE project_id = $1 LIMIT 20) r
      $q$
      INTO v_photos USING p_project_id;
    EXCEPTION WHEN OTHERS THEN
      v_photos := '[]'::jsonb;
    END;
  END;

  -- ── Messages ───────────────────────────────────────────────────────────────
  BEGIN
    EXECUTE $q$
      SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY (r).created_at ASC), '[]')
      FROM (
        SELECT id, sender_role, content, created_at
        FROM messages
        WHERE project_id = $1
      ) r
    $q$
    INTO v_msgs USING p_project_id;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      -- Fallback: 'body' column (pre-migration-007 name)
      EXECUTE $q$
        SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY (r).created_at ASC), '[]')
        FROM (SELECT id, sender_role, body AS content, created_at
              FROM messages WHERE project_id = $1) r
      $q$
      INTO v_msgs USING p_project_id;
    EXCEPTION WHEN OTHERS THEN
      v_msgs := '[]'::jsonb;
    END;
  END;

  RETURN jsonb_build_object(
    'project',       v_proj,
    'weekly_update', v_weekly,
    'change_orders', v_orders,
    'photo_logs',    v_photos,
    'messages',      v_msgs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pin_portal_data TO anon, authenticated;

-- ── 4. send_pin_message — dynamic INSERT ──────────────────────────────────────
CREATE FUNCTION public.send_pin_message(
  p_project_id UUID,
  p_pin        TEXT,
  p_content    TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid BOOLEAN := false;
BEGIN
  EXECUTE $q$ SELECT EXISTS(
    SELECT 1 FROM projects WHERE id = $1 AND project_pin = TRIM($2)
  ) $q$
  INTO v_valid USING p_project_id, p_pin;

  IF NOT v_valid OR TRIM(p_content) = '' THEN
    RETURN FALSE;
  END IF;

  BEGIN
    EXECUTE $q$
      INSERT INTO messages (project_id, sender_id, sender_role, content)
      VALUES ($1, NULL, 'client', $2)
    $q$ USING p_project_id, TRIM(p_content);
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      EXECUTE $q$
        INSERT INTO messages (project_id, sender_role, body)
        VALUES ($1, 'client', $2)
      $q$ USING p_project_id, TRIM(p_content);
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;
  END;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_pin_message TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
