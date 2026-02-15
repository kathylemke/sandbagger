import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '../../lib/theme';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = { feed: '📰', log: '✏️', courses: '⛳', stats: '📊', profile: '👤' };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 22 }}>{icons[name] || '•'}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.primaryDark },
      headerTintColor: colors.gold,
      headerTitleStyle: { fontWeight: '800', letterSpacing: 3 },
      tabBarStyle: { backgroundColor: colors.primaryDark, borderTopColor: 'rgba(255,255,255,0.1)' },
      tabBarActiveTintColor: colors.gold,
      tabBarInactiveTintColor: colors.gray,
    }}>
      <Tabs.Screen name="feed" options={{ title: 'Feed', headerTitle: 'SANDBAGGER', tabBarIcon: ({ focused }) => <TabIcon name="feed" focused={focused} /> }} />
      <Tabs.Screen name="log" options={{ title: 'Log Round', headerTitle: 'LOG ROUND', tabBarIcon: ({ focused }) => <TabIcon name="log" focused={focused} /> }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses', headerTitle: 'COURSES', tabBarIcon: ({ focused }) => <TabIcon name="courses" focused={focused} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', headerTitle: 'STATS', tabBarIcon: ({ focused }) => <TabIcon name="stats" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', headerTitle: 'PROFILE', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }} />
    </Tabs>
  );
}
