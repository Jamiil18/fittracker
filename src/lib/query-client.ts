import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { logger } from './logger';
import { useOutbox } from './outbox/outboxStore';

// Cached server data is saved on the phone so the app can open and start a
// workout without a connection. 90 days covers a long break from training;
// the cache is cleared on sign-out so the next person on the phone sees
// nothing.
export const cacheMaxAgeMs = 1000 * 60 * 60 * 24 * 90;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Must be at least the persisted cache's age, or entries would be
      // garbage-collected before they could be restored.
      gcTime: cacheMaxAgeMs,
      staleTime: 1000 * 60,
      retry: 2,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'fittracker-query-cache',
});

// Also empties the outbox: writes that haven't synced belong to the user
// signing out. Settings warns before signing out when there are any.
export async function clearCachedData(): Promise<void> {
  queryClient.clear();
  useOutbox.getState().clear();
  try {
    await queryPersister.removeClient();
  } catch (error) {
    logger.error('clear query cache', error);
  }
}

// React Native has no browser events for these, so TanStack Query is told
// when the connection changes (to retry and refetch on reconnect) and when the
// app comes to the foreground (to refetch stale data), as its React Native
// guide recommends.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false);
  }),
);

AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});
