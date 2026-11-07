import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@/theme/useStackScreenOptions';

export default function AuthLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      {/* The screen shows "FitTracker" as its own title instead of a header.
          The title is still set because iOS uses it for the next screen's
          back button. */}
      <Stack.Screen name="sign-in" options={{ title: 'Sign in', headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
      <Stack.Screen name="verify-email" options={{ title: 'Verify email' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Set new password' }} />
    </Stack>
  );
}
