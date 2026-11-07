import { onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { flushOutbox, type OutboxSenders } from './flushOutbox';

// Sends waiting items when the signed-in part of the app opens, when the
// connection returns, and when the app comes to the front or goes to the
// background, so nothing waits on the phone longer than it has to.
export function useOutboxSync(userId: string | null, senders: OutboxSenders): void {
  useEffect(() => {
    if (!userId) return;
    const flush = () => void flushOutbox(userId, senders);
    flush();
    const stopWatchingConnection = onlineManager.subscribe((online) => {
      if (online) flush();
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active' || status === 'background') flush();
    });
    return () => {
      stopWatchingConnection();
      appState.remove();
    };
  }, [userId, senders]);
}
