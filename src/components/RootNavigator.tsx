import { NavigationBar } from 'expo-navigation-bar';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/components/SessionProvider';
import { logger } from '@/lib/logger';
import { useThemePreference } from '@/theme/ThemePreferenceProvider';
import { useNavigationTheme } from '@/theme/useNavigationTheme';
import { useStackScreenOptions } from '@/theme/useStackScreenOptions';
import { useTheme } from '@/theme/useTheme';

// Chooses which group of screens exists. When the signed-in state changes,
// Expo Router removes the other group's screens from history and moves to the
// first available one, so a signed-out user can't go back into the app.
export function RootNavigator() {
  const { user, isLoading: isSessionLoading, isResettingPassword } = useSession();
  const { isLoading: isThemeLoading } = useThemePreference();
  const isLoading = isSessionLoading || isThemeLoading;
  const { colors } = useTheme();
  const navigationTheme = useNavigationTheme();
  const screenOptions = useStackScreenOptions();

  // The native view behind React Native shows through during transitions and
  // keyboard animations. A colour in app.json can't follow light and dark
  // mode, so it's set from the theme whenever the mode changes.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch((error: unknown) =>
      logger.error('set root background', error),
    );
  }, [colors.background]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch((error: unknown) => logger.error('hide splash', error));
    }
  }, [isLoading]);

  // The splash screen stays up until we know who is signed in and which theme
  // was chosen, so neither the sign-in screen nor the wrong theme ever flashes.
  if (isLoading) return null;

  const signedIn = user !== null && !isResettingPassword;

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ ...screenOptions, headerShown: false }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
      {/* The app draws behind both Android system bars, so only their icons
          need setting: "auto" picks dark icons in light mode and light icons
          in dark mode, following the theme chosen in Settings. */}
      <StatusBar style="auto" />
      <NavigationBar style="auto" />
    </ThemeProvider>
  );
}
