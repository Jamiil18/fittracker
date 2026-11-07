import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { logger } from '@/lib/logger';

// Shown by Expo Router in place of the whole app when a screen throws while
// rendering. The error's own message is not shown: it is written for
// developers and could contain user data.
export function AppErrorFallback({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    logger.error('render', error);
  }, [error]);

  // A crash during launch happens while the splash screen is still up, and it
  // would otherwise cover this screen forever.
  useEffect(() => {
    SplashScreen.hideAsync().catch((hideError: unknown) => logger.error('hide splash', hideError));
  }, []);

  return (
    <Screen>
      <View style={styles.centered}>
        <ErrorState
          title="Something went wrong"
          message="FitTracker hit a problem. Your saved data is safe."
          onRetry={() => void retry()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center' },
});
