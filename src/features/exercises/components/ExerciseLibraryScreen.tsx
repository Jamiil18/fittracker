import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { errorMessage, toAppError } from '@/lib/errors';

import { useExerciseLibrary } from '../api/exercises';
import { useExerciseFilters } from '../hooks/useExerciseFilters';
import type { ExerciseSummary } from '../schemas/exerciseSchemas';
import { ExerciseFilterControls } from './ExerciseFilterControls';
import { ExerciseList } from './ExerciseList';
import { ExerciseListSkeleton } from './ExerciseListSkeleton';

// A stable empty list while loading, so the filtered results aren't
// recalculated on every render.
const noExercises: ExerciseSummary[] = [];

export function ExerciseLibraryScreen() {
  const router = useRouter();
  const library = useExerciseLibrary();
  const filters = useExerciseFilters(library.data ?? noExercises);

  if (library.data === undefined) {
    return (
      <Screen padded={false} edges={[]}>
        {library.isError ? (
          <ErrorState
            title="Couldn't load the exercise library"
            message={errorMessage(toAppError(library.error))}
            onRetry={() => void library.refetch()}
          />
        ) : (
          <ExerciseListSkeleton />
        )}
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={[]}>
      <ExerciseFilterControls filters={filters} />
      <ExerciseList
        exercises={filters.results}
        onPressExercise={(exercise) =>
          router.push({ pathname: '/exercises/[id]', params: { id: exercise.id } })
        }
        emptyState={
          <EmptyState
            title="No exercises match"
            message="Try another name, or clear the search and filters."
            actionLabel="Clear search and filters"
            onAction={filters.clear}
          />
        }
      />
    </Screen>
  );
}
