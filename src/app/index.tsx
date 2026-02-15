import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthContext';

export default function Index() {
  const { user } = useAuth();
  if (user) return <Redirect href="/(tabs)/feed" />;
  return <Redirect href="/(auth)/login" />;
}
