import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [sendingMagic, setSendingMagic] = useState(false);
  const [magicLinkUrl, setMagicLinkUrl] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email) { Alert.alert('Error', 'Please enter your email'); return; }
    setSendingMagic(true);
    try {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Delete old unused tokens for this email
      await supabase.from('sb_magic_links').delete()
        .eq('email', email.toLowerCase().trim()).is('used_at', null);

      // Insert new token
      const { error: insertErr } = await supabase.from('sb_magic_links').insert({
        email: email.toLowerCase().trim(),
        token,
        expires_at: expiresAt,
      });
      if (insertErr) throw insertErr;

      const link = `https://kathylemke.github.io/sandbagger/auth/magic-link?token=${token}&email=${encodeURIComponent(email)}`;
      setMagicLinkUrl(link);

      // Open email app with the link in the body
      const subject = encodeURIComponent('🔑 My Sandbagger login link');
      const body = encodeURIComponent(`Tap this link to sign in to Sandbagger:\n\n${link}\n\nIt expires in 15 minutes.`);
      const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      }

      setMagicSent(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSendingMagic(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>⛳</Text>
          <Text style={s.title}>SANDBAGGER</Text>
          <Text style={s.subtitle}>Track your game. Own your stats.</Text>
        </View>

        {!magicMode ? (
          <View style={s.form}>
            <Text style={s.label}>Email</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor={colors.gray} autoCapitalize="none" keyboardType="email-address" />
            <Text style={s.label}>Password</Text>
            <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.gray} secureTextEntry />
            <TouchableOpacity style={[s.button, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
              <Text style={s.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ghostBtn, { marginTop: 12 }]} onPress={() => setMagicMode(true)}>
              <Text style={s.ghostBtnText}>🔑  Sign in with a magic link instead</Text>
            </TouchableOpacity>
            <Link href="/(auth)/register" style={s.link}>
              <Text style={s.linkText}>Don't have an account? <Text style={{ color: colors.gold }}>Sign up</Text></Text>
            </Link>
          </View>
        ) : magicSent ? (
          <View style={s.form}>
            <View style={s.successCard}>
              <Text style={s.successIcon}>📬</Text>
              <Text style={s.successTitle}>Check your email app</Text>
              <Text style={s.successText}>We opened your email app with your login link ready to send. <Text style={{ color: colors.gold }}>Send the email to yourself</Text>, then open it and tap the link to sign in.</Text>
              <Text style={s.successNote}>Link: {magicLinkUrl.slice(0, 50)}...</Text>
            </View>
            <TouchableOpacity style={s.ghostBtn} onPress={() => { setMagicMode(false); setMagicSent(false); setEmail(''); setMagicLinkUrl(''); }}>
              <Text style={s.ghostBtnText}>← Back to sign in</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.form}>
            <View style={s.magicHeader}>
              <Text style={s.magicTitle}>Password-free sign in</Text>
              <Text style={s.magicSubtitle}>Enter your email and we'll create a link that signs you in instantly — no password needed.</Text>
            </View>
            <Text style={s.label}>Email</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor={colors.gray} autoCapitalize="none" keyboardType="email-address" />
            <TouchableOpacity style={[s.button, (sendingMagic || !email) && { opacity: 0.6 }]} onPress={handleSendMagicLink} disabled={sendingMagic || !email}>
              <Text style={s.buttonText}>{sendingMagic ? 'Preparing...' : 'Open Email App'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostBtn} onPress={() => setMagicMode(false)}>
              <Text style={s.ghostBtnText}>← Back to password sign in</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 60, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '800', color: colors.gold, letterSpacing: 6 },
  subtitle: { fontSize: 14, color: colors.white, marginTop: 8, opacity: 0.8 },
  form: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  label: { color: colors.goldLight, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, color: colors.white, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  button: { backgroundColor: colors.gold, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '700' },
  ghostBtn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  ghostBtnText: { color: colors.white, fontSize: 14, fontWeight: '500', opacity: 0.8 },
  link: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: colors.white, fontSize: 14 },
  successCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: '700', color: colors.gold, marginBottom: 8 },
  successText: { fontSize: 15, color: colors.white, textAlign: 'center', lineHeight: 22 },
  successNote: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12, textAlign: 'center', fontFamily: 'monospace' },
  magicHeader: { alignItems: 'center', marginBottom: 16 },
  magicTitle: { fontSize: 18, fontWeight: '700', color: colors.gold },
  magicSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 6 },
});