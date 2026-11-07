import { onlineManager } from '@tanstack/react-query';

import { toAppError } from '../errors';
import { logger } from '../logger';
import { useOutbox, type OutboxKind } from './outboxStore';

// Sends one item's payload to the server; throws if it isn't saved.
export type OutboxSenders = Record<OutboxKind, (payload: unknown) => Promise<void>>;

let flushing: Promise<void> | null = null;

// Sends the user's waiting items, oldest first. Only one flush runs at a time,
// so an item is never sent twice at once. A network failure stops the flush
// and leaves everything queued for the next try; any other failure is
// recorded on that item, which stays queued, and the flush moves on.
export function flushOutbox(userId: string, senders: OutboxSenders): Promise<void> {
  if (flushing) return flushing;
  if (!onlineManager.isOnline()) return Promise.resolve();

  flushing = (async () => {
    const waiting = useOutbox.getState().items.filter((item) => item.userId === userId);
    for (const item of waiting) {
      try {
        await senders[item.kind](item.payload);
        useOutbox.getState().remove(item.id);
      } catch (error) {
        const appError = toAppError(error);
        if (appError.code === 'offline') return;
        logger.error('send outbox item', appError);
        useOutbox.getState().markFailed(item.id, appError.code);
      }
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
