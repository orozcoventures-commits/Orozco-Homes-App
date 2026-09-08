// Entrepreneurship Club -- emails the club owner whenever someone submits
// the Membership ("Apply Now") form.
//
// Triggered by a Supabase Database Webhook (Database -> Webhooks) configured
// on ec_membership_requests for INSERT events -- not called directly by the
// website. The webhook's custom "x-webhook-secret" header is checked against
// DB_WEBHOOK_SECRET so only that webhook, not the public internet, can
// trigger an email send.
//
// Required Supabase Edge Function secrets:
//   RESEND_API_KEY     (resend.com -> API Keys)
//   DB_WEBHOOK_SECRET  (any string you choose -- must match the header value
//                        configured on the Database Webhook)
//   NOTIFY_TO_EMAIL    (e.g. genesisdelemprendimiento@gmail.com)

const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')    ?? ''
const DB_WEBHOOK_SECRET = Deno.env.get('DB_WEBHOOK_SECRET') ?? ''
const NOTIFY_TO_EMAIL   = Deno.env.get('NOTIFY_TO_EMAIL')   ?? ''

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!DB_WEBHOOK_SECRET || req.headers.get('x-webhook-secret') !== DB_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!RESEND_API_KEY || !NOTIFY_TO_EMAIL) {
    console.error('notify-membership-request is missing RESEND_API_KEY or NOTIFY_TO_EMAIL')
    return new Response('Not configured', { status: 503 })
  }

  const payload = await req.json()
  const row = payload?.record ?? {}

  const html = `
    <h2>New Membership Request</h2>
    <p><strong>Name:</strong> ${escapeHtml(row.full_name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(row.email)}</p>
    <p><strong>Location:</strong> ${escapeHtml(row.location)}</p>
    <p><strong>Stage:</strong> ${escapeHtml(row.stage)}</p>
    <p><strong>About their venture:</strong><br>${escapeHtml(row.about)}</p>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Entrepreneurship Club <onboarding@resend.dev>',
      to: NOTIFY_TO_EMAIL,
      reply_to: row.email || undefined,
      subject: `New membership request from ${row.full_name || 'someone'}`,
      html,
    }),
  })

  if (!res.ok) {
    console.error('Resend send failed:', await res.text())
    return new Response('Email send failed', { status: 502 })
  }

  return new Response('ok', { status: 200 })
})
