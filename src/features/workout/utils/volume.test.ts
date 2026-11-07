import type { SavedSetValues } from './setValues';
import { countsTowardsVolume, volumeKg } from './volume';

function set(weightKg: number | null, reps: number | null): SavedSetValues {
  return { weightKg, reps, durationSeconds: null, distanceM: null };
}

describe('volume', () => {
  it('counts only types where the weight is what was lifted', () => {
    expect(countsTowardsVolume('weight_reps')).toBe(true);
    expect(countsTowardsVolume('weighted_bodyweight')).toBe(true);
    expect(countsTowardsVolume('bodyweight_reps')).toBe(false);
    expect(countsTowardsVolume('assisted_bodyweight')).toBe(false);
    expect(countsTowardsVolume('duration')).toBe(false);
    expect(countsTowardsVolume('distance_duration')).toBe(false);
  });

  it('adds weight times reps across exercises', () => {
    expect(
      volumeKg([
        { type: 'weight_reps', sets: [set(40, 10), set(82.5, 8)] },
        { type: 'weighted_bodyweight', sets: [set(10, 6)] },
        { type: 'assisted_bodyweight', sets: [set(20, 8)] },
      ]),
    ).toBe(400 + 660 + 60);
  });

  it('treats a missing weight or reps as nothing lifted', () => {
    expect(volumeKg([{ type: 'weight_reps', sets: [set(null, 10), set(60, null)] }])).toBe(0);
  });
});
