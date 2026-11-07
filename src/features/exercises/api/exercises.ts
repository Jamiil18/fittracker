import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/components/SessionProvider';
import { toAppError } from '@/lib/errors';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { supabase } from '@/lib/supabase';

import {
  exerciseDetailColumns,
  exerciseDetailSchema,
  exerciseListColumns,
  exerciseSummarySchema,
  type ExerciseDetail,
  type ExerciseSummary,
} from '../schemas/exerciseSchemas';

function exerciseLibraryKey(userId: string) {
  return ['exercises', userId] as const;
}

export function exerciseKey(userId: string, exerciseId: string) {
  return ['exercises', userId, exerciseId] as const;
}

// The whole library, read-only reference data seeded from the open dataset.
export async function fetchExerciseLibrary(): Promise<ExerciseSummary[]> {
  const rows = await fetchAllPages((from, to) =>
    supabase.from('exercises').select(exerciseListColumns).order('name').range(from, to),
  );
  return rows.map((row) => exerciseSummarySchema.parse(row));
}

async function fetchExercise(exerciseId: string): Promise<ExerciseDetail> {
  const { data, error } = await supabase
    .from('exercises')
    .select(exerciseDetailColumns)
    .eq('id', exerciseId)
    .single();
  if (error) throw toAppError(error);
  return exerciseDetailSchema.parse(data);
}

export function useExerciseLibrary() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  return useQuery({
    queryKey: exerciseLibraryKey(userId),
    queryFn: fetchExerciseLibrary,
    enabled: user !== null,
    // The library rarely changes, and the copy on the phone is what makes
    // search work offline.
    staleTime: 1000 * 60 * 60,
  });
}

export function useExercise(exerciseId: string) {
  const { user } = useSession();
  const userId = user?.id ?? '';
  return useQuery({
    queryKey: exerciseKey(userId, exerciseId),
    queryFn: () => fetchExercise(exerciseId),
    enabled: user !== null && exerciseId !== '',
  });
}
