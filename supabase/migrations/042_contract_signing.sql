-- Migration 042: Clients sign contracts in the PIN portal; Orozco Homes countersigns
--
-- Flow: draft → sent (frozen copy in sent_snapshot) → client_signed (1–2 client
-- signers, through the PIN functions) → signed (admin countersigns in the app).
-- The client can decline a sent contract. Once the client has signed, the
-- contract text can no longer change; once fully signed it is locked.
--
-- Safe to re-run.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS sent_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_snapshot        JSONB,
  ADD COLUMN IF NOT EXISTS client_signatures    JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS client_signed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contractor_signature JSONB,
  ADD COLUMN IF NOT EXISTS contractor_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decline_reason       TEXT,
  ADD COLUMN IF NOT EXISTS signer_ip            TEXT,
  ADD COLUMN IF NOT EXISTS signer_user_agent    TEXT;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'sent', 'client_signed', 'signed', 'declined', 'voided'));

-- SECURITY INVOKER on purpose: current_user is 'authenticated' for the app and
-- the owner inside the PIN functions below.
CREATE OR REPLACE FUNCTION public.guard_contract_changes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_app  BOOLEAN := current_user IN ('anon', 'authenticated');
  v_name TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('client_signed', 'signed') THEN
      RAISE EXCEPTION 'A signed contract cannot be deleted' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'signed' THEN
    RAISE EXCEPTION 'This contract is fully signed and locked' USING ERRCODE = '42501';
  END IF;

  IF NOT v_app THEN
    RETURN NEW;
  END IF;

  -- Client signature and audit fields are only written by the PIN functions.
  IF TG_OP = 'INSERT' THEN
    NEW.client_signatures := '[]'; NEW.client_signed_at := NULL; NEW.declined_at := NULL;
    NEW.decline_reason := NULL; NEW.signer_ip := NULL; NEW.signer_user_agent := NULL;
    NEW.contractor_signature := NULL; NEW.contractor_signed_at := NULL;
    IF NEW.status NOT IN ('draft', 'sent') THEN
      RAISE EXCEPTION 'A new contract must start as a draft' USING ERRCODE = '42501';
    END IF;
  ELSE
    NEW.client_signatures := OLD.client_signatures; NEW.client_signed_at := OLD.client_signed_at;
    NEW.declined_at := OLD.declined_at; NEW.decline_reason := OLD.decline_reason;
    NEW.signer_ip := OLD.signer_ip; NEW.signer_user_agent := OLD.signer_user_agent;

    IF OLD.status = 'client_signed' THEN
      -- The client signed this exact text: only the countersignature can be added.
      NEW.form_data := OLD.form_data; NEW.sent_snapshot := OLD.sent_snapshot; NEW.sent_at := OLD.sent_at;
      NEW.client_name := OLD.client_name; NEW.project_address := OLD.project_address;
      NEW.contract_date := OLD.contract_date; NEW.project_id := OLD.project_id;
      NEW.managed_client_id := OLD.managed_client_id;
      IF NEW.status = 'signed' THEN
        v_name := btrim(coalesce(NEW.contractor_signature->>'name', ''));
        IF v_name = '' OR length(v_name) > 100 THEN
          RAISE EXCEPTION 'Type your full name to countersign';
        END IF;
        NEW.contractor_signed_at := now();
        NEW.contractor_signature := jsonb_build_object(
          'name', v_name,
          'title', left(coalesce(NEW.contractor_signature->>'title', ''), 100),
          'signed_at', NEW.contractor_signed_at);
      ELSIF NEW.status = 'client_signed' THEN
        NEW.contractor_signature := OLD.contractor_signature; NEW.contractor_signed_at := OLD.contractor_signed_at;
      ELSE
        RAISE EXCEPTION 'The client already signed this contract; it can only be countersigned' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;

    NEW.contractor_signature := OLD.contractor_signature; NEW.contractor_signed_at := OLD.contractor_signed_at;
    IF NEW.status IN ('client_signed', 'signed', 'declined') AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Only the client can sign or decline; countersign after the client signs' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.status = 'sent' AND (NEW.project_id IS NULL OR NEW.sent_snapshot IS NULL) THEN
    RAISE EXCEPTION 'Pick the project before sending the contract to the client';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contracts_guard ON public.contracts;
CREATE TRIGGER contracts_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.guard_contract_changes();

-- ── PIN portal functions ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_pin_contracts(p_project_id UUID, p_pin TEXT)
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
      'signatures', client_signatures, 'accepted_at', client_signed_at, 'declined_at', declined_at,
      'contractor_signature', contractor_signature
    ) ORDER BY sent_at DESC)
    FROM contracts
    WHERE project_id = p_project_id
      AND status IN ('sent', 'client_signed', 'signed', 'declined')
      AND sent_snapshot IS NOT NULL
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.sign_pin_contract(
  p_project_id UUID, p_pin TEXT, p_contract_id UUID, p_names TEXT[], p_agree BOOLEAN, p_user_agent TEXT
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

  UPDATE contracts SET
    status            = 'client_signed',
    client_signed_at  = v_now,
    client_signatures = (SELECT jsonb_agg(jsonb_build_object('name', n, 'signed_at', v_now)) FROM unnest(v_names) n),
    signer_ip         = left(split_part(coalesce(v_hdrs->>'x-forwarded-for', v_hdrs->>'x-real-ip', ''), ',', 1), 64),
    signer_user_agent = left(coalesce(p_user_agent, v_hdrs->>'user-agent', ''), 300)
  WHERE id = p_contract_id AND project_id = p_project_id AND status = 'sent';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This contract is no longer open for signing.');
  END IF;
  RETURN jsonb_build_object('ok', true, 'accepted_at', v_now);
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_pin_contract(p_project_id UUID, p_pin TEXT, p_contract_id UUID, p_reason TEXT)
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
  UPDATE contracts SET status = 'declined', declined_at = now(), decline_reason = left(nullif(btrim(p_reason), ''), 1000)
  WHERE id = p_contract_id AND project_id = p_project_id AND status = 'sent';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This contract is no longer open.');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_pin_contracts(UUID, TEXT)                                   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_pin_contract(UUID, TEXT, UUID, TEXT[], BOOLEAN, TEXT)      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decline_pin_contract(UUID, TEXT, UUID, TEXT)                    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pin_contracts(UUID, TEXT)                                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_pin_contract(UUID, TEXT, UUID, TEXT[], BOOLEAN, TEXT)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decline_pin_contract(UUID, TEXT, UUID, TEXT)                 TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
