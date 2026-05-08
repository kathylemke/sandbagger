import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  // Check username uniqueness
  const { data: existingUsername } = await supabase
    .from('sb_users').select('id').eq('username', username.toLowerCase().trim()).single();
  if (existingUsername) throw new Error('That username is already taken');

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

export async function login(username: string): Promise<User> {
  const { data: user, error } = await supabase.from('sb_users')
    .select('*')
    .eq('username', username.toLowerCase().trim())
    .single();

  if (error || !user) throw new Error('Invalid username. Check your spelling or create a new account.');

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

export async function changePassword(id: string, newPassword: string): Promise<void> {
  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  const { error } = await supabase.from('sb_users')
    .update({ password_hash: newHash, salt: newSalt }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}