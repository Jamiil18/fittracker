import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AppErrorCode } from '../errors';
import { logger } from '../logger';

// Each kind of write that can wait for a connection: finished workouts,
// bodyweight, and recorded cardio sessions.
const outboxKinds = ['workout', 'body', 'cardio'] as const;
export type OutboxKind = (typeof outboxKinds)[number];

const outboxItemSchema = z.object({
  id: z.string(),
  kind: z.enum(outboxKinds),
  // Whose data it is: only the signed-in user's items are sent.
  userId: z.uuid(),
  // Checked by the sender for its kind before it goes to the server.
  payload: z.unknown(),
  createdAt: z.number(),
  // Why the server last refused it, if it did. Network failures aren't
  // recorded: the item simply waits for the connection.
  failure: z.string().nullable(),
});

export type OutboxItem = Omit<z.infer<typeof outboxItemSchema>, 'failure'> & {
  failure: AppErrorCode | null;
};

type OutboxState = {
  items: OutboxItem[];
  add: (item: Omit<OutboxItem, 'createdAt' | 'failure'>) => void;
  remove: (id: string) => void;
  markFailed: (id: string, failure: AppErrorCode) => void;
  clear: () => void;
};

// Writes made without a connection wait here, saved on the phone, until they
// can be sent (docs/ARCHITECTURE.md, "What works offline").
export const useOutbox = create<OutboxState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((state) => ({
          items: [...state.items, { ...item, createdAt: Date.now(), failure: null }],
        })),
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      markFailed: (id, failure) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, failure } : item)),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'fittracker-outbox',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: ({ items }) => ({ items }),
      // Items that don't match the expected shape are dropped one by one, so
      // a damaged entry can't block the rest of the queue.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as { items?: unknown };
        const list = Array.isArray(saved.items) ? saved.items : [];
        const items = list.flatMap((entry) => {
          const parsed = outboxItemSchema.safeParse(entry);
          if (!parsed.success) logger.error('restore outbox item', parsed.error);
          return parsed.success ? [parsed.data as OutboxItem] : [];
        });
        return { ...current, items };
      },
    },
  ),
);
