// Genesis Academy — interim manual access gate, independent of Stripe.
// Roger sets a single 4-digit PIN as an Edge Function secret and hands it
// out directly to whoever he wants to let in early (before the paid
// subscription is live, or alongside it for comped/guest access).
//
// This function never reveals the real PIN to the client: it only ever
// returns { ok: true } or { ok: false }, checked with a constant-time
// comparison so a wrong guess can't be timed to learn how much of it
// matched.
//
// Required Supabase Edge Function secret:
//   ACADEMY_ACCESS_PASSWORD   (a 4-digit PIN, e.g. "4271" -- change it any
//                              time via `supabase secrets set` to revoke
//                              access for everyone at once)

const ACADEMY_ACCESS_PASSWORD = Deno.env.get('ACADEMY_ACCESS_PASSWORD') ?? ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  // Compare against a fixed-length buffer so the loop length never leaks
  // the length of the real password either.
  const len = Math.max(aBytes.length, bBytes.length, 32)
  let diff = aBytes.length ^ bBytes.length
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  if (!ACADEMY_ACCESS_PASSWORD) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No access password has been set yet.' }),
      { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  let password = ''
  try {
    const body = await req.json()
    password = String(body?.password ?? '')
  } catch {
    // fall through with empty password -> rejected below
  }

  const ok = password.length > 0 && timingSafeEqual(password, ACADEMY_ACCESS_PASSWORD)

  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
