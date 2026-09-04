// Netlify Edge Function: password-protects a single page with a cookie gate.
//
// Route it at a specific path via netlify.toml's [[edge_functions]] block
// (already done for /secret-page in this project's netlify.toml).
//
// Required environment variable (Site settings -> Environment variables,
// available to Edge Functions):
//   PROTECTED_PAGE_PASSWORD

const COOKIE_NAME = 'page_auth_session';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function renderForm({ path, error }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Protected Page</title>
<style>
  *{box-sizing:border-box;}
  body{
    margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    background:#101B33; color:#1B2230; padding:24px;
  }
  .card{
    background:#fff; border-radius:8px; padding:40px 36px; width:100%; max-width:380px;
    box-shadow:0 20px 50px rgba(0,0,0,0.25);
  }
  h1{font-size:20px; margin:0 0 8px; color:#101B33;}
  p{font-size:14.5px; color:#5A6172; margin:0 0 24px;}
  .error{
    background:#FBEEEC; border:1px solid #E9C3BC; color:#7A2E20; border-radius:4px;
    padding:10px 14px; font-size:13.5px; margin:0 0 20px;
  }
  input[type="password"]{
    width:100%; padding:11px 13px; border:1px solid #DEDCD2; border-radius:4px;
    font-size:14.5px; margin-bottom:14px;
  }
  button{
    width:100%; padding:11px 18px; border:none; border-radius:4px; background:#101B33; color:#fff;
    font-size:14.5px; font-weight:600; cursor:pointer;
  }
  button:hover{background:#223768;}
</style>
</head>
<body>
  <div class="card">
    <h1>This page is password protected</h1>
    <p>Enter the password to continue.</p>
    ${error ? '<div class="error">Incorrect password. Please try again.</div>' : ''}
    <form method="POST" action="${path}">
      <input type="password" name="password" placeholder="Password" required autofocus>
      <button type="submit">Unlock</button>
    </form>
  </div>
</body>
</html>`;
}

export default async (request, context) => {
  const url = new URL(request.url);

  // Already unlocked -- let the request through to the real page.
  if (getCookie(request, COOKIE_NAME)) {
    return context.next();
  }

  const correctPassword = Netlify.env.get('PROTECTED_PAGE_PASSWORD');

  if (request.method === 'POST') {
    const form = await request.formData();
    const submitted = form.get('password');

    if (correctPassword && submitted === correctPassword) {
      const sessionValue = crypto.randomUUID();
      const headers = new Headers({ Location: url.pathname });
      headers.append(
        'Set-Cookie',
        `${COOKIE_NAME}=${sessionValue}; Path=${url.pathname}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
      );
      return new Response(null, { status: 302, headers });
    }

    return new Response(renderForm({ path: url.pathname, error: true }), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(renderForm({ path: url.pathname, error: false }), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
};
