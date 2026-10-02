-- Migration 033: Clients may only approve or decline a change order
--
-- "change_works: client update status" lets a client UPDATE any column of a
-- change order on their own project, e.g. set new_cost to 0. This trigger
-- limits app users who are not admins to the approve/decline fields
-- (status, approved_at, approved_by, declined_at), and only while the change
-- order is still pending; the decision itself must be approved or declined.
-- Admins, the SQL editor and the service role are unaffected.
--
-- Safe to re-run.

-- SECURITY INVOKER on purpose: current_user is the role that issued the UPDATE.
CREATE OR REPLACE FUNCTION public.restrict_client_change_order_update()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  -- Columns a client's approve/decline may touch (updated_at in case a
  -- timestamp trigger maintains it).
  client_cols TEXT[] := ARRAY['status', 'approved_at', 'approved_by', 'declined_at', 'updated_at'];
BEGIN
  IF current_user NOT IN ('anon', 'authenticated')
     OR COALESCE(public.get_user_role(), '') = 'admin' THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'This change order has already been %.', OLD.status USING ERRCODE = '42501';
  END IF;

  IF (to_jsonb(NEW) - client_cols) IS DISTINCT FROM (to_jsonb(OLD) - client_cols) THEN
    RAISE EXCEPTION 'Clients can only approve or decline a change order.' USING ERRCODE = '42501';
  END IF;

  IF NEW.status NOT IN ('approved', 'declined') THEN
    RAISE EXCEPTION 'A change order can only be approved or declined.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS change_works_restrict_client_update ON public.change_works;
CREATE TRIGGER change_works_restrict_client_update
  BEFORE UPDATE ON public.change_works
  FOR EACH ROW EXECUTE FUNCTION public.restrict_client_change_order_update();
