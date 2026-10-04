-- Migration 041: Clients review and sign proposals in the PIN portal
--
-- Admin "Send to client" freezes a copy of the proposal (sent_snapshot) and
-- publishes it to that project's portal. The client reads the frozen copy and
-- either accepts & signs (typed names + agreement) or declines. Signing and
-- declining only happen through the PIN-guarded functions below; an accepted
-- proposal can no longer be changed or deleted.
--
-- Safe to re-run.

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS sent_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_snapshot    JSONB,
  ADD COLUMN IF NOT EXISTS signatures       JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS accepted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decline_reason   TEXT,
  ADD COLUMN IF NOT EXISTS signer_ip        TEXT,
  ADD COLUMN IF NOT EXISTS signer_user_agent TEXT;

-- ── Rules for changes made through the app (anon / authenticated) ─────────────
-- SECURITY INVOKER on purpose: current_user is the role that issued the
-- statement ('authenticated' from the app, the owner inside the PIN functions).
CREATE OR REPLACE FUNCTION public.guard_proposal_changes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_app BOOLEAN := current_user IN ('anon', 'authenticated');
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'accepted' THEN
      RAISE EXCEPTION 'A signed proposal cannot be deleted' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'accepted' THEN
    RAISE EXCEPTION 'This proposal was signed by the client and is locked' USING ERRCODE = '42501';
  END IF;

  IF v_app THEN
    -- Only the client (through the PIN functions) can accept or decline.
    IF NEW.status IN ('accepted', 'declined')
       AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
      RAISE EXCEPTION 'Only the client can accept or decline a proposal' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      NEW.signatures := '[]'; NEW.accepted_at := NULL; NEW.declined_at := NULL;
      NEW.decline_reason := NULL; NEW.signer_ip := NULL; NEW.signer_user_agent := NULL;
    ELSE
      NEW.signatures := OLD.signatures; NEW.accepted_at := OLD.accepted_at;
      NEW.declined_at := OLD.declined_at; NEW.decline_reason := OLD.decline_reason;
      NEW.signer_ip := OLD.signer_ip; NEW.signer_user_agent := OLD.signer_user_agent;
    END IF;
    IF NEW.status = 'sent' AND (NEW.project_id IS NULL OR NEW.sent_snapshot IS NULL) THEN
      RAISE EXCEPTION 'Pick the project before sending the proposal to the client';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proposals_guard ON public.proposals;
CREATE TRIGGER proposals_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.guard_proposal_changes();

-- ── PIN portal functions ──────────────────────────────────────────────────────
-- Proposals sent to this project (frozen copies only).
CREATE OR REPLACE FUNCTION public.get_pin_proposals(p_project_id UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key TEXT := 'project:' || coalesce(p_project_id::text, '');
BEGIN
  PERFORM pin_assert_not_locked(v_key);
  IF NOT pin_is_valid(p_project_id, p_pin) THEN
    PERFORM pin_record_failure(v_key);
    RETURN NULL;
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'status', status, 'sent_at', sent_at, 'snapshot', sent_snapshot,
      'signatures', signatures, 'accepted_at', accepted_at, 'declined_at', declined_at
    ) ORDER BY sent_at DESC)
    FROM proposals
    WHERE project_id = p_project_id
      AND status IN ('sent', 'accepted', 'declined')
      AND sent_snapshot IS NOT NULL
  ), '[]'::jsonb);
END;
$$;

-- Client accepts & signs. p_names: one or two typed full names.
CREATE OR REPLACE FUNCTION public.sign_pin_proposal(
  p_project_id UUID, p_pin TEXT, p_proposal_id UUID, p_names TEXT[], p_agree BOOLEAN, p_user_agent TEXT
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key   TEXT := 'project:' || coalesce(p_project_id::text, '');
  v_names TEXT[];
  v_now   TIMESTAMPTZ := now();
  v_hdrs  JSON;
BEGIN
  PERFORM pin_assert_not_locked(v_key);
  IF NOT pin_is_valid(p_project_id, p_pin) THEN
    PERFORM pin_record_failure(v_key);
    RETURN jsonb_build_object('ok', false, 'error', 'Your session has expired. Please sign in again.');
  END IF;
  IF p_agree IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please check the box to agree to sign electronically.');
  END IF;

  SELECT array_agg(btrim(n)) INTO v_names
  FROM unnest(coalesce(p_names, '{}')) AS n WHERE btrim(n) <> '';
  IF coalesce(array_length(v_names, 1), 0) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Type your full name to sign.');
  END IF;
  IF array_length(v_names, 1) > 2 OR EXISTS (SELECT 1 FROM unnest(v_names) n WHERE length(n) > 100) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter up to two names, each under 100 characters.');
  END IF;

  BEGIN v_hdrs := current_setting('request.headers', true)::json; EXCEPTION WHEN OTHERS THEN v_hdrs := NULL; END;

  UPDATE proposals SET
    status            = 'accepted',
    accepted_at       = v_now,
    signatures        = (SELECT jsonb_agg(jsonb_build_object('name', n, 'signed_at', v_now)) FROM unnest(v_names) n),
    signer_ip         = left(split_part(coalesce(v_hdrs->>'x-forwarded-for', v_hdrs->>'x-real-ip', ''), ',', 1), 64),
    signer_user_agent = left(coalesce(p_user_agent, v_hdrs->>'user-agent', ''), 300)
  WHERE id = p_proposal_id AND project_id = p_project_id AND status = 'sent';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This proposal is no longer open for signing.');
  END IF;
  RETURN jsonb_build_object('ok', true, 'accepted_at', v_now);
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_pin_proposal(p_project_id UUID, p_pin TEXT, p_proposal_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_key TEXT := 'project:' || coalesce(p_project_id::text, '');
BEGIN
  PERFORM pin_assert_not_locked(v_key);
  IF NOT pin_is_valid(p_project_id, p_pin) THEN
    PERFORM pin_record_failure(v_key);
    RETURN jsonb_build_object('ok', false, 'error', 'Your session has expired. Please sign in again.');
  END IF;
  UPDATE proposals SET status = 'declined', declined_at = now(), decline_reason = left(nullif(btrim(p_reason), ''), 1000)
  WHERE id = p_proposal_id AND project_id = p_project_id AND status = 'sent';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This proposal is no longer open.');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_pin_proposals(UUID, TEXT)                                   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_pin_proposal(UUID, TEXT, UUID, TEXT[], BOOLEAN, TEXT)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decline_pin_proposal(UUID, TEXT, UUID, TEXT)                    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pin_proposals(UUID, TEXT)                                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_pin_proposal(UUID, TEXT, UUID, TEXT[], BOOLEAN, TEXT)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decline_pin_proposal(UUID, TEXT, UUID, TEXT)                 TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
