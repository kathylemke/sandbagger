'use client';

import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as CryptoJS from 'crypto-js';

const supabase = createClient(
  'https://wznuxiysfirtcyvfrvdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bnV4aXlzZmlydGN5dmZydmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjUzMjksImV4cCI6MjA3NjUwMTMyOX0.FR9w01MywcooK-Bv9Ly2FWN29YCgG4wDQDLTtIaNzRQ'
);
const SESSION_KEY = 'sandbagger_session';

function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hashPassword(password: string, salt: string): string {
  const bits = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256,
  });
  return bits.toString(CryptoJS.enc.Hex);
}

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    const e = params.get('email');

    if (!t || !e) {
      setStatus('error');
      setMessage('Invalid reset link. Please request a new one from the app.');
      return;
    }
    setToken(t);
    setEmail(decodeURIComponent(e));
    setStatus('form');
  }, []);

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setMessage('');

    try {
      // Verify token
      const { data: resetData } = await supabase
        .from('sb_password_resets').select('*').eq('token', token).single();

      if (!resetData) throw new Error('Invalid reset link. Please request a new one.');
      if (resetData.used_at) throw new Error('This link has already been used.');
      if (new Date(resetData.expires_at) < new Date()) throw new Error('This link has expired.');

      // Get user
      const { data: user, error: userErr } = await supabase
        .from('sb_users').select('*').eq('email', email.toLowerCase()).single();
      if (userErr || !user) throw new Error('Account not found.');

      // Update password
      const newSalt = generateSalt();
      const newHash = hashPassword(newPassword, newSalt);
      const { error: updateErr } = await supabase.from('sb_users')
        .update({ password_hash: newHash, salt: newSalt }).eq('id', user.id);
      if (updateErr) throw new Error(updateErr.message);

      // Mark token as used
      await supabase.from('sb_password_resets').update({ used_at: new Date().toISOString() })
        .eq('token', token);

      // Auto-login the user
      const updatedUser = { ...user, password_hash: undefined, salt: undefined };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: '#1a472a', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⛳</div>
          <p style={{ color: '#555', fontSize: '15px' }}>Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: '#1a472a', minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <h1 style={{ color: '#1a472a', fontSize: '22px', margin: '0 0 8px' }}>Password Reset!</h1>
          <p style={{ color: '#555', fontSize: '15px', margin: '0 0 24px' }}>
            Your password has been changed. You're now logged in!
          </p>
          <a href="https://kathylemke.github.io/sandbagger/"
             style={{ display: 'inline-block', background: '#1a472a', color: '#fff', padding: '14px 28px', borderRadius: '10px', fontSize: '16px', fontWeight: '600', textDecoration: 'none' }}>
            Open Sandbagger
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#1a472a', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '32px',
        maxWidth: '420px', width: '100%', textAlign: 'center'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔑</div>
        <h1 style={{ color: '#1a472a', fontSize: '22px', margin: '0 0 6px' }}>Set New Password</h1>
        <p style={{ color: '#888', fontSize: '13px', margin: '0 0 24px' }}>
          for {email}
        </p>

        <div style={{ textAlign: 'left', marginBottom: '16px' }}>
          <label style={{ display: 'block', color: '#1a472a', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
          <label style={{ display: 'block', color: '#1a472a', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box',
              outline: 'none'
            }}
          />
        </div>

        {message && (
          <p style={{ color: '#d32f2f', fontSize: '13px', margin: '0 0 16px', textAlign: 'center' }}>
            {message}
          </p>
        )}

        <button
          onClick={handleReset}
          disabled={submitting}
          style={{
            width: '100%', padding: '14px', borderRadius: '10px',
            background: submitting ? '#ccc' : '#1a472a',
            color: '#fff', fontSize: '16px', fontWeight: '700',
            border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            marginBottom: '12px'
          }}
        >
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>

        <a href="https://kathylemke.github.io/sandbagger/"
           style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>
          ← Back to sign in
        </a>
      </div>
    </div>
  );
}
