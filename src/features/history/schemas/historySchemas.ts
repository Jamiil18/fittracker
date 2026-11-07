import { z } from 'zod';

import { exerciseTypes, muscleGroups } from '@/features/exercises/schemas/exerciseSchemas';

export const pastWorkoutColumns = `id, routine_id, name, notes, started_at, ended_at,
  workout_exercises (
    id, position, notes,
    exercise:exercises (id, name, exercise_type, primary_muscles),
    sets (id, position, weight_kg, reps, duration_seconds, distance_m)
  )`;

const pastSetSchema = z
  .object({
    id: z.uuid(),
    position: z.int(),
    weight_kg: z.number().nullable(),
    reps: z.int().nullable(),
    duration_seconds: z.int().nullable(),
    distance_m: z.number().nullable(),
  })
  .transform((row) => ({
    id: row.id,
    position: row.position,
    weightKg: row.weight_kg,
    reps: row.reps,
    durationSeconds: row.duration_seconds,
    distanceM: row.distance_m,
  }));

export type PastSet = z.output<typeof pastSetSchema>;

const pastExerciseSchema = z
  .object({
    id: z.uuid(),
    position: z.int(),
    notes: z.string().nullable(),
    exercise: z.object({
      id: z.uuid(),
      name: z.string(),
      exercise_type: z.enum(exerciseTypes),
      primary_muscles: z.array(z.enum(muscleGroups)),
    }),
    sets: z.array(pastSetSchema),
  })
  .transform((row) => ({
    id: row.id,
    position: row.position,
    notes: row.notes,
    exercise: {
      id: row.exercise.id,
      name: row.exercise.name,
      exerciseType: row.exercise.exercise_type,
      primaryMuscles: row.exercise.primary_muscles,
    },
    sets: [...row.sets].sort((a, b) => a.position - b.position),
  }));

// A finished workout as History, Progress and the exercise screens use it.
export const pastWorkoutSchema = z
  .object({
    id: z.uuid(),
    routine_id: z.uuid().nullable(),
    name: z.string(),
    notes: z.string().nullable(),
    started_at: z.string(),
    ended_at: z.string(),
    workout_exercises: z.array(pastExerciseSchema),
  })
  .transform((row) => ({
    id: row.id,
    routineId: row.routine_id,
    name: row.name,
    notes: row.notes,
    startedAt: Date.parse(row.started_at),
    endedAt: Date.parse(row.ended_at),
    exercises: [...row.workout_exercises].sort((a, b) => a.position - b.position),
  }));

export type PastWorkout = z.output<typeof pastWorkoutSchema>;
