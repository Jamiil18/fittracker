import { z } from 'zod';

// These mirror the enums in the database (supabase/migrations).
export const exerciseTypes = [
  'weight_reps',
  'bodyweight_reps',
  'weighted_bodyweight',
  'assisted_bodyweight',
  'duration',
  'distance_duration',
] as const;

export const muscleGroups = [
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower_back',
  'middle_back',
  'neck',
  'quadriceps',
  'shoulders',
  'traps',
  'triceps',
] as const;

export const equipmentKinds = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'cable',
  'machine',
  'bands',
  'body_only',
  'ez_bar',
  'medicine_ball',
  'exercise_ball',
  'foam_roll',
  'other',
] as const;

export type ExerciseType = (typeof exerciseTypes)[number];
export type MuscleGroup = (typeof muscleGroups)[number];
export type Equipment = (typeof equipmentKinds)[number];

export const exerciseListColumns =
  'id, name, exercise_type, primary_muscles, secondary_muscles, equipment';

const exerciseRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  exercise_type: z.enum(exerciseTypes),
  primary_muscles: z.array(z.enum(muscleGroups)),
  secondary_muscles: z.array(z.enum(muscleGroups)),
  equipment: z.enum(equipmentKinds),
});

function toSummary(row: z.infer<typeof exerciseRowSchema>) {
  return {
    id: row.id,
    name: row.name,
    exerciseType: row.exercise_type,
    primaryMuscles: row.primary_muscles,
    secondaryMuscles: row.secondary_muscles,
    equipment: row.equipment,
  };
}

// A row in the library list. Parsed at the API boundary so the rest of the app
// never depends on column names.
export const exerciseSummarySchema = exerciseRowSchema.transform(toSummary);

export type ExerciseSummary = z.output<typeof exerciseSummarySchema>;

export const exerciseDetailColumns = `${exerciseListColumns}, instructions, image_paths`;

export const exerciseDetailSchema = exerciseRowSchema
  .extend({ instructions: z.array(z.string()), image_paths: z.array(z.string()) })
  .transform((row) => ({
    ...toSummary(row),
    instructions: row.instructions,
    imagePaths: row.image_paths,
  }));

export type ExerciseDetail = z.output<typeof exerciseDetailSchema>;
