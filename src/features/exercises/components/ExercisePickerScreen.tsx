import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { errorMessage, toAppError } from '@/lib/errors';

import { useExerciseLibrary } from '../api/exercises';
import { useExerciseFilters } from '../hooks/useExerciseFilters';
import { usePickedExercises } from '../pickedExercisesStore';
import type { ExerciseSummary } from '../schemas/exerciseSchemas';
import { ExerciseFilterControls } from './ExerciseFilterControls';
import { ExerciseList } from './ExerciseList';
import { ExerciseListSkeleton } from './ExerciseListSkeleton';

const noExercises: ExerciseSummary[] = [];

// Choose one or more exercises from the library, in the order they are ticked,
// or with `single`, one exercise that is picked as soon as it is tapped (to
// swap an exercise in a workout). Works offline from the library saved on the phone.
export function ExercisePickerScreen() {
  const router = useRouter();
  const single = useLocalSearchParams<{ single?: string }>().single === 'true';
  const library = useExerciseLibrary();
  const filters = useExerciseFilters(library.data ?? noExercises);
  const setPicked = usePickedExercises((state) => state.setPicked);
  const [chosen, setChosen] = useState<ExerciseSummary[]>([]);
  const chosenIds = useMemo(() => new Set(chosen.map((exercise) => exercise.id)), [chosen]);

  function toggle(exercise: ExerciseSummary) {
    if (single) {
      setPicked([exercise]);
      router.back();
      return;
    }
    setChosen((current) =>
      current.some((item) => item.id === exercise.id)
        ? current.filter((item) => item.id !== exercise.id)
        : [...current, exercise],
    );
  }

  const header = (
    <Stack.Screen
      options={{
        title: single ? 'Swap exercise' : 'Add exercises',
        headerRight: () =>
          single ? null : (
            <Button
              label={chosen.length > 0 ? `Add (${chosen.length})` : 'Add'}
              variant="plain"
              disabled={chosen.length === 0}
              onPress={() => {
                setPicked(chosen);
                router.back();
              }}
            />
          ),
      }}
    />
  );

  if (library.data === undefined) {
    return (
      <Screen padded={false} edges={['bottom']}>
        {header}
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
    <Screen padded={false} edges={['bottom']}>
      {header}
      <ExerciseFilterControls filters={filters} />
      <ExerciseList
        exercises={filters.results}
        onPressExercise={toggle}
        selectedIds={single ? undefined : chosenIds}
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
