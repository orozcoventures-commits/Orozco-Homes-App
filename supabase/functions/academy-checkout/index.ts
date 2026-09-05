// Genesis Academy — creates a Stripe Checkout Session for the $19/month
// subscription and returns its URL for the browser to redirect to.
//
// Required Supabase Edge Function secrets:
//   SUPABASE_URL, SUPABASE_ANON_KEY   (usually already set by default)
//   STRIPE_SECRET_KEY                 (Stripe Dashboard -> Developers -> API keys)
//   STRIPE_PRICE_ID                   (Stripe Dashboard -> Product -> the $19/mo recurring Price id)
//   ACADEMY_URL                       (e.g. https://<your-academy-site>.netlify.app -- used for the
//                                       Checkout success/cancel redirect)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')      ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const STRIPE_PRICE_ID   = Deno.env.get('STRIPE_PRICE_ID')   ?? ''
const ACADEMY_URL       = Deno.env.get('ACADEMY_URL')       ?? 'http://localhost:5173'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
    return new Response(
      JSON.stringify({ error: 'Stripe is not configured yet for Genesis Academy. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID as Supabase Edge Function secrets.' }),
      { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Not signed in.' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !user?.email) {
    return new Response(JSON.stringify({ error: 'Not signed in.' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const body = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': STRIPE_PRICE_ID,
    'line_items[0][quantity]': '1',
    customer_email: user.email,
    client_reference_id: user.id,
    // The query string (not the hash) carries the checkout result -- this
    // site uses '#academy' etc. for its own page routing, so the status
    // has to live in location.search to avoid colliding with that, and
    // with Supabase Auth's own use of the URL hash for magic-link tokens.
    success_url: `${ACADEMY_URL}/?checkout=success#academy`,
    cancel_url: `${ACADEMY_URL}/?checkout=cancelled#academy`,
    'metadata[supabase_user_id]': user.id,
    'subscription_data[metadata][supabase_user_id]': user.id,
  })

  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const session = await stripeRes.json()
  if (!stripeRes.ok) {
    return new Response(JSON.stringify({ error: session?.error?.message ?? 'Stripe error creating checkout session.' }), {
      status: 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
