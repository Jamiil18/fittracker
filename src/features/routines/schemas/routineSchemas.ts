import { z } from 'zod';

import {
  exerciseListColumns,
  exerciseSummarySchema,
  exerciseTypes,
  type ExerciseType,
} from '@/features/exercises/schemas/exerciseSchemas';
import { hasDuration } from '@/features/workout/utils/setValues';
import { parseDecimalInput, roundTo, toKilograms, type WeightUnit } from '@/lib/units';

// The limits below match the checks in supabase/migrations.
export const maxRoutineNameLength = 60;
export const maxRoutineNotesLength = 500;
export const maxRoutineExercises = 30;

// The weighted types can also have a target weight, which means the same as a
// set's weight: the load, the added load, or the assistance. Others have none.
export function targetWeightLabel(exerciseType: ExerciseType): 'Weight' | 'Assistance' | null {
  if (exerciseType === 'weight_reps' || exerciseType === 'weighted_bodyweight') return 'Weight';
  if (exerciseType === 'assisted_bodyweight') return 'Assistance';
  return null;
}

// The heaviest target the database accepts is 1000 kg; in pounds the limit is
// rounded down to a figure that is easy to read.
const maxTargetWeight: Record<WeightUnit, number> = { kg: 1000, lb: 2200 };

export const routineColumns = `id, name, notes, position,
  routine_exercises (
    id, position, target_sets, target_reps_min, target_reps_max,
    target_duration_seconds, target_weight_kg, rest_seconds,
    exercise:exercises (${exerciseListColumns})
  )`;

const routineExerciseRowSchema = z
  .object({
    id: z.uuid(),
    position: z.int(),
    target_sets: z.int(),
    target_reps_min: z.int().nullable(),
    target_reps_max: z.int().nullable(),
    target_duration_seconds: z.int().nullable(),
    target_weight_kg: z.number().nullable(),
    rest_seconds: z.int().nullable(),
    exercise: exerciseSummarySchema,
  })
  .transform((row) => ({
    id: row.id,
    position: row.position,
    exercise: row.exercise,
    targetSets: row.target_sets,
    targetRepsMin: row.target_reps_min,
    targetRepsMax: row.target_reps_max,
    targetDurationSeconds: row.target_duration_seconds,
    targetWeightKg: row.target_weight_kg,
    // Null means the profile's default rest time.
    restSeconds: row.rest_seconds,
  }));

export const routineSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    notes: z.string().nullable(),
    position: z.int(),
    routine_exercises: z.array(routineExerciseRowSchema),
  })
  .transform((row) => ({
    id: row.id,
    name: row.name,
    notes: row.notes,
    exercises: [...row.routine_exercises].sort((a, b) => a.position - b.position),
  }));

export type Routine = z.output<typeof routineSchema>;

// A count typed into a field: empty, or a whole number within the limits.
function optionalCount(message: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), message)
    .transform((value) => (value === '' ? null : Number(value)))
    .refine((value) => value === null || (value >= min && value <= max), message);
}

// The form schema depends on the weight unit, because target weights are typed
// in the user's unit and saved in kilograms.
function routineExerciseFormSchema(weightUnit: WeightUnit) {
  return (
    z
      .object({
        exerciseId: z.uuid(),
        // Shown in the form only; the database looks the exercise up by id.
        exerciseName: z.string(),
        exerciseType: z.enum(exerciseTypes),
        sets: optionalCount('Sets must be from 1 to 20.', 1, 20).refine(
          (value) => value !== null,
          'Enter the number of sets.',
        ),
        repsMin: optionalCount('Reps must be from 1 to 100.', 1, 100),
        repsMax: optionalCount('Reps must be from 1 to 100.', 1, 100),
        durationMinutes: optionalCount('Minutes must be from 0 to 60.', 0, 60),
        durationSeconds: optionalCount('Seconds must be from 0 to 59.', 0, 59),
        weight: z.string().trim(),
        restSeconds: z.int().min(0).max(900).nullable(),
      })
      .superRefine((value, context) => {
        if (hasDuration(value.exerciseType)) {
          const total = (value.durationMinutes ?? 0) * 60 + (value.durationSeconds ?? 0);
          const entered = value.durationMinutes !== null || value.durationSeconds !== null;
          if (entered && (total < 1 || total > 3600)) {
            context.addIssue({
              code: 'custom',
              path: ['durationSeconds'],
              message: 'Time must be from 0:01 to 60:00.',
            });
          }
          return;
        }
        if (value.repsMax !== null && value.repsMin === null) {
          context.addIssue({
            code: 'custom',
            path: ['repsMin'],
            message: 'Enter the minimum reps too, or clear the maximum.',
          });
        }
        if (value.repsMax !== null && value.repsMin !== null && value.repsMax < value.repsMin) {
          context.addIssue({
            code: 'custom',
            path: ['repsMax'],
            message: 'Maximum reps must be at least the minimum.',
          });
        }
        const weightLabel = targetWeightLabel(value.exerciseType);
        if (weightLabel && value.weight !== '') {
          const weight = parseDecimalInput(value.weight);
          const max = maxTargetWeight[weightUnit];
          if (weight === null || weight <= 0 || weight > max) {
            context.addIssue({
              code: 'custom',
              path: ['weight'],
              message: `${weightLabel} must be above 0 and at most ${max} ${weightUnit}.`,
            });
          }
        }
      })
      // Only the targets that fit the exercise type are saved, so a value left in
      // a hidden field never reaches the database.
      .transform((value) => {
        const timed = hasDuration(value.exerciseType);
        const duration = (value.durationMinutes ?? 0) * 60 + (value.durationSeconds ?? 0);
        const weight = targetWeightLabel(value.exerciseType)
          ? parseDecimalInput(value.weight)
          : null;
        return {
          exerciseId: value.exerciseId,
          targetSets: value.sets ?? 1,
          targetRepsMin: timed ? null : value.repsMin,
          targetRepsMax: timed || value.repsMax === value.repsMin ? null : value.repsMax,
          targetDurationSeconds: timed && duration > 0 ? duration : null,
          // Three decimals, as the database stores, so a weight typed in pounds
          // reads back as the same number of pounds.
          targetWeightKg: weight === null ? null : roundTo(toKilograms(weight, weightUnit), 3),
          restSeconds: value.restSeconds,
        };
      })
  );
}

export function createRoutineFormSchema(weightUnit: WeightUnit) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Enter a name.')
      .max(maxRoutineNameLength, `Use ${maxRoutineNameLength} characters or fewer.`),
    notes: z
      .string()
      .trim()
      .max(maxRoutineNotesLength, `Use ${maxRoutineNotesLength} characters or fewer.`)
      .transform((value) => (value === '' ? null : value)),
    exercises: z
      .array(routineExerciseFormSchema(weightUnit))
      .min(1, 'Add at least one exercise.')
      .max(maxRoutineExercises, `A routine can have up to ${maxRoutineExercises} exercises.`),
  });
}

type RoutineFormSchema = ReturnType<typeof createRoutineFormSchema>;
export type RoutineFormInput = z.input<RoutineFormSchema>;
export type RoutineExerciseFormInput = RoutineFormInput['exercises'][number];
export type RoutineValues = z.output<RoutineFormSchema>;
