import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const { data: link, error } = await supabase
    .from('sb_magic_links')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !link) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
  if (link.used_at) return NextResponse.json({ error: 'Link already used' }, { status: 410 });
  if (new Date(link.expires_at) < new Date()) return NextResponse.json({ error: 'Link expired' }, { status: 410 });

  // Mark as used
  await supabase.from('sb_magic_links').update({ used_at: new Date().toISOString() }).eq('id', link.id);

  // Find or create user
  let { data: user } = await supabase.from('sb_users').select('*').eq('email', link.email).single();

  if (!user) {
    const username = link.email.split('@')[0];
    const { data: newUser, error: createErr } = await supabase
      .from('sb_users')
      .insert({ email: link.email, username, display_name: username, profile_type: 'player' })
      .select()
      .single();
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 });
    user = newUser;
  }

  return NextResponse.json({ ok: true, userId: user.id, email: user.email });
}