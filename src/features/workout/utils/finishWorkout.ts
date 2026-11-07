import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';

import type { SavePayload } from '../schemas/savePayloadSchema';
import type { WorkoutSession } from '../schemas/sessionSchema';
import { newRecords, type NewRecord } from './records';
import { resolveSet, type HistorySet, type SavedSetValues, type Units } from './setValues';
import { volumeKg } from './volume';

const noHints = { weight: '', reps: '', duration: '', distance: '' };
const maxDurationMs = 24 * 60 * 60 * 1000;
const maxNameLength = 60;

type FinishedExercise = {
  exerciseId: string;
  name: string;
  type: ExerciseType;
  notes: string | null;
  sets: SavedSetValues[];
};

// The ticked sets that will be saved, per exercise, in kilograms, metres and
// seconds. A ticked set whose values were later changed to something invalid
// isn't saved; it counts as not ticked.
export function finishedExercises(session: WorkoutSession): FinishedExercise[] {
  const units: Units = { weightUnit: session.weightUnit, distanceUnit: session.distanceUnit };
  return session.exercises
    .map((item) => ({
      exerciseId: item.exercise.id,
      name: item.exercise.name,
      type: item.exercise.exerciseType,
      notes: item.notes?.trim() || null,
      sets: item.sets.flatMap((set) => {
        if (!set.done) return [];
        const resolved = resolveSet(item.exercise.exerciseType, set, noHints, units);
        return resolved.ok ? [resolved.saved] : [];
      }),
    }))
    .filter((item) => item.sets.length > 0);
}

// How many sets won't be saved if the workout is finished now.
export function unsavedSetCount(session: WorkoutSession): number {
  const total = session.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  const saved = finishedExercises(session).reduce((sum, item) => sum + item.sets.length, 0);
  return total - saved;
}

// The database limits a workout to 24 hours, so one left running longer is
// saved as ending 24 hours after it started rather than being refused.
function endTime(session: WorkoutSession, endedAt: number): number {
  return Math.min(Math.max(endedAt, session.startedAt), session.startedAt + maxDurationMs);
}

export function toSavePayload(session: WorkoutSession, endedAt: number): SavePayload {
  return {
    id: session.id,
    routine_id: session.routineId,
    name: session.name.trim().slice(0, maxNameLength) || 'Workout',
    notes: session.notes.trim().slice(0, 1000) || null,
    started_at: new Date(session.startedAt).toISOString(),
    ended_at: new Date(endTime(session, endedAt)).toISOString(),
    exercises: finishedExercises(session).map((item) => ({
      exercise_id: item.exerciseId,
      notes: item.notes?.slice(0, 500) ?? null,
      sets: item.sets.map((set) => ({
        weight_kg: set.weightKg,
        reps: set.reps,
        duration_seconds: set.durationSeconds,
        distance_m: set.distanceM,
      })),
    })),
  };
}

export type WorkoutSummary = {
  workoutId: string;
  name: string;
  durationSeconds: number;
  // Weight × reps for the exercise types where that means something: weight
  // and reps, and the added weight of weighted bodyweight.
  volumeKg: number;
  setCount: number;
  records: (NewRecord & { exerciseName: string })[];
  units: Units;
};

export function workoutSummary(
  session: WorkoutSession,
  endedAt: number,
  // Each exercise's earlier sets, from the history saved on the phone.
  historyByExercise: ReadonlyMap<string, HistorySet[]>,
): WorkoutSummary {
  const exercises = finishedExercises(session);

  return {
    workoutId: session.id,
    name: toSavePayload(session, endedAt).name,
    durationSeconds: Math.round((endTime(session, endedAt) - session.startedAt) / 1000),
    volumeKg: volumeKg(exercises),
    setCount: exercises.reduce((sum, item) => sum + item.sets.length, 0),
    records: exercises.flatMap((item) =>
      newRecords(item.type, item.sets, historyByExercise.get(item.exerciseId) ?? []).map(
        (record) => ({ ...record, exerciseName: item.name }),
      ),
    ),
    units: { weightUnit: session.weightUnit, distanceUnit: session.distanceUnit },
  };
}
