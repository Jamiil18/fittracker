import { z } from 'zod';

// What save_workout receives (supabase/migrations/20261009090000_save_workout.sql).
// The limits match the checks on the workouts and sets tables. A finished
// workout waits in the outbox in this shape, and is checked again before it
// is sent, in case the copy on the phone was damaged.
export const savePayloadSchema = z.object({
  id: z.uuid(),
  routine_id: z.uuid().nullable(),
  name: z.string().trim().min(1).max(60),
  notes: z.string().max(1000).nullable(),
  started_at: z.iso.datetime(),
  ended_at: z.iso.datetime(),
  exercises: z
    .array(
      z.object({
        exercise_id: z.uuid(),
        notes: z.string().max(500).nullable(),
        sets: z
          .array(
            z.object({
              weight_kg: z.number().min(0).max(1000).nullable(),
              reps: z.int().min(1).max(1000).nullable(),
              duration_seconds: z.int().min(1).max(86400).nullable(),
              distance_m: z.number().positive().max(1_000_000).nullable(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type SavePayload = z.infer<typeof savePayloadSchema>;
