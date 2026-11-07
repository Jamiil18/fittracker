import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useSession } from '@/features/auth/components/SessionProvider';
import { toAppError } from '@/lib/errors';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

import { activities, type RoutePoint } from '../utils/route';
import { cardioPayloadSchema } from '../utils/recording';

const sessionSchema = z
  .object({
    id: z.uuid(),
    activity: z.enum(activities),
    started_at: z.string(),
    ended_at: z.string(),
    moving_seconds: z.int(),
    distance_m: z.number(),
  })
  .transform((row) => ({
    id: row.id,
    activity: row.activity,
    startedAt: Date.parse(row.started_at),
    endedAt: Date.parse(row.ended_at),
    movingSeconds: row.moving_seconds,
    distanceM: row.distance_m,
  }));

export type CardioSession = z.output<typeof sessionSchema>;

const routeSchema = z.array(z.tuple([z.number(), z.number(), z.number()]));

function cardioSessionsKey(userId: string) {
  return ['cardio-sessions', userId] as const;
}

// Every session without its route, which can be thousands of points; the
// route is fetched when a session is opened.
export async function fetchCardioSessions(): Promise<CardioSession[]> {
  const { data, error } = await supabase
    .from('cardio_sessions')
    .select('id, activity, started_at, ended_at, moving_seconds, distance_m')
    .order('started_at', { ascending: false });
  if (error) throw toAppError(error);
  return data.map((row) => sessionSchema.parse(row));
}

async function fetchCardioRoute(sessionId: string): Promise<RoutePoint[]> {
  const { data, error } = await supabase
    .from('cardio_sessions')
    .select('route')
    .eq('id', sessionId)
    .single();
  if (error) throw toAppError(error);
  return routeSchema.parse(data.route);
}

// Sends a finished recording from the outbox. The id comes from the phone, so
// sending the same session twice (after a lost reply) saves it once.
export async function sendCardioSession(payload: unknown): Promise<void> {
  const session = cardioPayloadSchema.parse(payload);
  const { error } = await supabase
    .from('cardio_sessions')
    .upsert(session, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw toAppError(error);
  await queryClient.invalidateQueries({ queryKey: ['cardio-sessions'] });
}

async function deleteCardioSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('cardio_sessions').delete().eq('id', sessionId);
  if (error) throw toAppError(error);
}

export function useCardioSessions() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  return useQuery({
    queryKey: cardioSessionsKey(userId),
    queryFn: fetchCardioSessions,
    enabled: user !== null,
  });
}

// Saved on the phone once opened, so a route seen before shows offline.
export function useCardioRoute(sessionId: string, enabled: boolean) {
  const { user } = useSession();
  return useQuery({
    queryKey: ['cardio-route', user?.id ?? '', sessionId],
    queryFn: () => fetchCardioRoute(sessionId),
    enabled: user !== null && enabled,
    staleTime: Infinity,
  });
}

// Deleting needs a connection; the detail screen closes first.
export function useDeleteCardioSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteCardioSession,
    networkMode: 'always',
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['cardio-sessions'] });
    },
  });
}
