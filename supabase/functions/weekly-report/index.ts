import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// ── Env ────────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')              ?? ''
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_KEY    = Deno.env.get('RESEND_API_KEY')            ?? ''
const CRON_SECRET   = Deno.env.get('CRON_SECRET')               ?? ''
const FROM_EMAIL    = Deno.env.get('FROM_EMAIL')                ?? 'reports@orozcohomes.com'
const PORTAL_URL    = Deno.env.get('PORTAL_URL')                ?? 'https://orozcohomes.com'

// ── Entry point ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Verify cron secret (set in Supabase Edge Function secrets)
  const auth = req.headers.get('authorization') ?? ''
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_KEY)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // All projects that have a linked client
    const { data: projects, error: projErr } = await db
      .from('projects')
      .select('id, project_name, label, category, project_pin, managed_client_id')
      .not('managed_client_id', 'is', null)

    if (projErr) throw projErr

    const results: { project: string; email: string; sent: boolean; reason?: string }[] = []

    for (const project of projects ?? []) {
      // Client info
      const { data: client } = await db
        .from('clients')
        .select('full_name, email')
        .eq('id', project.managed_client_id)
        .maybeSingle()

      if (!client?.email) {
        results.push({ project: project.project_name, email: '—', sent: false, reason: 'no client email' })
        continue
      }

      // Latest weekly update this week (most recent only)
      const { data: updates } = await db
        .from('weekly_updates')
        .select('current_phase, progress_percent, status, contractor_note, updated_at')
        .eq('project_id', project.id)
        .gte('updated_at', weekAgo)
        .order('updated_at', { ascending: false })
        .limit(1)

      // Change orders submitted this week
      const { data: changes } = await db
        .from('change_works')
        .select('title, description, status, category, original_cost, new_cost, submitted_at')
        .eq('project_id', project.id)
        .gte('submitted_at', weekAgo)
        .order('submitted_at', { ascending: false })

      const latestUpdate = updates?.[0] ?? null
      const changeOrders = changes ?? []

      // Skip projects with nothing to report
      if (!latestUpdate && changeOrders.length === 0) {
        results.push({ project: project.project_name, email: client.email, sent: false, reason: 'no activity this week' })
        continue
      }

      const html = buildEmail(project, client, latestUpdate, changeOrders)
      const subject = `Weekly Update — ${project.project_name} | Orozco Homes`
      const sent = await sendEmail(client.email, client.full_name, subject, html)
      results.push({ project: project.project_name, email: client.email, sent })
    }

    return new Response(
      JSON.stringify({ ok: true, week_starting: weekAgo, reports_sent: results.filter(r => r.sent).length, results }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[weekly-report]', err)
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// ── Email sender (Resend) ──────────────────────────────────────────────────────
async function sendEmail(to: string, toName: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Orozco Homes <${FROM_EMAIL}>`,
      to: [`${toName} <${to}>`],
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[weekly-report] Resend error:', err)
    return false
  }
  return true
}

// ── HTML email builder ─────────────────────────────────────────────────────────
function buildEmail(
  project: { id: string; project_name: string; label: string; category: string; project_pin: string },
  client:  { full_name: string; email: string },
  update:  { current_phase: string; progress_percent: number; status: string; contractor_note: string; updated_at: string } | null,
  changes: { title: string; description: string; status: string; category: string; original_cost: number; new_cost: number; submitted_at: string }[]
): string {
  const weekStr  = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const progress = update?.progress_percent ?? 0
  const portalLink = `${PORTAL_URL}?pin=${project.project_pin}`

  const progressBar = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
      <tr>
        <td style="background:#E8E6E1;border-radius:6px;height:10px;padding:0;">
          <table width="${Math.min(100, progress)}%" cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(90deg,#B8942A,#D4AF37);border-radius:6px;height:10px;padding:0;display:block;"></td></tr>
          </table>
        </td>
      </tr>
    </table>`

  const statusBadge = (status: string) => {
    const colors: Record<string, [string, string]> = {
      'in-progress': ['#EFF6FF', '#1E40AF'],
      'completed':   ['#ECFDF5', '#065F46'],
      'on-hold':     ['#FFFBEB', '#92400E'],
      'pending':     ['#F5F5F4', '#57534E'],
    }
    const [bg, text] = colors[status?.toLowerCase()] ?? ['#F5F5F4', '#57534E']
    return `<span style="background:${bg};color:${text};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:capitalize;">${status ?? 'Active'}</span>`
  }

  const changeStatusBadge = (status: string) => {
    const colors: Record<string, [string, string]> = {
      'approved':  ['#ECFDF5', '#065F46'],
      'pending':   ['#FFFBEB', '#92400E'],
      'declined':  ['#FEF2F2', '#991B1B'],
      'submitted': ['#EFF6FF', '#1E40AF'],
    }
    const [bg, text] = colors[status?.toLowerCase()] ?? ['#F5F5F4', '#57534E']
    return `<span style="background:${bg};color:${text};padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;text-transform:capitalize;">${status}</span>`
  }

  const fmt = (n: number) => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })

  const changeRows = changes.map(c => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #F0EEE9;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#002147;">${c.title}</p>
              ${c.description ? `<p style="margin:0 0 6px;font-size:12px;color:#6B7280;">${c.description}</p>` : ''}
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="padding-right:8px;">${changeStatusBadge(c.status)}</td>
                ${c.category ? `<td><span style="font-size:11px;color:#9CA3AF;">${c.category}</span></td>` : ''}
              </tr></table>
            </td>
            <td style="text-align:right;vertical-align:top;padding-left:16px;white-space:nowrap;">
              ${c.new_cost !== c.original_cost && c.original_cost > 0
                ? `<p style="margin:0;font-size:11px;color:#9CA3AF;text-decoration:line-through;">${fmt(c.original_cost)}</p>`
                : ''}
              <p style="margin:0;font-size:14px;font-weight:700;color:#D4AF37;">${fmt(c.new_cost || c.original_cost)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Orozco Homes Weekly Update</title>
</head>
<body style="margin:0;padding:0;background:#F5F4F0;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#002147;border-radius:16px 16px 0 0;padding:32px 36px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0 0 2px;font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(212,175,55,0.6);text-transform:uppercase;">Orozco Homes</p>
                <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">Weekly Project Update</h1>
                <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">Week of ${weekStr}</p>
              </td>
              <td style="text-align:right;vertical-align:top;">
                <div style="display:inline-block;background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);border-radius:8px;padding:10px 16px;">
                  <p style="margin:0 0 2px;font-size:10px;font-weight:600;letter-spacing:0.1em;color:rgba(212,175,55,0.6);text-transform:uppercase;">Project</p>
                  <p style="margin:0;font-size:15px;font-weight:700;color:#D4AF37;">${project.project_name}</p>
                  ${project.label ? `<p style="margin:2px 0 0;font-size:11px;color:rgba(255,255,255,0.45);">${project.label}</p>` : ''}
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Gold accent line -->
        <tr><td style="background:linear-gradient(90deg,#B8942A,#D4AF37);height:3px;padding:0;"></td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:32px 36px;">

          <!-- Greeting -->
          <p style="margin:0 0 24px;font-size:15px;color:#4A4A4A;">
            Hi <strong style="color:#002147;">${client.full_name.split(' ')[0]}</strong>, here's your project summary for this week.
          </p>

          ${update ? `
          <!-- Progress Section -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="border:1.5px solid #E8E6E1;border-radius:12px;padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.1em;color:#9CA3AF;text-transform:uppercase;">Current Phase</p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#002147;">${update.current_phase ?? 'In Progress'}</p>
                  </td>
                  <td style="text-align:right;vertical-align:middle;">
                    ${statusBadge(update.status)}
                  </td>
                </tr>
              </table>

              ${progressBar}
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;color:#9CA3AF;">Project Completion</td>
                  <td style="text-align:right;font-size:14px;font-weight:800;color:#D4AF37;">${progress}%</td>
                </tr>
              </table>

              ${update.contractor_note ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td style="background:#FAFAF8;border-left:3px solid #D4AF37;border-radius:0 8px 8px 0;padding:12px 16px;">
                  <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;color:#D4AF37;text-transform:uppercase;">Contractor Note</p>
                  <p style="margin:0;font-size:13px;color:#4A4A4A;line-height:1.6;">${update.contractor_note}</p>
                </td></tr>
              </table>` : ''}
            </td></tr>
          </table>` : ''}

          ${changes.length > 0 ? `
          <!-- Change Orders Section -->
          <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.12em;color:#9CA3AF;text-transform:uppercase;">
            Change Orders This Week (${changes.length})
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${changeRows}
          </table>` : ''}

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr><td style="background:#FAFAF8;border:1.5px solid #E8E6E1;border-radius:12px;padding:20px 24px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">View your full project dashboard, photos, and messages</p>
              <a href="${portalLink}"
                style="display:inline-block;margin-top:12px;background:#002147;color:#D4AF37;font-size:13px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;letter-spacing:0.04em;">
                Open Client Portal →
              </a>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F0EEE9;border-radius:0 0 16px 16px;padding:20px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0;font-size:11px;color:#9CA3AF;">
                  You're receiving this because you have an active project with Orozco Homes.<br>
                  Questions? Reply to this email or message us through your client portal.
                </p>
              </td>
              <td style="text-align:right;vertical-align:middle;">
                <p style="margin:0;font-size:11px;font-weight:700;color:#B8942A;">Orozco Homes</p>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
