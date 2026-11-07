import type { ExerciseSummary, ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';
import type { SavePayload } from '@/features/workout/schemas/savePayloadSchema';
import {
  hasDistance,
  hasDuration,
  hasWeight,
  type SavedSetValues,
  type Units,
} from '@/features/workout/utils/setValues';
import { volumeKg } from '@/features/workout/utils/volume';
import { formatDuration } from '@/lib/durations';
import { formatDistance, formatWeight } from '@/lib/units';

import type { PastWorkout } from '../schemas/historySchemas';

export function workoutTotals(workout: PastWorkout) {
  return {
    setCount: workout.exercises.reduce((sum, item) => sum + item.sets.length, 0),
    volumeKg: volumeKg(
      workout.exercises.map((item) => ({ type: item.exercise.exerciseType, sets: item.sets })),
    ),
    durationSeconds: Math.round((workout.endedAt - workout.startedAt) / 1000),
  };
}

// The second line of a workout in History: "18 sets, 7,420 kg", or just the
// sets when no exercise has volume.
export function totalsText(workout: PastWorkout, units: Units): string {
  const { setCount, volumeKg: volume } = workoutTotals(workout);
  const sets = `${setCount} ${setCount === 1 ? 'set' : 'sets'}`;
  return volume > 0 ? `${sets}, ${formatWeight(Math.round(volume), units.weightUnit)}` : sets;
}

// One logged set as text: "60 kg × 10", "+10 kg × 8", "−20 kg × 8", "12 reps",
// "0:45", or "1.5 km in 6:00".
export function setText(type: ExerciseType, set: SavedSetValues, units: Units): string {
  const time = set.durationSeconds === null ? '' : formatDuration(set.durationSeconds);
  if (hasDistance(type)) {
    const distance =
      set.distanceM === null ? '' : formatDistance(set.distanceM, units.distanceUnit);
    return `${distance} in ${time}`;
  }
  if (hasDuration(type)) return time;
  if (!hasWeight(type)) return `${set.reps ?? 0} reps`;
  const sign = type === 'weighted_bodyweight' ? '+' : type === 'assisted_bodyweight' ? '−' : '';
  return `${sign}${formatWeight(set.weightKg ?? 0, units.weightUnit)} × ${set.reps ?? 0}`;
}

// A finished workout still waiting in the outbox, in the same shape as a saved
// one so History can show it. The payload only has exercise ids, so names and
// types come from the exercise library saved on the phone.
export function pendingWorkout(
  payload: SavePayload,
  exercises: ReadonlyMap<string, ExerciseSummary>,
): PastWorkout {
  return {
    id: payload.id,
    routineId: payload.routine_id,
    name: payload.name,
    notes: payload.notes,
    startedAt: Date.parse(payload.started_at),
    endedAt: Date.parse(payload.ended_at),
    exercises: payload.exercises.map((item, index) => {
      const known = exercises.get(item.exercise_id);
      return {
        id: `${payload.id}-${index}`,
        position: index,
        notes: item.notes,
        exercise: {
          id: item.exercise_id,
          name: known?.name ?? 'Exercise',
          exerciseType: known?.exerciseType ?? 'weight_reps',
          primaryMuscles: known?.primaryMuscles ?? [],
        },
        sets: item.sets.map((set, setIndex) => ({
          id: `${payload.id}-${index}-${setIndex}`,
          position: setIndex,
          weightKg: set.weight_kg,
          reps: set.reps,
          durationSeconds: set.duration_seconds,
          distanceM: set.distance_m,
        })),
      };
    }),
  };
}
