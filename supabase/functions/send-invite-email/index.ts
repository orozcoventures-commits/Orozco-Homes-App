import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL')     ?? 'Orozco Homes <noreply@orozcohomes.com>';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Email HTML template ───────────────────────────────────────────────────────
function buildHtml(clientName: string, projectName: string | null, inviteUrl: string): string {
  const greeting  = clientName ? `Hi ${clientName},` : 'Hi there,';
  const projectLine = projectName
    ? `<p style="margin:0 0 12px;font-size:15px;color:#374151;">Your project <strong style="color:#002147;">${projectName}</strong> is now set up and ready for you to track online.</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Orozco Homes Project Portal</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F4F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F4F0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header / Brand -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#002147;border-radius:16px;padding:12px 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#D4AF37;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                          <span style="font-size:14px;font-weight:900;color:#002147;letter-spacing:0.05em;">OH</span>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.03em;">Orozco Homes</p>
                          <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:0.15em;text-transform:uppercase;">Remodel Planner</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:20px;border:1.5px solid #E8E6E1;box-shadow:0 4px 24px rgba(0,33,71,0.07);overflow:hidden;">

              <!-- Gold top bar -->
              <tr>
                <td style="background-color:#D4AF37;height:4px;font-size:0;line-height:0;">&nbsp;</td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 40px 32px;">

                  <!-- Icon -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                      <td style="background-color:rgba(212,175,55,0.12);border-radius:50%;width:52px;height:52px;text-align:center;vertical-align:middle;">
                        <img src="https://em-content.zobj.net/source/apple/391/house_1f3e0.png" width="26" height="26" alt="🏠" style="display:block;margin:13px auto;" />
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#002147;letter-spacing:0.01em;">You're invited!</p>
                  <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;">Orozco Homes Client Portal</p>

                  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>

                  ${projectLine}

                  <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                    Through your personal project portal you can:
                  </p>

                  <!-- Feature list -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
                    ${[
                      ['📊', 'Track real-time project progress and phases'],
                      ['📸', 'View progress photos as work is completed'],
                      ['✅', 'Digitally approve or decline change orders'],
                      ['💬', 'Stay in sync with your contractor'],
                    ].map(([icon, text]) => `
                    <tr>
                      <td style="padding:6px 0;vertical-align:top;width:28px;font-size:15px;">${icon}</td>
                      <td style="padding:6px 0;font-size:14px;color:#374151;line-height:1.5;">${text}</td>
                    </tr>`).join('')}
                  </table>

                  <!-- CTA button -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
                    <tr>
                      <td align="center" style="border-radius:14px;background-color:#002147;">
                        <a href="${inviteUrl}"
                           style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:700;color:#D4AF37;text-decoration:none;letter-spacing:0.02em;border-radius:14px;">
                          View My Project Portal →
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Divider -->
                  <hr style="border:none;border-top:1px solid #F3F2EE;margin:0 0 20px;" />

                  <!-- Link fallback -->
                  <p style="margin:0 0 6px;font-size:12px;color:#9CA3AF;">
                    Button not working? Copy and paste this link into your browser:
                  </p>
                  <p style="margin:0;font-size:12px;word-break:break-all;">
                    <a href="${inviteUrl}" style="color:#002147;">${inviteUrl}</a>
                  </p>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#F9F8F6;border-top:1px solid #F0EEE9;padding:20px 40px;">
                  <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
                    You received this because a project was set up for you by <strong style="color:#6B7280;">Orozco Homes</strong>.
                    If you have questions, reply to this email or contact your contractor directly.
                  </p>
                  <p style="margin:8px 0 0;font-size:11px;color:#D1D5DB;">© ${new Date().getFullYear()} Orozco Homes. All rights reserved.</p>
                </td>
              </tr>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY secret is not set in Supabase Edge Function secrets.' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }

  let body: { clientEmail: string; clientName: string; projectName?: string; inviteUrl: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { clientEmail, clientName, projectName, inviteUrl } = body;
  if (!clientEmail || !inviteUrl) {
    return new Response(JSON.stringify({ error: 'clientEmail and inviteUrl are required.' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const subject = projectName
    ? `You're invited to view your ${projectName} project portal`
    : `You're invited — view your Orozco Homes project portal`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      clientEmail,
      subject,
      html:    buildHtml(clientName, projectName ?? null, inviteUrl),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: data }), {
      status: res.status, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, id: data.id }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
