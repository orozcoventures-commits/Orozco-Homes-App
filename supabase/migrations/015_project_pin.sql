-- Migration 015: Project PIN system
-- Adds a 4-digit PIN to each project so clients can log in without a password.
-- PIN is verified server-side via SECURITY DEFINER RPCs; the anon key is enough
-- to call them (no service role key needed in the frontend).

-- ── 1. Add project_pin column ─────────────────────────────────────────────────
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_pin TEXT;

-- Backfill existing projects with random 4-digit PINs
UPDATE public.projects
SET project_pin = LPAD((FLOOR(RANDOM() * 10000))::INT::TEXT, 4, '0')
WHERE project_pin IS NULL;

-- ── 2. Auto-generate PIN on INSERT ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_project_pin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_pin IS NULL OR NEW.project_pin = '' THEN
    LOOP
      NEW.project_pin := LPAD((FLOOR(RANDOM() * 10000))::INT::TEXT, 4, '0');
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.projects WHERE project_pin = NEW.project_pin
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_project_pin ON public.projects;
CREATE TRIGGER trg_generate_project_pin
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.generate_project_pin();

-- ── 3. Allow PIN-mode messages to have no sender_id ──────────────────────────
-- PIN clients don't have a Supabase auth account so sender_id can be NULL.
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;

-- ── 4. RPC: verify PIN and return project info ────────────────────────────────
-- Called with the anon key — safe because PIN + email together limit guessing.
CREATE OR REPLACE FUNCTION public.verify_project_pin(p_email TEXT, p_pin TEXT)
RETURNS TABLE(
  project_id   UUID,
  project_name TEXT,
  client_name  TEXT,
  label        TEXT,
  category     TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.project_name, c.full_name, p.label, p.category
  FROM public.projects p
  JOIN public.clients c ON c.id = p.managed_client_id
  WHERE LOWER(TRIM(c.email)) = LOWER(TRIM(p_email))
    AND p.project_pin = TRIM(p_pin)
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_project_pin TO anon, authenticated;

-- ── 5. RPC: fetch all portal data for a verified PIN session ─────────────────
CREATE OR REPLACE FUNCTION public.get_pin_portal_data(p_project_id UUID, p_pin TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_valid BOOLEAN; result JSONB;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.projects WHERE id = p_project_id AND project_pin = p_pin
  ) INTO v_valid;
  IF NOT v_valid THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'project', (
      SELECT jsonb_build_object(
        'id', p.id, 'project_name', p.project_name,
        'label', p.label, 'category', p.category, 'status', p.status
      ) FROM public.projects p WHERE p.id = p_project_id
    ),
    'weekly_update', (
      SELECT row_to_json(wu)
      FROM public.weekly_updates wu
      WHERE wu.project_id = p_project_id
      ORDER BY wu.updated_at DESC LIMIT 1
    ),
    'change_orders', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cw.id, 'title', cw.title, 'description', cw.description,
        'category', cw.category, 'original_cost', cw.original_cost,
        'new_cost', cw.new_cost, 'status', cw.status,
        'submitted_at', cw.submitted_at
      ) ORDER BY cw.submitted_at DESC), '[]'::jsonb)
      FROM public.change_works cw WHERE cw.project_id = p_project_id
    ),
    'photo_logs', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', pl.id, 'category', pl.category, 'caption', pl.caption,
        'image_url', pl.image_url, 'created_at', pl.created_at
      ) ORDER BY pl.created_at DESC), '[]'::jsonb)
      FROM public.photo_logs pl WHERE pl.project_id = p_project_id LIMIT 20
    ),
    'messages', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', m.id, 'sender_role', m.sender_role,
        'content', m.content, 'created_at', m.created_at
      ) ORDER BY m.created_at ASC), '[]'::jsonb)
      FROM public.messages m WHERE m.project_id = p_project_id
    )
  ) INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_pin_portal_data TO anon, authenticated;

-- ── 6. RPC: send a message from a PIN session ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_pin_message(
  p_project_id UUID,
  p_pin        TEXT,
  p_content    TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_valid BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.projects WHERE id = p_project_id AND project_pin = p_pin
  ) INTO v_valid;
  IF NOT v_valid OR TRIM(p_content) = '' THEN RETURN FALSE; END IF;
  INSERT INTO public.messages(project_id, sender_id, sender_role, content)
  VALUES(p_project_id, NULL, 'client', TRIM(p_content));
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_pin_message TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
