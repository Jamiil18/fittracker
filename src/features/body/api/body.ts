import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/components/SessionProvider';
import { toAppError } from '@/lib/errors';
import { queryClient } from '@/lib/query-client';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { supabase } from '@/lib/supabase';

import {
  bodyEntryColumns,
  bodyEntrySchema,
  bodyLogPayloadSchema,
  type BodyEntry,
} from '../schemas/bodySchemas';

function bodyEntriesKey(userId: string) {
  return ['body-entries', userId] as const;
}

// Every day with a bodyweight, newest first. Saved on the
// phone with the rest of the cache, so the Body section works offline.
async function fetchBodyEntries(): Promise<BodyEntry[]> {
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from('body_measurements')
      .select(bodyEntryColumns)
      .order('measured_on', { ascending: false })
      .range(from, to),
  );
  return rows.map((row) => bodyEntrySchema.parse(row));
}

// Sends a logged day from the outbox. There is one row per day: logging the
// same day again replaces its bodyweight.
export async function sendBodyLog(payload: unknown): Promise<void> {
  const values = bodyLogPayloadSchema.parse(payload);
  const { error } = await supabase
    .from('body_measurements')
    .upsert(values, { onConflict: 'user_id,measured_on' });
  if (error) throw toAppError(error);
  await queryClient.invalidateQueries({ queryKey: ['body-entries'] });
}

async function deleteBodyEntry(measuredOn: string): Promise<void> {
  const { error } = await supabase.from('body_measurements').delete().eq('measured_on', measuredOn);
  if (error) throw toAppError(error);
}

export function useBodyEntries() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  return useQuery({
    queryKey: bodyEntriesKey(userId),
    queryFn: fetchBodyEntries,
    enabled: user !== null,
  });
}

// Deleting needs a connection, so it fails straight away offline instead of
// waiting.
export function useDeleteBodyEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteBodyEntry,
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: ['body-entries'] }),
  });
}
