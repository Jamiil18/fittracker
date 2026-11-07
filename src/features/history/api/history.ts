import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/components/SessionProvider';
import { toAppError } from '@/lib/errors';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { supabase } from '@/lib/supabase';

import { pastWorkoutColumns, pastWorkoutSchema, type PastWorkout } from '../schemas/historySchemas';

function trainingHistoryKey(userId: string) {
  return ['training-history', userId] as const;
}

// Every finished workout with its exercises and sets, newest first, in one
// cached query. History, workout detail, Progress and the exercise screens are
// all worked out from it, so they agree with each other and all work offline.
export async function fetchTrainingHistory(): Promise<PastWorkout[]> {
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from('workouts')
      .select(pastWorkoutColumns)
      .order('started_at', { ascending: false })
      .range(from, to),
  );
  return rows.map((row) => pastWorkoutSchema.parse(row));
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
  if (error) throw toAppError(error);
}

export function useTrainingHistory() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  return useQuery({
    queryKey: trainingHistoryKey(userId),
    queryFn: fetchTrainingHistory,
    enabled: user !== null,
  });
}

export function usePastWorkout(workoutId: string) {
  const history = useTrainingHistory();
  return { ...history, workout: history.data?.find((item) => item.id === workoutId) };
}

// Past workouts also feed Previous in the workout screen, so both caches
// refresh after a change.
function useRefreshHistory() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['training-history'] }),
      queryClient.invalidateQueries({ queryKey: ['exercise-history'] }),
    ]);
}

// Deleting needs a connection, so it fails straight away offline instead of
// waiting. The detail screen closes first;
// the list refreshes without being waited for.
export function useDeleteWorkout() {
  const refresh = useRefreshHistory();
  return useMutation({
    mutationFn: deleteWorkout,
    networkMode: 'always',
    onSuccess: () => {
      void refresh();
    },
  });
}
