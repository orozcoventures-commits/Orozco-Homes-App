// Genesis Academy — Stripe webhook handler. Keeps ec_subscribers in sync
// with the real subscription status (activated, renewed, past due, or
// cancelled) so the site can gate the Academy page correctly.
//
// Required Supabase Edge Function secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (usually already set by default)
//   STRIPE_WEBHOOK_SECRET   (Stripe Dashboard -> Developers -> Webhooks -> this
//                            endpoint's "Signing secret", after you add the
//                            endpoint URL there)
//
// Register this function's URL in Stripe listening for at least:
//   checkout.session.completed, customer.subscription.updated,
//   customer.subscription.deleted

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')             ?? ''
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')     ?? ''

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=')
      return [k, v]
    }),
  )
  const timestamp = parts['t']
  const signature = parts['v1']
  if (!timestamp || !signature) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signedPayload = `${timestamp}.${payload}`
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('')

  // Constant-time-ish comparison
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    return new Response('Webhook not configured (missing STRIPE_WEBHOOK_SECRET).', { status: 503 })
  }

  const payload = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  const valid = await verifyStripeSignature(payload, sig, STRIPE_WEBHOOK_SECRET)
  if (!valid) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(payload)
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.client_reference_id || session.metadata?.supabase_user_id
        if (userId) {
          await db.from('ec_subscribers').upsert({
            id: userId,
            email: session.customer_details?.email ?? session.customer_email ?? '',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: 'active',
          })
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object
        const userId = sub.metadata?.supabase_user_id
        if (userId) {
          // email is NOT NULL; fall back to a placeholder in case this event
          // is the first one to create the row (ordering vs. checkout.session
          // isn't guaranteed) -- checkout.session.completed will fill in the
          // real email moments later via the same upsert-by-id.
          await db.from('ec_subscribers').upsert({
            id: userId,
            email: sub.metadata?.email ?? `pending-${userId}@unknown.local`,
            stripe_customer_id: sub.customer,
            stripe_subscription_id: sub.id,
            status: sub.status,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          }, { onConflict: 'id' })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const userId = sub.metadata?.supabase_user_id
        if (userId) {
          await db.from('ec_subscribers')
            .update({ status: 'canceled' })
            .eq('id', userId)
        }
        break
      }

      default:
        // Ignore other event types.
        break
    }
  } catch (err) {
    console.error('Webhook handling error:', err)
    return new Response('Webhook handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
