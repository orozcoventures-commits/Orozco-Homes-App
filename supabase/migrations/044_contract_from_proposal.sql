-- Migration 044: Remember which signed proposal a contract was created from
--
-- "Create Contract from this proposal" fills the contract from the signed
-- proposal and stores its id here. Optional; NULL for other contracts.
--
-- Safe to re-run.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_proposal_id ON public.contracts (proposal_id);

NOTIFY pgrst, 'reload schema';
