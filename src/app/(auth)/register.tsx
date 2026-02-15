import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';

const PROFILE_TYPES = ['player', 'coach', 'both'];

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [profileType, setProfileType] = useState('player');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !username || !password || !displayName) { Alert.alert('Error', 'Please fill in all fields'); return; }
    setLoading(true);
    try {
      await register(email, username, password, displayName, profileType);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>SANDBAGGER</Text>
        <Text style={s.subtitle}>Create your account</Text>
        <View style={s.form}>
          <Text style={s.label}>Display Name</Text>
          <TextInput style={s.input} value={displayName} onChangeText={setDisplayName} placeholder="Tiger" placeholderTextColor={colors.gray} />
          <Text style={s.label}>Username</Text>
          <TextInput style={s.input} value={username} onChangeText={setUsername} placeholder="bigcat" placeholderTextColor={colors.gray} autoCapitalize="none" />
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@email.com" placeholderTextColor={colors.gray} autoCapitalize="none" keyboardType="email-address" />
          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={colors.gray} secureTextEntry />
          <Text style={s.label}>Profile Type</Text>
          <View style={s.typeRow}>
            {PROFILE_TYPES.map(t => (
              <TouchableOpacity key={t} style={[s.typeBtn, profileType === t && s.typeBtnActive]} onPress={() => setProfileType(t)}>
                <Text style={[s.typeBtnText, profileType === t && s.typeBtnTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[s.button, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
            <Text style={s.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
          </TouchableOpacity>
          <Link href="/(auth)/login" style={s.link}>
            <Text style={s.linkText}>Already have an account? <Text style={{ color: colors.gold }}>Sign in</Text></Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  title: { fontSize: 28, fontWeight: '800', color: colors.gold, letterSpacing: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.white, textAlign: 'center', marginTop: 8, marginBottom: 24, opacity: 0.8 },
  form: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  label: { color: colors.goldLight, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, color: colors.white, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  typeBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  typeBtnText: { color: colors.white, fontWeight: '600' },
  typeBtnTextActive: { color: colors.primaryDark },
  button: { backgroundColor: colors.gold, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '700' },
  link: { marginTop: 20, alignSelf: 'center' },
  linkText: { color: colors.white, fontSize: 14 },
});
