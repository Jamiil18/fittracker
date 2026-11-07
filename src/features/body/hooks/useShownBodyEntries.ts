import { useMemo } from 'react';

import { useSession } from '@/features/auth/components/SessionProvider';
import { useOutbox } from '@/lib/outbox/outboxStore';

import { useBodyEntries } from '../api/body';
import { bodyLogPayloadSchema, type BodyLogPayload } from '../schemas/bodySchemas';
import { mergeBodyEntries } from '../utils/bodyEntries';

// Saved bodyweights with any logs still in the outbox applied,
// so a value logged offline shows straight away, marked as not synced.
export function useShownBodyEntries() {
  const { user } = useSession();
  const saved = useBodyEntries();
  const items = useOutbox((state) => state.items);
  const entries = useMemo(() => {
    const pending = items.flatMap((item): BodyLogPayload[] => {
      if (item.kind !== 'body' || item.userId !== user?.id) return [];
      const parsed = bodyLogPayloadSchema.safeParse(item.payload);
      return parsed.success ? [parsed.data] : [];
    });
    return mergeBodyEntries(saved.data ?? [], pending);
  }, [saved.data, items, user?.id]);
  return { ...saved, entries };
}
