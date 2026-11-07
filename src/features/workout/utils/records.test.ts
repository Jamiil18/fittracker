import { bestsFor, estimatedOneRepMax, formatRecordValue, newRecords } from './records';
import type { SavedSetValues } from './setValues';

function set(overrides: Partial<SavedSetValues>): SavedSetValues {
  return {
    weightKg: null,
    reps: null,
    durationSeconds: null,
    distanceM: null,
    ...overrides,
  };
}

const units = { weightUnit: 'kg', distanceUnit: 'km' } as const;

describe('estimatedOneRepMax', () => {
  it("uses Epley's formula, and a single rep as it is", () => {
    expect(estimatedOneRepMax(100, 10)).toBeCloseTo(133.33, 2);
    expect(estimatedOneRepMax(82.5, 8)).toBeCloseTo(104.5, 2);
    expect(estimatedOneRepMax(140, 1)).toBe(140);
  });
});

describe('bestsFor', () => {
  it('finds the records that apply to each type', () => {
    expect(
      bestsFor('weight_reps', [set({ weightKg: 80, reps: 8 }), set({ weightKg: 90, reps: 2 })]),
    ).toEqual({
      estimated_1rm: estimatedOneRepMax(80, 8),
      heaviest_weight: 90,
    });
    expect(bestsFor('bodyweight_reps', [set({ reps: 12 }), set({ reps: 15 })])).toEqual({
      most_reps: 15,
    });
    expect(
      bestsFor('assisted_bodyweight', [
        set({ weightKg: 30, reps: 8 }),
        set({ weightKg: 20, reps: 6 }),
      ]),
    ).toEqual({
      least_assistance: 20,
    });
    expect(
      bestsFor('duration', [set({ durationSeconds: 60 }), set({ durationSeconds: 75 })]),
    ).toEqual({
      longest_time: 75,
    });
    expect(
      bestsFor('distance_duration', [set({ distanceM: 5000, durationSeconds: 1500 })]),
    ).toEqual({
      longest_distance: 5000,
      best_pace: 300,
    });
  });
});

describe('newRecords', () => {
  it('reports only records that beat every earlier set', () => {
    const earlier = [set({ weightKg: 80, reps: 8 }), set({ weightKg: 85, reps: 3 })];
    expect(newRecords('weight_reps', [set({ weightKg: 82.5, reps: 8 })], earlier)).toEqual([
      { kind: 'estimated_1rm', value: estimatedOneRepMax(82.5, 8) },
    ]);
    expect(newRecords('weight_reps', [set({ weightKg: 80, reps: 8 })], earlier)).toEqual([]);
  });

  it('treats less assistance and a faster pace as better', () => {
    expect(
      newRecords(
        'assisted_bodyweight',
        [set({ weightKg: 15, reps: 8 })],
        [set({ weightKg: 20, reps: 8 })],
      ),
    ).toEqual([{ kind: 'least_assistance', value: 15 }]);
    expect(
      newRecords(
        'distance_duration',
        [set({ distanceM: 5000, durationSeconds: 1450 })],
        [set({ distanceM: 5000, durationSeconds: 1500 })],
      ),
    ).toEqual([{ kind: 'best_pace', value: 290 }]);
  });

  it('sets no records the first time an exercise is done', () => {
    expect(newRecords('weight_reps', [set({ weightKg: 100, reps: 5 })], [])).toEqual([]);
  });
});

describe('formatRecordValue', () => {
  it("shows records in the user's units", () => {
    expect(formatRecordValue('estimated_1rm', 104.5, units)).toBe('104.5 kg');
    expect(formatRecordValue('most_reps', 15, units)).toBe('15 reps');
    expect(formatRecordValue('longest_time', 75, units)).toBe('1:15');
    expect(formatRecordValue('best_pace', 300, units)).toBe('5:00 /km');
    expect(formatRecordValue('best_pace', 300, { weightUnit: 'lb', distanceUnit: 'mi' })).toBe(
      '8:03 /mi',
    );
  });
});
