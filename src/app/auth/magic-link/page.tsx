'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wznuxiysfirtcyvfrvdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnV4aXlzZmlydGN5dmZydmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjUzMjksImV4cCI6MjA3NjUwMTMyOX0.FR9w01MywcooK-Bv9Ly2FWN29YCgG4wDQDLTtIaNzRQ'
);

export default function MagicLinkCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || window.location.hash.replace('#token=', '');
    const email = params.get('email');

    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid link. Please request a new login link from the app.');
      return;
    }

    // Verify the magic link token
    supabase.from('sb_magic_links').select('*').eq('token', token).single()
      .then(({ data: link, error }) => {
        if (error || !link) {
          setStatus('error');
          setMessage('Invalid link. Please request a new one from the app.');
          return;
        }
        if (link.used_at) {
          setStatus('error');
          setMessage('This link has already been used. Please request a new one.');
          return;
        }
        if (new Date(link.expires_at) < new Date()) {
          setStatus('error');
          setMessage('This link has expired. Please request a new one from the app.');
          return;
        }
        if (link.email !== email) {
          setStatus('error');
          setMessage('Email mismatch. Please use the link sent to your email.');
          return;
        }

        // Mark token as used
        supabase.from('sb_magic_links').update({ used_at: new Date().toISOString() }).eq('id', link.id)
          .then(() => {
            // Find or create user
            return supabase.from('sb_users').select('*').eq('email', email.toLowerCase()).single();
          })
          .then(({ data: user }) => {
            if (!user) {
              const username = email.split('@')[0];
              return supabase.from('sb_users').insert({
                email: email.toLowerCase(),
                username,
                display_name: username,
                profile_type: 'player',
              }).select().single();
            }
            return { data: user };
          })
          .then(({ data: user, error: userErr }) => {
            if (userErr || !user) throw new Error(userErr?.message || 'User not found');

            // Save session to localStorage (for web)
            const session = {
              access_token: token,
              refresh_token: token,
              user: { id: user.id, email: user.email, ...user },
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            };
            localStorage.setItem('sandbagger_session', JSON.stringify(session));
            localStorage.setItem('sb_user', JSON.stringify(user));

            setStatus('success');
            setMessage('✅ Login successful! You can now close this page and open Sandbagger.');
          });
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Something went wrong. Please try again.');
      });
  }, []);

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#1a472a',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⛳</div>
        <h1 style={{ color: '#1a472a', fontSize: '24px', margin: '0 0 8px' }}>Sandbagger</h1>
        <h2 style={{ color: '#333', fontSize: '18px', fontWeight: '600', margin: '0 0 24px' }}>
          {status === 'loading' && 'Verifying...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Error'}
        </h2>
        <p style={{ color: status === 'error' ? '#d32f2f' : '#555', fontSize: '15px', margin: '0' }}>
          {message}
        </p>
        {status === 'success' && (
          <p style={{ color: '#888', fontSize: '13px', marginTop: '16px' }}>
            Your session is now active. Open the Sandbagger app and enter your email to sign in.
          </p>
        )}
        {status === 'error' && (
          <p style={{ color: '#888', fontSize: '13px', marginTop: '12px' }}>
            Open the Sandbagger app and try again.
          </p>
        )}
      </div>
    </div>
  );
}
