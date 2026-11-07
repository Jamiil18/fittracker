import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useSession } from '@/features/auth/components/SessionProvider';
import { toAppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import {
  routineColumns,
  routineSchema,
  type Routine,
  type RoutineValues,
} from '../schemas/routineSchemas';

function routinesKey(userId: string) {
  return ['routines', userId] as const;
}

// Every routine with its exercises in one request. Routines are small, and
// having them all in the cache means any routine opens offline, even one
// that was never opened before.
export async function fetchRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select(routineColumns)
    .order('position')
    .order('created_at');
  if (error) throw toAppError(error);
  return data.map((row) => routineSchema.parse(row));
}

// Saves through the save_routine database function, which writes the routine
// and its exercise list in one transaction.
// A null id creates a new routine. Returns the routine's id.
export async function saveRoutine(
  routineId: string | null,
  values: RoutineValues,
): Promise<string> {
  const { data, error } = await supabase.rpc('save_routine', {
    routine_id: routineId,
    routine_name: values.name,
    routine_notes: values.notes,
    exercises: values.exercises.map((item) => ({
      exercise_id: item.exerciseId,
      target_sets: item.targetSets,
      target_reps_min: item.targetRepsMin,
      target_reps_max: item.targetRepsMax,
      target_duration_seconds: item.targetDurationSeconds,
      target_weight_kg: item.targetWeightKg,
      rest_seconds: item.restSeconds,
    })),
  });
  if (error) throw toAppError(error);
  return z.uuid().parse(data);
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', routineId);
  if (error) throw toAppError(error);
}

export async function reorderRoutines(routineIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_routines', { routine_ids: routineIds });
  if (error) throw toAppError(error);
}

export function useRoutines() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  return useQuery({
    queryKey: routinesKey(userId),
    queryFn: fetchRoutines,
    enabled: user !== null,
  });
}

// One routine, read from the list so it is available whenever the list is.
export function useRoutine(routineId: string) {
  const routines = useRoutines();
  return {
    ...routines,
    routine: routines.data?.find((routine) => routine.id === routineId),
  };
}

function useRefreshRoutines() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const userId = user?.id ?? '';
  return () => queryClient.invalidateQueries({ queryKey: routinesKey(userId) });
}

// Writes need a connection, so they fail straight away offline instead of
// waiting silently. Each one waits for the
// list to refresh, so the next screen already shows the change.
export function useSaveRoutine(routineId: string | null) {
  const refresh = useRefreshRoutines();
  return useMutation({
    mutationFn: (values: RoutineValues) => saveRoutine(routineId, values),
    networkMode: 'always',
    onSuccess: refresh,
  });
}

// The list refreshes without being waited for: the routine's own screen
// closes first, rather than briefly showing that its routine has gone.
export function useDeleteRoutine() {
  const refresh = useRefreshRoutines();
  return useMutation({
    mutationFn: deleteRoutine,
    networkMode: 'always',
    onSuccess: () => {
      void refresh();
    },
  });
}

export function useReorderRoutines() {
  const refresh = useRefreshRoutines();
  return useMutation({
    mutationFn: reorderRoutines,
    networkMode: 'always',
    onSuccess: refresh,
  });
}
