import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const SESSION_KEY = 'sandbagger_session';

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
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

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
