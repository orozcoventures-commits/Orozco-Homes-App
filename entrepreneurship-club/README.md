# Entrepreneurship Club

A standalone, static marketing site for the Entrepreneurship Club — completely
independent of the Orozco Homes remodel app that lives in the rest of this
repo. It's a single-page site (Home, About, Success Stories, Membership,
Community Values, Meetings, Resources) with an EN/ES language toggle, built
with plain Vite (no React).

This directory has its own `package.json`, `vite.config.js`, and
`netlify.toml` so it can be deployed as its **own Netlify site** from this
same GitHub repo.

## Local development

```bash
cd entrepreneurship-club
npm install
npm run dev
```

Open the URL Vite prints (defaults to [http://localhost:5173](http://localhost:5173)).

## Deploying as its own Netlify site

1. In Netlify: **Add new site → Import an existing project**, and connect
   this GitHub repo (`orozco-homes-app`).
2. Under **Build settings**, set:
   - **Base directory:** `entrepreneurship-club`
   - **Build command:** `npm run build` (already set via this directory's
     `netlify.toml`)
   - **Publish directory:** `entrepreneurship-club/dist`
3. Under **Site settings → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   These can point at the same Supabase project the Orozco Homes app uses —
   this site only ever reads/writes its own tables (see below) — or a
   different project entirely. See `.env.example` in this directory.
4. Before the membership/story/access-request forms will accept
   submissions, run these (at the repo root) in that Supabase project's
   SQL Editor, in order:
   - `supabase/migrations/021_entrepreneurship_club.sql`
   - `supabase/migrations/023_academy_access_requests.sql`
5. Deploy. Once it's live, this becomes its own site with its own domain,
   deploy history, and dashboard entry — fully decoupled from the Orozco
   Homes site's deploys.

## Database scope

The forms on this site write **only** to `ec_membership_requests`,
`ec_success_stories`, and `ec_academy_requests`. All three tables are
insert-only for anonymous visitors (Row Level Security); only a profile
with `role = 'admin'` can read or moderate submissions. Nothing on this
site queries or touches any material-selection, project, or client table
from the Orozco Homes app.

## Genesis Academy paywall

The Genesis Academy page (`#academy`) is gated behind a **$19/month Stripe
subscription**. Signed-out visitors see a sign-in form (Supabase Auth email
magic link — no password); signed-in visitors without an active
subscription see a "Subscribe — $19/month" button; only an active
subscriber sees the actual Video Masterclasses / Study Vault / Entrepreneur's
Toolkit content. All of this is already built and wired up — **it just needs
a Stripe account** to actually work. Until then, the sign-in form area shows
correctly but nobody can complete a subscription.

### Access requests

Every visitor who hits the gate sees a "Request access" form (full name,
email, and why they want in) above the access-code link. Submissions are
stored in `ec_academy_requests` (migration 023) — insert-only for anonymous
visitors, readable only by an admin profile. Check that table in the
Supabase dashboard (Table Editor → `ec_academy_requests`) to see who's
asked, then follow up by email with their PIN once you approve
them. This replaces relying on people remembering to email you directly —
you get a real, timestamped list of leads to review instead.

### Interim manual access (no Stripe needed)

Below the request form there's a "Have a PIN?" link that reveals a 4-digit
PIN field — a second, completely independent unlock path for letting
specific people in before (or alongside) the paid subscription, fully
under your control:

1. Pick a 4-digit PIN and set it as an Edge Function secret:
   ```bash
   supabase secrets set ACADEMY_ACCESS_PASSWORD=<four digits, e.g. 4271>
   ```
2. Deploy the function:
   ```bash
   supabase functions deploy academy-access-check
   ```
3. Give that PIN directly to whoever you want to have access (text,
   email, however you like). They enter it once and their browser
   remembers it — no account, no email, no Stripe involved.

To revoke everyone's access at once, just change the PIN (step 1) and
redeploy — anyone who hasn't already unlocked their browser will need the
new one. The real PIN is never sent to the browser: the check happens
entirely in the Edge Function, comparing with a constant-time comparison so
a wrong guess can't leak how much of it was correct.

### One-time setup, once you have a Stripe account

1. **Create the product/price in Stripe**: Dashboard → Product catalog →
   Add product. Name it (e.g. "Genesis Academy Membership"), set it to
   **Recurring**, **$19.00**, **Monthly**. Save, then copy the **Price ID**
   (starts with `price_...`) from the product page — not the Product ID.
2. **Get your API keys**: Dashboard → Developers → API keys. Copy the
   **Secret key** (starts with `sk_live_...` or `sk_test_...` while testing).
   You will *not* need the publishable key anywhere in this project —
   checkout happens entirely server-side via a Supabase Edge Function that
   redirects to a Stripe-hosted Checkout page.
3. **Deploy the two Edge Functions** (from the repo root, with the
   [Supabase CLI](https://supabase.com/docs/guides/cli) installed and linked
   to whichever Supabase project this site's `VITE_SUPABASE_URL` points at):
   ```bash
   supabase functions deploy academy-checkout
   supabase functions deploy academy-stripe-webhook
   ```
4. **Set the Edge Function secrets** (Supabase Dashboard → Edge Functions →
   each function → Secrets, or via CLI):
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   supabase secrets set STRIPE_PRICE_ID=price_...
   supabase secrets set ACADEMY_URL=https://<your-academy-site>.netlify.app
   ```
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
   already present automatically in every Supabase project's Edge Functions —
   no need to set those yourself.)
5. **Register the webhook in Stripe**: Dashboard → Developers → Webhooks →
   Add endpoint. URL is your deployed `academy-stripe-webhook` function's URL
   (Supabase shows this after `deploy`, looks like
   `https://<project-ref>.functions.supabase.co/academy-stripe-webhook`).
   Select these events: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.created`,
   `customer.subscription.deleted`. After creating it, open the endpoint and
   copy its **Signing secret** (`whsec_...`):
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```
6. **Run the migration**: `supabase/migrations/022_academy_subscriptions.sql`
   (repo root) in that Supabase project's SQL Editor — creates the
   `ec_subscribers` table the webhook writes to and the gate reads from.
7. **Enable email auth** in that Supabase project if it isn't already:
   Dashboard → Authentication → Providers → Email should be on by default.
   No extra config needed for magic links.

Once all of the above is done, reload the Academy page: sign in with an
email, click Subscribe, complete Stripe's test/real checkout, and the page
should unlock within a couple of seconds (it polls briefly while the
webhook lands).

### How it works

- `entrepreneurship-club/main.js` first checks for a locally-stored access
  code unlock; failing that, it checks the visitor's Supabase Auth session
  and, if signed in, checks `ec_subscribers.status = 'active'` for that user
  before showing the gated content.
- `supabase/functions/academy-access-check/` is the interim manual gate: a
  single password, checked server-side only, that never reaches the browser.
- `supabase/functions/academy-checkout/` creates a Stripe Checkout Session
  for the signed-in user and returns its URL for the browser to redirect to.
- `supabase/functions/academy-stripe-webhook/` receives Stripe's webhook
  events and keeps `ec_subscribers` in sync (activated, renewed, past due,
  cancelled).
- `ec_subscribers` (migration 022) is readable only by its own row's owner
  (`auth.uid() = id`) and writable only by the service-role key the two Edge
  Functions use — a member cannot grant themselves access by writing to the
  table directly.
