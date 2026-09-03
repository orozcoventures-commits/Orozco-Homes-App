-- Migration 022: Genesis Academy subscriptions
-- Paywall for the Entrepreneurship Club's "Genesis Academy" page
-- (entrepreneurship-club/). Members sign in with a Supabase Auth email
-- magic link, then subscribe via Stripe Checkout ($19/month). Stripe
-- webhook events (handled by the academy-stripe-webhook edge function)
-- keep ec_subscribers in sync with the real subscription status.

CREATE TABLE IF NOT EXISTS public.ec_subscribers (
  id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT        NOT NULL,
  stripe_customer_id    TEXT        UNIQUE,
  stripe_subscription_id TEXT       UNIQUE,
  status                TEXT        NOT NULL DEFAULT 'incomplete'
                        CHECK (status IN ('incomplete', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ec_subscribers_set_updated_at ON public.ec_subscribers;
CREATE TRIGGER ec_subscribers_set_updated_at
  BEFORE UPDATE ON public.ec_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.ec_subscribers ENABLE ROW LEVEL SECURITY;

-- A signed-in member can read only their own subscription status, to decide
-- whether to show them the Academy content or the paywall.
CREATE POLICY "ec_subscribers: read own row"
  ON public.ec_subscribers FOR SELECT
  USING (auth.uid() = id);

-- No INSERT/UPDATE/DELETE policy for anon or authenticated: subscription
-- rows are only ever written by the academy-checkout and
-- academy-stripe-webhook edge functions, using the service role key,
-- which bypasses RLS entirely. This prevents a member from granting
-- themselves access by writing to the table directly.

NOTIFY pgrst, 'reload schema';
