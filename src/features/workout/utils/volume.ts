import type { ExerciseType } from '@/features/exercises/schemas/exerciseSchemas';

import type { SavedSetValues } from './setValues';

// Volume (weight × reps) only means something where the weight is what was
// lifted: weight and reps, and the added weight of weighted bodyweight.
// Bodyweight, assisted and timed sets aren't counted.
export function countsTowardsVolume(type: ExerciseType): boolean {
  return type === 'weight_reps' || type === 'weighted_bodyweight';
}

// Total volume in kilograms.
export function volumeKg(exercises: { type: ExerciseType; sets: SavedSetValues[] }[]): number {
  return exercises
    .filter((item) => countsTowardsVolume(item.type))
    .flatMap((item) => item.sets)
    .reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
}
