import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { RootNavigator } from '@/components/RootNavigator';
import { SessionProvider } from '@/features/auth/components/SessionProvider';
import { logger } from '@/lib/logger';
import { cacheMaxAgeMs, queryClient, queryPersister } from '@/lib/query-client';
import { ThemePreferenceProvider } from '@/theme/ThemePreferenceProvider';

// Keep the splash screen up until the stored session has been read.
SplashScreen.preventAutoHideAsync().catch((error: unknown) =>
  logger.error('keep splash screen', error),
);

// Expo Router shows this in place of everything below when rendering throws.
export { AppErrorFallback as ErrorBoundary } from '@/components/AppErrorFallback';

// Bump when the shape of cached data changes, so old caches are discarded.
const cacheVersion = '2';

// Swipe actions and drag-to-reorder use Gesture Handler, whose gestures only
// work inside its root view.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryPersister, maxAge: cacheMaxAgeMs, buster: cacheVersion }}
      >
        <ThemePreferenceProvider>
          <SessionProvider>
            <RootNavigator />
          </SessionProvider>
        </ThemePreferenceProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
