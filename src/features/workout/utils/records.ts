import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';
import { formatDuration } from '@/lib/durations';
import { formatDistance, formatWeight, fromMetres, roundTo } from '@/lib/units';

import type { SavedSetValues, Units } from './setValues';

// Epley's formula for the weight that could be lifted once, from a set of
// several reps. A single rep is already a one-rep max.
export function estimatedOneRepMax(weightKg: number, reps: number): number {
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

export type RecordKind =
  | 'estimated_1rm'
  | 'heaviest_weight'
  | 'most_reps'
  | 'least_assistance'
  | 'longest_time'
  | 'longest_distance'
  | 'best_pace';

type Bests = Partial<Record<RecordKind, number>>;

// For these a smaller number is better.
const lowerIsBetter: ReadonlySet<RecordKind> = new Set(['least_assistance', 'best_pace']);

function keepBest(bests: Bests, kind: RecordKind, value: number | null) {
  if (value === null || !Number.isFinite(value)) return;
  const current = bests[kind];
  const better = lowerIsBetter.has(kind)
    ? value < (current ?? Infinity)
    : value > (current ?? -Infinity);
  if (better) bests[kind] = value;
}

// The best of each record that applies to the exercise type.
export function bestsFor(type: ExerciseType, sets: SavedSetValues[]): Bests {
  const bests: Bests = {};
  for (const set of sets) {
    const { weightKg, reps, durationSeconds, distanceM } = set;
    if (type === 'weight_reps' || type === 'weighted_bodyweight') {
      if (weightKg !== null && weightKg > 0 && reps !== null) {
        keepBest(bests, 'estimated_1rm', estimatedOneRepMax(weightKg, reps));
        keepBest(bests, 'heaviest_weight', weightKg);
      }
    } else if (type === 'bodyweight_reps') {
      keepBest(bests, 'most_reps', reps);
    } else if (type === 'assisted_bodyweight') {
      keepBest(bests, 'least_assistance', weightKg);
    } else if (type === 'duration') {
      keepBest(bests, 'longest_time', durationSeconds);
    } else if (distanceM !== null && distanceM > 0) {
      keepBest(bests, 'longest_distance', distanceM);
      // Seconds per kilometre; converted to the user's unit only for display.
      if (durationSeconds !== null)
        keepBest(bests, 'best_pace', (durationSeconds / distanceM) * 1000);
    }
  }
  return bests;
}

export type NewRecord = { kind: RecordKind; value: number };

// Records set in this workout. With no earlier sets of the exercise there is
// nothing to beat, so a first workout with an exercise sets no records.
export function newRecords(
  type: ExerciseType,
  workoutSets: SavedSetValues[],
  earlierSets: SavedSetValues[],
): NewRecord[] {
  if (earlierSets.length === 0) return [];
  const before = bestsFor(type, earlierSets);
  const now = bestsFor(type, workoutSets);
  const records: NewRecord[] = [];
  for (const [kind, value] of Object.entries(now) as [RecordKind, number][]) {
    const previous = before[kind];
    const beaten =
      previous === undefined || (lowerIsBetter.has(kind) ? value < previous : value > previous);
    if (beaten) records.push({ kind, value });
  }
  return records;
}

export const recordLabels: Record<RecordKind, string> = {
  estimated_1rm: 'Estimated 1RM',
  heaviest_weight: 'Heaviest weight',
  most_reps: 'Most reps',
  least_assistance: 'Least assistance',
  longest_time: 'Longest time',
  longest_distance: 'Longest distance',
  best_pace: 'Best pace',
};

export function formatRecordValue(kind: RecordKind, value: number, units: Units): string {
  switch (kind) {
    case 'estimated_1rm':
    case 'heaviest_weight':
    case 'least_assistance':
      return formatWeight(value, units.weightUnit);
    case 'most_reps':
      return `${value} reps`;
    case 'longest_time':
      return formatDuration(value);
    case 'longest_distance':
      return formatDistance(value, units.distanceUnit);
    case 'best_pace': {
      const secondsPerUnit = value / 1000 / fromMetres(1, units.distanceUnit);
      return `${formatDuration(roundTo(secondsPerUnit, 0))} /${units.distanceUnit}`;
    }
  }
}
