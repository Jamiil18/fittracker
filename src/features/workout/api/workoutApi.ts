import { useQueries } from '@tanstack/react-query';
import { z } from 'zod';

import { useSession } from '@/features/auth/components/SessionProvider';
import { toAppError } from '@/lib/errors';
import { queryClient } from '@/lib/query-client';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { supabase } from '@/lib/supabase';

import { savePayloadSchema } from '../schemas/savePayloadSchema';
import type { HistorySet } from '../utils/setValues';

function exerciseHistoryKey(userId: string, exerciseId: string) {
  return ['exercise-history', userId, exerciseId] as const;
}

const historyColumns =
  'workout_id, workout_started_at, exercise_position, set_position, weight_kg, reps, duration_seconds, distance_m';

const historyRowSchema = z
  .object({
    workout_id: z.uuid(),
    workout_started_at: z.string(),
    exercise_position: z.int(),
    set_position: z.int(),
    weight_kg: z.number().nullable(),
    reps: z.int().nullable(),
    duration_seconds: z.int().nullable(),
    distance_m: z.number().nullable(),
  })
  .transform((row): HistorySet => ({
    workoutId: row.workout_id,
    startedAt: row.workout_started_at,
    exercisePosition: row.exercise_position,
    setPosition: row.set_position,
    weightKg: row.weight_kg,
    reps: row.reps,
    durationSeconds: row.duration_seconds,
    distanceM: row.distance_m,
  }));

// Every set the user has logged for one exercise, newest workout first. It
// gives the Previous column and the earlier bests that records are measured
// against, and is saved on the phone so both work offline.
async function fetchExerciseHistory(exerciseId: string): Promise<HistorySet[]> {
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from('exercise_set_history')
      .select(historyColumns)
      .eq('exercise_id', exerciseId)
      .order('workout_started_at', { ascending: false })
      .order('exercise_position')
      .order('set_position')
      .range(from, to),
  );
  return rows.map((row) => historyRowSchema.parse(row));
}

// The sets of the most recent workout with the exercise, in order. If it was
// done twice in that workout, the first time counts.
export function lastWorkoutSets(history: HistorySet[]): HistorySet[] {
  const first = history[0];
  if (!first) return [];
  return history.filter(
    (set) => set.workoutId === first.workoutId && set.exercisePosition === first.exercisePosition,
  );
}

// The history of each exercise in the workout, keyed by exercise id.
export function useExerciseHistories(exerciseIds: string[]) {
  const { user } = useSession();
  const userId = user?.id ?? '';
  const unique = [...new Set(exerciseIds)];
  return useQueries({
    queries: unique.map((exerciseId) => ({
      queryKey: exerciseHistoryKey(userId, exerciseId),
      queryFn: () => fetchExerciseHistory(exerciseId),
      enabled: user !== null,
    })),
    combine: (results) =>
      new Map(
        unique.flatMap((exerciseId, index) => {
          const data = results[index]?.data;
          return data ? [[exerciseId, data] as const] : [];
        }),
      ),
  });
}

// Sends a finished workout from the outbox. The payload is checked again
// first, in case the copy saved on the phone was damaged.
export async function saveWorkout(payload: unknown): Promise<void> {
  const workout = savePayloadSchema.parse(payload);
  const { error } = await supabase.rpc('save_workout', { workout });
  if (error) throw toAppError(error);
  // The new sets change Previous, the records, History and Progress.
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['exercise-history'] }),
    queryClient.invalidateQueries({ queryKey: ['training-history'] }),
  ]);
}
