-- Migration 043: Upload a signed paper copy (backup to signing in the portal)
--
-- 1. Private "signed-documents" storage bucket (admin only).
-- 2. signed_file_path / signed_on_paper on proposals and contracts.
-- 3. The guard triggers from 041 / 042 now also accept "signed on paper":
--    an admin update that attaches a new signed copy may mark a proposal
--    accepted, or a contract fully signed. Nothing else changes.
--
-- Safe to re-run.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signed-documents', 'signed-documents', false, 15728640,   -- 15 MB per file
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 15728640,
  allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'];

DROP POLICY IF EXISTS "signed-documents: admin read"   ON storage.objects;
DROP POLICY IF EXISTS "signed-documents: admin upload" ON storage.objects;
DROP POLICY IF EXISTS "signed-documents: admin delete" ON storage.objects;

CREATE POLICY "signed-documents: admin read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'signed-documents' AND get_user_role() = 'admin');

CREATE POLICY "signed-documents: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signed-documents' AND get_user_role() = 'admin');

CREATE POLICY "signed-documents: admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'signed-documents' AND get_user_role() = 'admin');

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS signed_file_path TEXT,
  ADD COLUMN IF NOT EXISTS signed_on_paper  BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS signed_file_path TEXT,
  ADD COLUMN IF NOT EXISTS signed_on_paper  BOOLEAN NOT NULL DEFAULT false;

-- ── Proposals guard (041) + signed on paper ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_proposal_changes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_app   BOOLEAN := current_user IN ('anon', 'authenticated');
  v_paper BOOLEAN;
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
    -- Signed on paper: an update that attaches a new signed copy and accepts.
    v_paper := TG_OP = 'UPDATE' AND NEW.status = 'accepted'
               AND NEW.signed_file_path IS NOT NULL
               AND NEW.signed_file_path IS DISTINCT FROM OLD.signed_file_path;

    IF NEW.status IN ('accepted', 'declined') AND NOT v_paper
       AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
      RAISE EXCEPTION 'Only the client can accept or decline a proposal' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'INSERT' THEN
      NEW.signatures := '[]'; NEW.accepted_at := NULL; NEW.declined_at := NULL;
      NEW.decline_reason := NULL; NEW.signer_ip := NULL; NEW.signer_user_agent := NULL;
      NEW.signed_file_path := NULL; NEW.signed_on_paper := false;
    ELSE
      NEW.signatures := OLD.signatures; NEW.accepted_at := OLD.accepted_at;
      NEW.declined_at := OLD.declined_at; NEW.decline_reason := OLD.decline_reason;
      NEW.signer_ip := OLD.signer_ip; NEW.signer_user_agent := OLD.signer_user_agent;
      IF v_paper THEN
        NEW.accepted_at := now(); NEW.signed_on_paper := true;
        RETURN NEW;
      END IF;
      NEW.signed_file_path := OLD.signed_file_path; NEW.signed_on_paper := OLD.signed_on_paper;
    END IF;
    IF NEW.status = 'sent' AND (NEW.project_id IS NULL OR NEW.sent_snapshot IS NULL) THEN
      RAISE EXCEPTION 'Pick the project before sending the proposal to the client';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── Contracts guard (042) + signed on paper ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_contract_changes()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_app   BOOLEAN := current_user IN ('anon', 'authenticated');
  v_name  TEXT;
  v_paper BOOLEAN;
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

  IF TG_OP = 'INSERT' THEN
    NEW.client_signatures := '[]'; NEW.client_signed_at := NULL; NEW.declined_at := NULL;
    NEW.decline_reason := NULL; NEW.signer_ip := NULL; NEW.signer_user_agent := NULL;
    NEW.contractor_signature := NULL; NEW.contractor_signed_at := NULL;
    NEW.signed_file_path := NULL; NEW.signed_on_paper := false;
    IF NEW.status NOT IN ('draft', 'sent') THEN
      RAISE EXCEPTION 'A new contract must start as a draft' USING ERRCODE = '42501';
    END IF;
  ELSE
    NEW.client_signatures := OLD.client_signatures; NEW.client_signed_at := OLD.client_signed_at;
    NEW.declined_at := OLD.declined_at; NEW.decline_reason := OLD.decline_reason;
    NEW.signer_ip := OLD.signer_ip; NEW.signer_user_agent := OLD.signer_user_agent;

    -- Signed on paper: an update that attaches a new signed copy and completes it.
    v_paper := NEW.status = 'signed' AND NEW.signed_file_path IS NOT NULL
               AND NEW.signed_file_path IS DISTINCT FROM OLD.signed_file_path;
    IF v_paper THEN
      IF OLD.status = 'client_signed' THEN
        NEW.form_data := OLD.form_data; NEW.sent_snapshot := OLD.sent_snapshot; NEW.sent_at := OLD.sent_at;
      END IF;
      NEW.contractor_signature := OLD.contractor_signature;
      NEW.contractor_signed_at := now(); NEW.signed_on_paper := true;
      RETURN NEW;
    END IF;
    NEW.signed_file_path := OLD.signed_file_path; NEW.signed_on_paper := OLD.signed_on_paper;

    IF OLD.status = 'client_signed' THEN
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

NOTIFY pgrst, 'reload schema';
