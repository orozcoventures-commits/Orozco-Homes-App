-- Migration 038: Editable "common materials" checklists (Designer Workspace)
--
-- One row per checklist item per room, shared by every project. A room with
-- no rows uses the built-in list in DesignerWorkspace.jsx. Admins and
-- designers can read and change the lists; clients cannot see them.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.room_checklist_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_category TEXT        NOT NULL
                CHECK (room_category IN ('bathroom','kitchen','bedroom','living','addition','exterior','garage','attic','other')),
  item_name     TEXT        NOT NULL CHECK (length(btrim(item_name)) BETWEEN 1 AND 80),
  sort_order    INT         NOT NULL DEFAULT 0,
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS room_checklist_items_room_name_key
  ON public.room_checklist_items (room_category, lower(item_name));

ALTER TABLE public.room_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_checklist_items: admin and designer" ON public.room_checklist_items;
CREATE POLICY "room_checklist_items: admin and designer"
  ON public.room_checklist_items FOR ALL TO authenticated
  USING      (get_user_role() IN ('admin', 'designer'))
  WITH CHECK (get_user_role() IN ('admin', 'designer'));

-- Replaces one room's list in a single transaction. SECURITY INVOKER, so the
-- policy above applies to the caller.
CREATE OR REPLACE FUNCTION public.set_room_checklist(p_room TEXT, p_items TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF COALESCE(public.get_user_role(), '') NOT IN ('admin', 'designer') THEN
    RAISE EXCEPTION 'Only admins and designers can change checklists' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(array_length(p_items, 1), 0) > 20 THEN
    RAISE EXCEPTION 'A checklist can have at most 20 items';
  END IF;

  DELETE FROM public.room_checklist_items WHERE room_category = p_room;
  INSERT INTO public.room_checklist_items (room_category, item_name, sort_order)
  SELECT p_room, btrim(name), ord::int
  FROM unnest(p_items) WITH ORDINALITY AS t(name, ord)
  WHERE btrim(name) <> '';
END;
$$;

REVOKE ALL ON FUNCTION public.set_room_checklist(TEXT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_room_checklist(TEXT, TEXT[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
