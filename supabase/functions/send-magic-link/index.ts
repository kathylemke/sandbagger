// Self-contained magic link sender using Deno standard library + built-in fetch
// No external npm packages needed

const APP_URL = 'https://kathylemke.github.io/sandbagger';

const EMAIL_HTML = (magicLink: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f4;margin:0;padding:20px">
<div style="background:#1a472a;border-radius:16px;padding:32px;max-width:480px;margin:0 auto">
<div style="color:#c5a528;font-size:28px;font-weight:800;text-align:center;margin-bottom:8px">⛳ Sandbagger</div>
<div style="color:#fff;font-size:20px;font-weight:700;text-align:center;margin-bottom:24px">Your login link</div>
<div style="background:#fff;border-radius:12px;padding:28px;text-align:center">
<p style="color:#333;font-size:15px;margin:0 0 8px">Tap the button below to sign in instantly — no password needed.</p>
<a href="${magicLink}" style="display:inline-block;background:#1a472a;color:#c5a528;font-size:16px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;margin:16px 0">Sign in to Sandbagger →</a>
<p style="color:#888;font-size:12px;margin-top:16px">This link expires in 15 minutes and can only be used once.</p>
<p style="color:#888;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
</div></div></body></html>`;

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function supabaseFetch(url: string, method: string, body?: object, apiKey?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SRV_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Delete old unused tokens for this email
    await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/sb_magic_links?email=eq.${encodeURIComponent(email.toLowerCase().trim())}&used_at=is.null`,
      'DELETE'
    );

    // Insert new token
    await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/sb_magic_links`,
      'POST',
      {
        email: email.toLowerCase().trim(),
        token,
        expires_at: expiresAt,
      }
    );

    const magicLink = `${APP_URL}/auth/magic-link?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    // Send email via Resend API if key is set
    const resendKey = Deno.env.get('RESEND_KEY');
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Sandbagger <noreply@sandbagger.app>',
          to: email,
          subject: '🔑 Your Sandbagger login link',
          html: EMAIL_HTML(magicLink),
        }),
      });
    } else {
      // Fallback: log to console (for debugging)
      console.log(`Magic link for ${email}: ${magicLink}`);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
