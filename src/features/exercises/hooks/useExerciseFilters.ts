import { useMemo, useState } from 'react';

import type { Equipment, ExerciseSummary, MuscleGroup } from '../schemas/exerciseSchemas';
import { filterExercises } from '../utils/filterExercises';

// The search text and filters shared by the library and the exercise picker.
export function useExerciseFilters(exercises: ExerciseSummary[]) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  const results = useMemo(
    () => filterExercises(exercises, { query, muscle, equipment }),
    [exercises, query, muscle, equipment],
  );

  return {
    query,
    setQuery,
    muscle,
    setMuscle,
    equipment,
    setEquipment,
    results,
    total: exercises.length,
    isFiltering: query.trim() !== '' || muscle !== null || equipment !== null,
    clear: () => {
      setQuery('');
      setMuscle(null);
      setEquipment(null);
    },
  };
}

export type ExerciseFilters = ReturnType<typeof useExerciseFilters>;
