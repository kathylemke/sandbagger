import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: link, error } = await supabase
      .from('sb_magic_links')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !link) {
      return new Response(JSON.stringify({ error: 'Invalid link' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    if (link.used_at) {
      return new Response(JSON.stringify({ error: 'Link already used' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
    }
    if (new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Link expired' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
    }

    // Mark as used
    await supabase.from('sb_magic_links').update({ used_at: new Date().toISOString() }).eq('id', link.id);

    // Find user or create one
    let { data: user } = await supabase.from('sb_users').select('*').eq('email', link.email).single();

    if (!user) {
      const username = link.email.split('@')[0];
      const { data: newUser, error: createErr } = await supabase
        .from('sb_users')
        .insert({ email: link.email, username, display_name: username, profile_type: 'player' })
        .select()
        .single();
      if (createErr) throw new Error(createErr.message);
      user = newUser;
    }

    return new Response(JSON.stringify({ ok: true, userId: user!.id, email: user!.email, username: user!.username }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});