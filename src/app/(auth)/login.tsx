import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>⛳</Text>
          <Text style={s.title}>SANDBAGGER</Text>
          <Text style={s.subtitle}>Track your game. Own your stats.</Text>
        </View>
        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor={colors.gray} autoCapitalize="none" keyboardType="email-address" />
          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.gray} secureTextEntry />
          <TouchableOpacity style={[s.button, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
            <Text style={s.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>
          <Link href="/(auth)/register" style={s.link}>
            <Text style={s.linkText}>Don't have an account? <Text style={{ color: colors.gold }}>Sign up</Text></Text>
          </Link>
        </View>
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
  link: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: colors.white, fontSize: 14 },
});
