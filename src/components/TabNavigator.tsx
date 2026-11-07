import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';

import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/theme/useTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type TabIconProps = {
  color: ComponentProps<typeof Ionicons>['color'];
  size: number;
  focused: boolean;
};

// The filled icon marks the selected tab, as on Android and iOS.
function tabIcon(outline: IconName, filled: IconName) {
  return function TabIcon({ color, size, focused }: TabIconProps) {
    return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
  };
}

// The bottom tab bar: Train, History, Library, Progress and Profile, five at
// most, which is Material's limit for a navigation bar.
export function TabNavigator() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.separator },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Train',
          tabBarIcon: tabIcon('barbell-outline', 'barbell'),
          headerRight: () => (
            <IconButton
              icon="settings-outline"
              accessibilityLabel="Settings"
              onPress={() => router.push('/settings')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: tabIcon('time-outline', 'time') }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: 'Library', tabBarIcon: tabIcon('library-outline', 'library') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: tabIcon('stats-chart-outline', 'stats-chart') }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('person-circle-outline', 'person-circle'),
        }}
      />
    </Tabs>
  );
}
