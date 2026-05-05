import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { sendMagicLinkEmail } from '../../../lib/magic-email';

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Invalidate any existing unused tokens for this email
    await supabase
      .from('sb_magic_links')
      .delete()
      .eq('email', email.toLowerCase().trim())
      .is('used_at', null);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await supabase.from('sb_magic_links').insert({
      email: email.toLowerCase().trim(),
      token,
      expires_at: expiresAt.toISOString(),
    });

    const verifyUrl = `https://kathylemke.github.io/sandbagger/auth/magic-link?token=${token}`;
    await sendMagicLinkEmail(email, verifyUrl);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}