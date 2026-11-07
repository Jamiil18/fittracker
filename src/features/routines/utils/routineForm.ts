import type { ExerciseSummary } from '@/features/exercises/schemas/exerciseSchemas';
import { fromKilograms, roundTo, type WeightUnit } from '@/lib/units';

import type {
  Routine,
  RoutineExerciseFormInput,
  RoutineFormInput,
} from '../schemas/routineSchemas';

function countText(value: number | null): string {
  return value === null ? '' : String(value);
}

// A newly added exercise starts with three sets, or one for distance work
// such as a run, and the profile's default rest time.
export function newRoutineExercise(exercise: ExerciseSummary): RoutineExerciseFormInput {
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    exerciseType: exercise.exerciseType,
    sets: exercise.exerciseType === 'distance_duration' ? '1' : '3',
    repsMin: '',
    repsMax: '',
    durationMinutes: '',
    durationSeconds: '',
    weight: '',
    restSeconds: null,
  };
}

// The edit form's starting values, with weights in the user's unit. The
// database only stores targets that fit the exercise's type.
export function routineToFormInput(routine: Routine, weightUnit: WeightUnit): RoutineFormInput {
  return {
    name: routine.name,
    notes: routine.notes ?? '',
    exercises: routine.exercises.map((item) => {
      const duration = item.targetDurationSeconds;
      const weight = item.targetWeightKg;
      return {
        exerciseId: item.exercise.id,
        exerciseName: item.exercise.name,
        exerciseType: item.exercise.exerciseType,
        sets: countText(item.targetSets),
        repsMin: countText(item.targetRepsMin),
        repsMax: countText(item.targetRepsMax),
        durationMinutes: duration === null ? '' : String(Math.floor(duration / 60)),
        durationSeconds: duration === null ? '' : String(duration % 60),
        weight: weight === null ? '' : String(roundTo(fromKilograms(weight, weightUnit), 2)),
        restSeconds: item.restSeconds,
      };
    }),
  };
}
