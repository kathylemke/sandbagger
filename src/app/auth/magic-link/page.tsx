'use client';

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wznuxiysfirtcyvfrvdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnV4aXlzZmlydGN5dmZydmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjUzMjksImV4cCI6MjA3NjUwMTMyOX0.FR9w01MywcooK-Bv9Ly2FWN29YCgG4wDQDLTtIaNzRQ'
);
const SESSION_KEY = 'sandbagger_session';

export default function MagicLinkCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || window.location.hash.replace('#token=', '');
    const email = params.get('email');
    const mode = params.get('mode'); // 'reset' for password resets

    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid link. Please request a new login link from the app.');
      return;
    }

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
        if (link.email !== email.toLowerCase()) {
          setStatus('error');
          setMessage('Email mismatch. Please use the link sent to your email.');
          return;
        }

        // Mark token as used
        return supabase.from('sb_magic_links').update({ used_at: new Date().toISOString() }).eq('id', link.id)
          .then(() => supabase.from('sb_users').select('*').eq('email', email.toLowerCase()).single());
      })
      .then(({ data: user, error: userErr }) => {
        if (userErr || !user) {
          // Auto-create user if first magic login
          const username = email.split('@')[0];
          return supabase.from('sb_users').insert({
            email: email.toLowerCase(),
            username: username.toLowerCase(),
            display_name: username,
            profile_type: 'player',
          }).select().single();
        }
        return { data: user };
      })
      .then(({ data: user, error: userErr }) => {
        if (userErr || !user) throw new Error(userErr?.message || 'User not found');

        // Store session via AsyncStorage (same as the rest of the app)
        return AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user)).then(() => user);
      })
      .then((user) => {
        setStatus('success');
        setMessage('✅ Login successful!');

        // If password reset mode, redirect to change-password page
        const isBrowser = typeof window !== 'undefined';
        if (isBrowser) {
          if (mode === 'reset') {
            setTimeout(() => {
              window.location.href = 'https://kathylemke.github.io/sandbagger/change-password';
            }, 1500);
          } else {
            setTimeout(() => {
              window.location.href = 'https://kathylemke.github.io/sandbagger/';
            }, 1500);
          }
        }
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
          {status === 'loading' && 'Verifying your link...'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Error'}
        </h2>
        <p style={{ color: status === 'error' ? '#d32f2f' : '#555', fontSize: '15px', margin: '0' }}>
          {message}
        </p>
        {status === 'success' && (
          <p style={{ color: '#888', fontSize: '13px', marginTop: '16px' }}>
            Redirecting you to Sandbagger now...
          </p>
        )}
        {status === 'error' && (
          <p style={{ color: '#888', fontSize: '13px', marginTop: '12px' }}>
            <a href="https://kathylemke.github.io/sandbagger/" style={{ color: '#1a472a' }}>
              ← Back to app
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
