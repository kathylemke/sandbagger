import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { resetPassword } from '../../lib/auth';

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

  // Magic link state
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [sendingMagic, setSendingMagic] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLink, setForgotLink] = useState('');
  const [sendingForgot, setSendingForgot] = useState(false);

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

      await supabase.from('sb_magic_links').delete()
        .eq('email', email.toLowerCase().trim()).is('used_at', null);

      const { error: insertErr } = await supabase.from('sb_magic_links').insert({
        email: email.toLowerCase().trim(),
        token,
        expires_at: expiresAt,
      });
      if (insertErr) throw insertErr;

      const link = `https://kathylemke.github.io/sandbagger/auth/magic-link?token=${token}&email=${encodeURIComponent(email)}`;

      const subject = encodeURIComponent('🔑 Your Sandbagger login link');
      const body = encodeURIComponent(
        `Tap the link below to sign in to Sandbagger:\n\n${link}\n\nThis link expires in 15 minutes.`
      );
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

  const handleForgotPassword = async () => {
    if (!forgotEmail) { Alert.alert('Error', 'Please enter your email'); return; }
    setSendingForgot(true);
    try {
      const link = await resetPassword(forgotEmail);
      setForgotLink(link);
      setForgotSent(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSendingForgot(false);
    }
  };

  // ─── FORGOT PASSWORD SCREEN (full-page override) ───
  if (forgotMode || forgotSent) {
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Text style={s.logo}>⛳</Text>
            <Text style={s.title}>SANDBAGGER</Text>
          </View>

          {forgotSent ? (
            <View style={s.form}>
              <View style={s.successCard}>
                <Text style={s.successIcon}>📬</Text>
                <Text style={s.successTitle}>Check your email</Text>
                <Text style={s.successText}>
                  We tried to open your email app with your password reset link.
                </Text>
                {forgotLink ? (
                  <View style={{marginTop: 16, padding: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, width: '100%'}}>
                    <Text style={{color: colors.goldLight, fontSize: 11, marginBottom: 6}}>Or copy this link:</Text>
                    <Text style={{color: '#fff', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'}} numberOfLines={3}>{forgotLink}</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity style={s.ghostBtn} onPress={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); setForgotLink(''); }}>
                <Text style={s.ghostBtnText}>← Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.form}>
              <Text style={s.magicTitle}>Reset your password</Text>
              <Text style={s.magicSubtitle}>Enter your email and we'll send you a link to reset your password.</Text>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                placeholder="you@email.com"
                placeholderTextColor={colors.gray}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity
                style={[s.button, (sendingForgot || !forgotEmail) && { opacity: 0.6 }]}
                onPress={handleForgotPassword}
                disabled={sendingForgot || !forgotEmail}
              >
                <Text style={s.buttonText}>{sendingForgot ? 'Sending...' : 'Open Email App'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={() => { setForgotMode(false); setForgotSent(false); }}>
                <Text style={s.ghostBtnText}>← Back to sign in</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── MAGIC LINK SENT SCREEN ───
  if (magicSent) {
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <Text style={s.logo}>⛳</Text>
            <Text style={s.title}>SANDBAGGER</Text>
          </View>
          <View style={s.form}>
            <View style={s.successCard}>
              <Text style={s.successIcon}>📬</Text>
              <Text style={s.successTitle}>Check your email app</Text>
              <Text style={s.successText}>
                We opened your email with your login link.{'\n'}
                <Text style={{ color: colors.gold }}>Send the email to yourself</Text>, open it, and tap the link to sign in.
              </Text>
            </View>
            <TouchableOpacity
              style={s.ghostBtn}
              onPress={() => { setMagicMode(false); setMagicSent(false); setEmail(''); }}
            >
              <Text style={s.ghostBtnText}>← Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── MAIN LOGIN SCREEN ───
  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>⛳</Text>
          <Text style={s.title}>SANDBAGGER</Text>
          <Text style={s.subtitle}>Track your game. Own your stats.</Text>
        </View>

        {/* ── PASSWORD SIGN IN ── */}
        {!magicMode && (
          <View style={s.form}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor={colors.gray}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.gray}
              secureTextEntry
            />
            <TouchableOpacity
              style={[s.button, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={s.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.ghostBtn, { marginTop: 12 }]}
              onPress={() => setMagicMode(true)}
            >
              <Text style={s.ghostBtnText}>🔑  Sign in with a magic link instead</Text>
            </TouchableOpacity>
            <Link href="/(auth)/register" style={s.link}>
              <Text style={s.linkText}>Don't have an account? <Text style={{ color: colors.gold }}>Sign up</Text></Text>
            </Link>
            <TouchableOpacity
              style={s.forgotBtn}
              onPress={() => { setForgotMode(true); setForgotSent(false); setForgotEmail(email); }}
            >
              <Text style={s.forgotBtnText}>Forgot your password?</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── MAGIC LINK FORM ── */}
        {magicMode && (
          <View style={s.form}>
            <Text style={s.magicTitle}>Password-free sign in</Text>
            <Text style={s.magicSubtitle}>Enter your email and we'll send you a link that signs you in instantly — no password needed.</Text>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor={colors.gray}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={[s.button, (sendingMagic || !email) && { opacity: 0.6 }]}
              onPress={handleSendMagicLink}
              disabled={sendingMagic || !email}
            >
              <Text style={s.buttonText}>{sendingMagic ? 'Preparing...' : 'Open Email App'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostBtn} onPress={() => setMagicMode(false)}>
              <Text style={s.ghostBtnText}>← Back to sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.forgotBtn}
              onPress={() => { setForgotMode(true); setForgotSent(false); setForgotEmail(email); }}
            >
              <Text style={s.forgotBtnText}>Forgot your password?</Text>
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
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    color: colors.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  button: { backgroundColor: colors.gold, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '700' },
  ghostBtn: {
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  ghostBtnText: { color: colors.white, fontSize: 14, fontWeight: '500', opacity: 0.8 },
  link: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: colors.white, fontSize: 14 },
  successCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: '700', color: colors.gold, marginBottom: 8 },
  successText: { fontSize: 15, color: colors.white, textAlign: 'center', lineHeight: 22 },
  forgotBtn: { marginTop: 14, alignSelf: 'center', marginBottom: 8 },
  forgotBtnText: { color: colors.goldLight, fontSize: 13, textDecorationLine: 'underline' },
  magicHeader: { alignItems: 'center', marginBottom: 16 },
  magicTitle: { fontSize: 18, fontWeight: '700', color: colors.gold, textAlign: 'center', marginBottom: 6 },
  magicSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 16 },
});
