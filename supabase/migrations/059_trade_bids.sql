-- Migration 059: subcontractor bids per trade
--
-- In Remodel Estimates → Subs & Materials, each trade can record the quotes
-- received from subcontractors (who, amount, date, notes) and mark the one
-- selected. Compared with the trade's budget in the app. Admins only.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.remodel_trade_bids (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID          NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  trade_key   TEXT          NOT NULL CHECK (trade_key ~ '^[a-z-]{2,30}$'),
  sub_id      INTEGER       REFERENCES public.subcontractor_directory(id) ON DELETE SET NULL,
  sub_name    TEXT          NOT NULL CHECK (char_length(sub_name) BETWEEN 1 AND 120),
  amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  bid_date    DATE,
  notes       TEXT          NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  selected    BOOLEAN       NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by  UUID          DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS remodel_trade_bids_project_idx ON public.remodel_trade_bids (project_id);

ALTER TABLE public.remodel_trade_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "remodel_trade_bids: admin all" ON public.remodel_trade_bids;
CREATE POLICY "remodel_trade_bids: admin all"
  ON public.remodel_trade_bids
  FOR ALL
  TO authenticated
  USING  (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

DROP TRIGGER IF EXISTS remodel_trade_bids_set_updated_at ON public.remodel_trade_bids;
CREATE TRIGGER remodel_trade_bids_set_updated_at
  BEFORE UPDATE ON public.remodel_trade_bids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
