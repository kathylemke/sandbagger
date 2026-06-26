import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../lib/theme';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // One-time startup cleanup: clear stale AsyncStorage drafts that can crash the app.
  // The most recent save-and-finish-later draft is being intentionally cleared per user request.
  useEffect(() => {
    const clearStaleDrafts = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const draftKeys = keys.filter(k => k.startsWith('sandbagger_draft'));
        if (draftKeys.length > 0) {
          await AsyncStorage.multiRemove(draftKeys);
          console.log(`[startup] Cleared ${draftKeys.length} stale draft(s)`);
        }
      } catch (e) {
        console.warn('[startup] Draft cleanup failed:', e);
      }
    };
    clearStaleDrafts();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)/feed');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
