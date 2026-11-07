import { z } from 'zod';

import { exerciseTypes } from '@/features/exercises/schemas/exerciseSchemas';

// A set as it is being logged. Values stay as the text the user typed, in the
// units the workout started with, so the inputs show exactly what was entered;
// they are converted to kilograms and metres only when the workout is saved.
// `duration` holds digits typed like a microwave timer: "130" is 1:30.
const sessionSetSchema = z.object({
  key: z.string(),
  weight: z.string(),
  reps: z.string(),
  duration: z.string(),
  distance: z.string(),
  done: z.boolean(),
});

export type SessionSet = z.infer<typeof sessionSetSchema>;

const sessionExerciseSchema = z.object({
  key: z.string(),
  // A copy of what the workout needs, so it works offline and keeps its name
  // even if the exercise is renamed meanwhile.
  exercise: z.object({
    id: z.uuid(),
    name: z.string(),
    exerciseType: z.enum(exerciseTypes),
  }),
  notes: z.string().nullable(),
  // The rest after each set in this workout: the routine's, or the default.
  restSeconds: z.int().min(0).max(900),
  // The routine's targets, used as hints when there's no previous workout.
  targets: z.object({
    weightKg: z.number().nullable(),
    repsMin: z.int().nullable(),
    durationSeconds: z.int().nullable(),
  }),
  sets: z.array(sessionSetSchema),
});

export type SessionExercise = z.infer<typeof sessionExerciseSchema>;

// The one timer that can run at a time: the rest after a set, or a timed set
// counting down. Stored as times, never as a count, so it stays right while
// the app is in the background or closed.
const timerSchema = z.object({
  kind: z.enum(['rest', 'set']),
  exerciseKey: z.string(),
  setKey: z.string().nullable(),
  startedAt: z.number(),
  endsAt: z.number(),
  // The scheduled "time's up" notification, cancelled if the timer changes.
  notificationId: z.string().nullable(),
});

export type WorkoutTimer = z.infer<typeof timerSchema>;

export const sessionSchema = z.object({
  // Created on the phone; the server keeps it, so a retried save is recognised.
  id: z.uuid(),
  userId: z.uuid(),
  routineId: z.uuid().nullable(),
  name: z.string(),
  notes: z.string(),
  startedAt: z.number(),
  weightUnit: z.enum(['kg', 'lb']),
  distanceUnit: z.enum(['km', 'mi']),
  exercises: z.array(sessionExerciseSchema),
  timer: timerSchema.nullable(),
});

export type WorkoutSession = z.infer<typeof sessionSchema>;
