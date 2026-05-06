'use client';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';
import { changePassword } from '../../lib/auth';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  isReset?: boolean;
}

export default function ChangePassword({ isReset: propIsReset }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const isResetMode = (params.mode as string) === 'reset' || propIsReset === true;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) { Alert.alert('Error', 'Please fill in all fields'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'New passwords do not match'); return; }
    if (newPassword.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      // Get email from route params (deep link) or AsyncStorage
      const email = (params.email as string) || await AsyncStorage.getItem('sb_reset_email');
      if (!email) throw new Error('Session expired. Please request a new password reset link.');

      const { changePasswordByEmail } = await import('../../lib/auth');
      await changePasswordByEmail(email, newPassword);
      await AsyncStorage.removeItem('sb_reset_email');
      Alert.alert('Success', 'Your password has been changed. Please sign in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) { Alert.alert('Error', 'Please fill in all fields'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'New passwords do not match'); return; }
    if (newPassword.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await changePassword(user!.id, '', newPassword);
      Alert.alert('Success', 'Password updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const isProcessingReset = isResetMode && !user;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>⛳</Text>
          <Text style={s.title}>SANDBAGGER</Text>
        </View>

        <View style={s.form}>
          <Text style={s.formTitle}>{isProcessingReset ? 'Set your new password' : 'Change your password'}</Text>
          <Text style={s.formSubtitle}>
            {isProcessingReset ? 'Choose a new password for your account.' : 'Enter your new password below.'}
          </Text>

          <Text style={s.label}>{isProcessingReset ? 'New Password' : 'New Password'}</Text>
          <TextInput
            style={s.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Min. 8 characters"
            placeholderTextColor={colors.gray}
            secureTextEntry
          />

          <Text style={s.label}>Confirm New Password</Text>
          <TextInput
            style={s.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.gray}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.button, loading && { opacity: 0.6 }]}
            onPress={isProcessingReset ? handleResetPassword : handleChangePassword}
            disabled={loading}
          >
            <Text style={s.buttonText}>{loading ? 'Saving...' : 'Save Password'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={() => isProcessingReset ? router.replace('/(auth)/login') : router.back()}>
            <Text style={s.cancelBtnText}>{isProcessingReset ? '← Back to sign in' : '← Cancel'}</Text>
          </TouchableOpacity>
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
  form: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  formTitle: { fontSize: 22, fontWeight: '700', color: colors.gold, textAlign: 'center', marginBottom: 8 },
  formSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 },
  label: { color: colors.goldLight, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
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
  cancelBtn: { marginTop: 16, alignItems: 'center' },
  cancelBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
});