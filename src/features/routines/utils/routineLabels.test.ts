import { exerciseNamesSummary, restChoiceLabel, restSummary, targetSummary } from './routineLabels';

const noTargets = {
  targetSets: 3,
  targetRepsMin: null,
  targetRepsMax: null,
  targetDurationSeconds: null,
  targetWeightKg: null,
};

describe('targetSummary', () => {
  it('shows sets and a reps range or a fixed number of reps', () => {
    expect(
      targetSummary('weight_reps', { ...noTargets, targetRepsMin: 8, targetRepsMax: 12 }, 'kg'),
    ).toBe('3 sets × 8–12 reps');
    expect(
      targetSummary('bodyweight_reps', { ...noTargets, targetSets: 4, targetRepsMin: 5 }, 'kg'),
    ).toBe('4 sets × 5 reps');
    expect(
      targetSummary('weight_reps', { ...noTargets, targetSets: 1, targetRepsMin: 1 }, 'kg'),
    ).toBe('1 set × 1 rep');
  });

  it('shows the target time for timed exercises', () => {
    expect(targetSummary('duration', { ...noTargets, targetDurationSeconds: 45 }, 'kg')).toBe(
      '3 sets × 0:45',
    );
  });

  it('shows only the sets when nothing else is set, or the targets no longer fit the type', () => {
    expect(targetSummary('weight_reps', noTargets, 'kg')).toBe('3 sets');
    expect(targetSummary('duration', { ...noTargets, targetRepsMin: 10 }, 'kg')).toBe('3 sets');
  });
});

describe('targetSummary with a weight', () => {
  const heavy = { ...noTargets, targetRepsMin: 8, targetRepsMax: 12, targetWeightKg: 60 };

  it("adds the weight in the user's unit", () => {
    expect(targetSummary('weight_reps', heavy, 'kg')).toBe('3 sets × 8–12 reps @ 60 kg');
    expect(targetSummary('weight_reps', { ...heavy, targetWeightKg: 61.235 }, 'lb')).toBe(
      '3 sets × 8–12 reps @ 135 lb',
    );
  });

  it('marks added weight and assistance', () => {
    expect(targetSummary('weighted_bodyweight', { ...heavy, targetWeightKg: 10 }, 'kg')).toBe(
      '3 sets × 8–12 reps @ +10 kg',
    );
    expect(targetSummary('assisted_bodyweight', { ...heavy, targetWeightKg: 20 }, 'kg')).toBe(
      '3 sets × 8–12 reps @ 20 kg assistance',
    );
  });

  it('ignores a weight on a type without weights', () => {
    expect(targetSummary('bodyweight_reps', heavy, 'kg')).toBe('3 sets × 8–12 reps');
  });
});

describe('rest labels', () => {
  it('falls back to the default rest time and names a rest of zero', () => {
    expect(restSummary(null, 120)).toBe('rest 2:00');
    expect(restSummary(150, 120)).toBe('rest 2:30');
    expect(restSummary(0, 120)).toBe('no rest timer');
  });

  it('labels the choices in the rest picker', () => {
    expect(restChoiceLabel(null, 90)).toBe('Default (1:30)');
    expect(restChoiceLabel(0, 90)).toBe('No rest timer');
    expect(restChoiceLabel(240, 90)).toBe('4:00');
  });
});

describe('exerciseNamesSummary', () => {
  it('lists the first two exercises and counts the rest', () => {
    expect(exerciseNamesSummary(['Bench press'])).toBe('Bench press');
    expect(exerciseNamesSummary(['Bench press', 'Dips', 'Flyes', 'Pushdown'])).toBe(
      'Bench press, Dips, +2 more',
    );
  });
});
