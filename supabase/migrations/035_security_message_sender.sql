-- Migration 035: Message sender is set by the database, not the browser
--
-- messages.sender_role and sender_id came from the client request, so a
-- client could post a message labelled 'admin' (or with the admin's id) in
-- their own project, e.g. "Approved, no charge". For inserts made through the
-- app (anon/authenticated), this trigger overwrites both with the signed-in
-- user: sender_id = auth.uid(), sender_role = 'admin' for admins and
-- 'client' for everyone else. PIN-portal messages (send_pin_message, a
-- SECURITY DEFINER function) and the SQL editor are unaffected.
--
-- Safe to re-run.

-- SECURITY INVOKER on purpose: current_user is the role that issued the INSERT.
CREATE OR REPLACE FUNCTION public.set_message_sender()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.sender_id   := auth.uid();
    NEW.sender_role := CASE WHEN COALESCE(public.get_user_role(), '') = 'admin' THEN 'admin' ELSE 'client' END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_set_sender ON public.messages;
CREATE TRIGGER messages_set_sender
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_message_sender();
