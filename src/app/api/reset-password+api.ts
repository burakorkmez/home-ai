// Landing page for the reset-password email link (Better Auth redirects here with ?token=).
// Plain HTML so the flow works from any mail app, with or without Restyle installed.
const page = (body: string) =>
  new Response(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset password · Restyle</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#12100e;color:#f4ede3;font:16px -apple-system,system-ui,sans-serif}
main{width:min(360px,90vw)}h1{font-size:26px}p{color:#a39888}input,button{box-sizing:border-box;width:100%;height:52px;border-radius:16px;font-size:16px}
input{border:1px solid #383229;background:#1d1a17;color:#f4ede3;padding:0 16px;margin:8px 0 16px}button{border:0;background:#cdb08a;color:#1a1510;font-weight:600}
#msg{min-height:24px}</style></head><body><main>${body}</main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );

export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  // The token goes into inline JS below, so only accept plain token characters (blocks XSS).
  if (!token || !/^[\w-]+$/.test(token)) return page('<h1>Link expired</h1><p>Request a new reset link from the Restyle app.</p>');
  return page(`<h1>Set a new password</h1>
<form id="f"><label for="p">New password</label><input id="p" type="password" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters">
<p id="msg" role="status"></p><button>Save password</button></form>
<script>
f.onsubmit = async (e) => {
  e.preventDefault();
  msg.textContent = 'Saving…';
  const r = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword: p.value, token: ${JSON.stringify(token)} }) }).catch(() => null);
  if (r && r.ok) document.querySelector('main').innerHTML = '<h1>Password updated</h1><p>Go back to the Restyle app and sign in.</p>';
  else msg.textContent = ((r && (await r.json().catch(() => null))) || {}).message || 'That didn\\'t work. Request a new link.';
};
</script>`);
}
