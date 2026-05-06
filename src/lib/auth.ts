import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import * as CryptoJS from 'crypto-js';

const SESSION_KEY = 'sandbagger_session';

async function hashPassword(password: string, salt: string): Promise<string> {
  const bits = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256,
  });
  return bits.toString(CryptoJS.enc.Hex);
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  profile_type: string;
  bio: string | null;
  handicap: number | null;
  created_at: string;
}

export async function register(email: string, username: string, password: string, displayName: string, profileType: string): Promise<User> {
  const salt = generateSalt();
  const password_hash = await hashPassword(password, salt);
  
  const { data, error } = await supabase.from('sb_users').insert({
    email: email.toLowerCase().trim(),
    username: username.toLowerCase().trim(),
    password_hash,
    salt,
    display_name: displayName,
    profile_type: profileType,
  }).select().single();

  if (error) throw new Error(error.message);
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}

export async function login(email: string, password: string): Promise<User> {
  const { data: user, error } = await supabase.from('sb_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !user) throw new Error('Invalid email or password');

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) throw new Error('Invalid email or password');

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  const stored = await AsyncStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export async function refreshUser(): Promise<User | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  const { data } = await supabase.from('sb_users').select('*').eq('id', current.id).single();
  if (data) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}

export async function updateProfile(id: string, updates: Partial<User>): Promise<User> {
  const { data, error } = await supabase.from('sb_users').update(updates).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}

export async function changeEmail(id: string, newEmail: string): Promise<User> {
  const { data: existing } = await supabase.from('sb_users').select('id').eq('email', newEmail.toLowerCase().trim()).neq('id', id).single();
  if (existing) throw new Error('That email is already in use');
  const { data, error } = await supabase.from('sb_users').update({ email: newEmail.toLowerCase().trim() }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data;
}

export async function changePasswordByEmail(email: string, newPassword: string): Promise<void> {
  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  const { error: updateErr } = await supabase.from('sb_users')
    .update({ password_hash: newHash, salt: newSalt }).eq('email', email.toLowerCase().trim());
  if (updateErr) throw new Error(updateErr.message);
}

export async function changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
  const { data: user, error } = await supabase.from('sb_users').select('*').eq('id', id).single();
  if (error || !user) throw new Error('User not found');
      const newSalt = generateSalt();
      const newHash = await hashPassword(newPassword, newSalt);
      const { error: updateError } = await supabase.from('sb_users').update({ password_hash: newHash, salt: newSalt }).eq('id', id);
      if (updateError) throw new Error(updateError.message);
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function resetPassword(email: string): Promise<void> {
  const { data: user, error: userErr } = await supabase
    .from('sb_users').select('id').eq('email', email.toLowerCase().trim()).single();
  if (userErr || !user) {
    // Don't reveal whether email exists — just succeed silently
    return;
  }
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Delete old unused tokens for this email
  await supabase.from('sb_password_resets').delete()
    .eq('email', email.toLowerCase().trim()).is('used_at', null);

  const { error: insertErr } = await supabase.from('sb_password_resets').insert({
    email: email.toLowerCase().trim(),
    token,
    expires_at: expiresAt,
  });
  if (insertErr) throw insertErr;

      const link = `https://kathylemke.github.io/sandbagger/auth/magic-link?token=${token}&email=${encodeURIComponent(email)}&mode=reset`;
      const subject = encodeURIComponent('🔑 Reset your Sandbagger password');
      const body = encodeURIComponent(
        `Tap the link below to reset your password:\n\n${link}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`
      );
  const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

  // Open email app with pre-filled reset email
  const canOpen = await Linking.canOpenURL(mailtoUrl);
  if (canOpen) {
    await Linking.openURL(mailtoUrl);
  }
}

export async function verifyResetToken(token: string, email: string): Promise<boolean> {
  const { data } = await supabase.from('sb_password_resets')
    .select('*').eq('token', token).eq('email', email.toLowerCase().trim()).single();
  if (!data) return false;
  if (data.used_at) return false;
  if (new Date(data.expires_at) < new Date()) return false;
  return true;
}

export async function completePasswordReset(token: string, email: string, newPassword: string): Promise<void> {
  const valid = await verifyResetToken(token, email);
  if (!valid) throw new Error('Invalid or expired reset link. Please request a new one.');

  const { data: user, error: userErr } = await supabase
    .from('sb_users').select('*').eq('email', email.toLowerCase().trim()).single();
  if (userErr || !user) throw new Error('User not found');

  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  const { error: updateErr } = await supabase.from('sb_users')
    .update({ password_hash: newHash, salt: newSalt }).eq('id', user.id);
  if (updateErr) throw new Error(updateErr.message);

  // Mark token as used
  await supabase.from('sb_password_resets').update({ used_at: new Date().toISOString() })
    .eq('token', token);
}
