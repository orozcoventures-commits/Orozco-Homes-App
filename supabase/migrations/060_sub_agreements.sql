-- Migration 060: Subcontractor Standards + Subcontract Agreements
--
-- Part 1. sub_standards_versions: the Subcontractor Standards (Exhibit A for
--   all trades, Exhibit B per trade). Admins edit them in Subcontractors →
--   Standards; every publish adds a new version (the built-in text in the app
--   is version 1). Versions are never changed or deleted.
-- Part 2. sub_agreements: one Subcontract Agreement per trade per job, made in
--   Remodel Estimates → Subs & Materials. Draft → Sent (the content is frozen
--   in `snapshot`, including the standards version) → Signed by the
--   subcontractor through a private link → Countersigned by Orozco Homes.
--   A signed agreement can't be changed or deleted.
-- Part 3. The private link functions (/s/<code>, no login): read the frozen
--   agreement and sign it. Nothing else is reachable from the link.
--
-- Admins only, like the budgets. Safe to re-run.

-- ── Part 1: standards versions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sub_standards_versions (
  version_no   INTEGER     PRIMARY KEY CHECK (version_no >= 2),
  content      JSONB       NOT NULL CHECK (jsonb_typeof(content) = 'object' AND octet_length(content::text) <= 200000),
  notes        TEXT        NOT NULL DEFAULT '' CHECK (char_length(notes) <= 300),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_by UUID        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.sub_standards_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_standards_versions: admin read" ON public.sub_standards_versions;
CREATE POLICY "sub_standards_versions: admin read"
  ON public.sub_standards_versions FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "sub_standards_versions: admin publish" ON public.sub_standards_versions;
CREATE POLICY "sub_standards_versions: admin publish"
  ON public.sub_standards_versions FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

-- ── Part 2: agreements ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sub_agreements (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  trade_key            TEXT        NOT NULL CHECK (trade_key ~ '^[a-z-]{2,30}$'),
  sub_id               INTEGER     REFERENCES public.subcontractor_directory(id) ON DELETE SET NULL,
  sub_name             TEXT        NOT NULL CHECK (char_length(sub_name) BETWEEN 1 AND 120),
  status               TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'countersigned')),
  terms                JSONB       NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(terms) = 'object' AND octet_length(terms::text) <= 50000),
  snapshot             JSONB       CHECK (snapshot IS NULL OR (jsonb_typeof(snapshot) = 'object' AND octet_length(snapshot::text) <= 300000)),
  access_token         TEXT        NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  sent_at              TIMESTAMPTZ,
  sub_signature        JSONB,
  sub_signed_at        TIMESTAMPTZ,
  signer_ip            TEXT,
  signer_user_agent    TEXT,
  contractor_signature JSONB,
  contractor_signed_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID        DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS sub_agreements_access_token_key ON public.sub_agreements (access_token);
CREATE INDEX IF NOT EXISTS sub_agreements_project_idx ON public.sub_agreements (project_id);
-- Only one open (draft or sent) agreement per trade per job.
CREATE UNIQUE INDEX IF NOT EXISTS sub_agreements_one_open ON public.sub_agreements (project_id, trade_key)
  WHERE status IN ('draft', 'sent');

ALTER TABLE public.sub_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_agreements: admin all" ON public.sub_agreements;
CREATE POLICY "sub_agreements: admin all"
  ON public.sub_agreements FOR ALL TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP TRIGGER IF EXISTS sub_agreements_set_updated_at ON public.sub_agreements;
CREATE TRIGGER sub_agreements_set_updated_at
  BEFORE UPDATE ON public.sub_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Rules for changes made through the app. SECURITY INVOKER on purpose:
-- current_user is 'authenticated' from the app, the owner inside the link
-- functions below.
CREATE OR REPLACE FUNCTION public.guard_sub_agreement_changes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_app  BOOLEAN := current_user IN ('anon', 'authenticated');
  v_name TEXT;
  v_sig  JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('signed', 'countersigned') THEN
      RAISE EXCEPTION 'A signed agreement cannot be deleted' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF NOT v_app THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'A new agreement starts as a draft' USING ERRCODE = '42501';
    END IF;
    NEW.snapshot := NULL; NEW.sent_at := NULL;
    NEW.sub_signature := NULL; NEW.sub_signed_at := NULL; NEW.signer_ip := NULL; NEW.signer_user_agent := NULL;
    NEW.contractor_signature := NULL; NEW.contractor_signed_at := NULL;
    NEW.access_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    RETURN NEW;
  END IF;

  -- Countersigning is the only change allowed after the subcontractor signs.
  IF OLD.status = 'countersigned' THEN
    RAISE EXCEPTION 'This agreement is fully signed and locked' USING ERRCODE = '42501';
  END IF;
  IF OLD.status = 'signed' THEN
    IF NEW.status <> 'countersigned' THEN
      RAISE EXCEPTION 'This agreement was signed by the subcontractor and is locked' USING ERRCODE = '42501';
    END IF;
    v_name := btrim(coalesce(NEW.contractor_signature->>'name', ''));
    IF v_name = '' OR length(v_name) > 100 THEN
      RAISE EXCEPTION 'Type your full name to countersign';
    END IF;
    v_sig := jsonb_build_object('name', v_name, 'title', left(btrim(coalesce(NEW.contractor_signature->>'title', '')), 100));
    NEW := OLD;
    NEW.status := 'countersigned';
    NEW.contractor_signature := v_sig;
    NEW.contractor_signed_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Draft or sent: only the subcontractor (through the link) can sign.
  IF NEW.status IN ('signed', 'countersigned') THEN
    RAISE EXCEPTION 'Only the subcontractor can sign through their link' USING ERRCODE = '42501';
  END IF;
  NEW.sub_signature := OLD.sub_signature; NEW.sub_signed_at := OLD.sub_signed_at;
  NEW.signer_ip := OLD.signer_ip; NEW.signer_user_agent := OLD.signer_user_agent;
  NEW.contractor_signature := OLD.contractor_signature; NEW.contractor_signed_at := OLD.contractor_signed_at;
  NEW.project_id := OLD.project_id; NEW.trade_key := OLD.trade_key;

  IF NEW.status = 'sent' THEN
    IF NEW.snapshot IS NULL THEN
      RAISE EXCEPTION 'Send the agreement from Subs & Materials';
    END IF;
    IF OLD.status = 'sent' THEN
      -- A sent agreement is frozen; take it back to a draft to change it.
      NEW.snapshot := OLD.snapshot; NEW.terms := OLD.terms; NEW.sub_id := OLD.sub_id;
      NEW.sub_name := OLD.sub_name; NEW.sent_at := OLD.sent_at; NEW.access_token := OLD.access_token;
    ELSE
      NEW.sent_at := now();
      NEW.access_token := OLD.access_token;
    END IF;
  ELSE
    -- Draft (new, or taken back): no frozen copy, and any link already sent stops working.
    NEW.snapshot := NULL; NEW.sent_at := NULL;
    IF OLD.status = 'sent' THEN
      NEW.access_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    ELSE
      NEW.access_token := OLD.access_token;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sub_agreements_guard ON public.sub_agreements;
CREATE TRIGGER sub_agreements_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.sub_agreements
  FOR EACH ROW EXECUTE FUNCTION public.guard_sub_agreement_changes();

-- ── Part 3: private link functions ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_sub_agreement_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r sub_agreements%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) <> 64 THEN RETURN NULL; END IF;
  SELECT * INTO r FROM sub_agreements WHERE access_token = p_token AND status <> 'draft';
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'status', r.status, 'snapshot', r.snapshot, 'sent_at', r.sent_at,
    'sub_signature', r.sub_signature, 'sub_signed_at', r.sub_signed_at,
    'contractor_signature', r.contractor_signature, 'contractor_signed_at', r.contractor_signed_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.sign_sub_agreement_by_token(p_token TEXT, p_name TEXT, p_title TEXT, p_agree BOOLEAN, p_user_agent TEXT)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT := btrim(coalesce(p_name, ''));
  v_now  TIMESTAMPTZ := now();
  v_hdrs JSON;
BEGIN
  IF p_token IS NULL OR length(p_token) <> 64 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This agreement link is not valid.');
  END IF;
  IF p_agree IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please check the box to agree to sign electronically.');
  END IF;
  IF v_name = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Type your full name to sign.');
  END IF;
  IF length(v_name) > 100 OR length(coalesce(p_title, '')) > 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Keep your name and title under 100 characters.');
  END IF;

  BEGIN v_hdrs := current_setting('request.headers', true)::json; EXCEPTION WHEN OTHERS THEN v_hdrs := NULL; END;

  UPDATE sub_agreements SET
    status            = 'signed',
    sub_signature     = jsonb_build_object('name', v_name, 'title', btrim(coalesce(p_title, ''))),
    sub_signed_at     = v_now,
    signer_ip         = left(split_part(coalesce(v_hdrs->>'x-forwarded-for', v_hdrs->>'x-real-ip', ''), ',', 1), 64),
    signer_user_agent = left(coalesce(p_user_agent, v_hdrs->>'user-agent', ''), 300)
  WHERE access_token = p_token AND status = 'sent';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This agreement is no longer open for signing.');
  END IF;
  RETURN jsonb_build_object('ok', true, 'signed_at', v_now);
END;
$$;

REVOKE ALL ON FUNCTION public.get_sub_agreement_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_sub_agreement_by_token(TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sub_agreement_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_sub_agreement_by_token(TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
