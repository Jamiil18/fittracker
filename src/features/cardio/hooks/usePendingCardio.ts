import { useMemo } from 'react';

import { useSession } from '@/features/auth/components/SessionProvider';
import { useOutbox } from '@/lib/outbox/outboxStore';

import type { CardioSession } from '../api/cardio';
import { cardioPayloadSchema } from '../utils/recording';
import type { RoutePoint } from '../utils/route';

type PendingCardio = { session: CardioSession; route: RoutePoint[] };

// Recorded sessions still in the outbox, shaped like saved ones so History
// and the detail screen can show them, marked "Not synced yet".
export function usePendingCardio(): PendingCardio[] {
  const { user } = useSession();
  const items = useOutbox((state) => state.items);
  return useMemo(
    () =>
      items.flatMap((item) => {
        if (item.kind !== 'cardio' || item.userId !== user?.id) return [];
        const parsed = cardioPayloadSchema.safeParse(item.payload);
        if (!parsed.success) return [];
        const payload = parsed.data;
        return [
          {
            session: {
              id: payload.id,
              activity: payload.activity,
              startedAt: Date.parse(payload.started_at),
              endedAt: Date.parse(payload.ended_at),
              movingSeconds: payload.moving_seconds,
              distanceM: payload.distance_m,
            },
            route: payload.route,
          },
        ];
      }),
    [items, user?.id],
  );
}
