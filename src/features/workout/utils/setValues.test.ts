import type { SessionExercise, SessionSet } from '../schemas/sessionSchema';
import {
  durationDigitsFromInput,
  durationDigitsToSeconds,
  exerciseHints,
  formatDurationDigits,
  previousText,
  resolveSet,
  secondsToDurationDigits,
  weightHeading,
  type SavedSetValues,
} from './setValues';

const kg = { weightUnit: 'kg', distanceUnit: 'km' } as const;
const lb = { weightUnit: 'lb', distanceUnit: 'mi' } as const;

function set(overrides: Partial<SessionSet> = {}): SessionSet {
  return {
    key: 's',
    weight: '',
    reps: '',
    duration: '',
    distance: '',
    done: false,
    ...overrides,
  };
}

function saved(overrides: Partial<SavedSetValues>): SavedSetValues {
  return {
    weightKg: null,
    reps: null,
    durationSeconds: null,
    distanceM: null,
    ...overrides,
  };
}

const noHints = { weight: '', reps: '', duration: '', distance: '' };

describe('times typed like a microwave timer', () => {
  it('reads digits from the right', () => {
    expect(durationDigitsToSeconds('45')).toBe(45);
    expect(durationDigitsToSeconds('130')).toBe(90);
    expect(durationDigitsToSeconds('90')).toBe(90);
    expect(durationDigitsToSeconds('13000')).toBe(5400);
    expect(durationDigitsToSeconds('')).toBeNull();
  });

  it('shows the digits as a time while typing', () => {
    expect(formatDurationDigits('5')).toBe('0:05');
    expect(formatDurationDigits('130')).toBe('1:30');
    expect(formatDurationDigits('13000')).toBe('1:30:00');
  });

  it('turns seconds back into digits, and cleans typed input', () => {
    expect(secondsToDurationDigits(90)).toBe('130');
    expect(secondsToDurationDigits(45)).toBe('45');
    expect(durationDigitsFromInput('1:305')).toBe('1305');
    expect(durationDigitsFromInput('0:05')).toBe('5');
  });
});

describe('previousText and weightHeading', () => {
  it('shows the last workout in the units of this one', () => {
    expect(previousText('weight_reps', saved({ weightKg: 82.5, reps: 8 }), kg)).toBe('82.5 × 8');
    expect(previousText('weight_reps', saved({ weightKg: 61.235, reps: 5 }), lb)).toBe('135 × 5');
    expect(previousText('weighted_bodyweight', saved({ weightKg: 10, reps: 8 }), kg)).toBe(
      '+10 × 8',
    );
    expect(previousText('assisted_bodyweight', saved({ weightKg: 20, reps: 8 }), kg)).toBe(
      '−20 × 8',
    );
    expect(previousText('bodyweight_reps', saved({ reps: 12 }), kg)).toBe('12');
    expect(previousText('duration', saved({ durationSeconds: 45 }), kg)).toBe('0:45');
    expect(
      previousText('distance_duration', saved({ distanceM: 1500, durationSeconds: 360 }), kg),
    ).toBe('1.5 km 6:00');
  });

  it('marks added weight and assistance in the column heading', () => {
    expect(weightHeading('weight_reps', 'kg')).toBe('kg');
    expect(weightHeading('weighted_bodyweight', 'lb')).toBe('+lb');
    expect(weightHeading('assisted_bodyweight', 'kg')).toBe('−kg');
  });
});

describe('exerciseHints', () => {
  const bench: SessionExercise = {
    key: 'e',
    exercise: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Bench',
      exerciseType: 'weight_reps',
    },
    notes: null,
    restSeconds: 120,
    targets: { weightKg: 60, repsMin: 8, durationSeconds: null },
    sets: [
      set({ key: 'a' }),
      set({ key: 'b' }),
      set({ key: 'c', weight: '70' }),
      set({ key: 'd' }),
    ],
  };

  it('uses the last workout first, then the routine target, then the set above', () => {
    const previous = [saved({ weightKg: 80, reps: 6 })];
    const hints = exerciseHints(
      { ...bench, targets: { ...bench.targets, weightKg: null } },
      previous,
      kg,
    );

    expect(hints[0]).toMatchObject({ weight: '80', reps: '6' });
    // No previous set and no target weight: the set above carries down.
    expect(hints[1]).toMatchObject({ weight: '80', reps: '8' });
    // The typed weight of the third set becomes the hint for the fourth.
    expect(hints[3]).toMatchObject({ weight: '70' });
  });

  it("falls back to the routine's target weight when there is no previous workout", () => {
    expect(exerciseHints(bench, [], kg)[0]).toMatchObject({ weight: '60', reps: '8' });
  });
});

describe('resolveSet', () => {
  it('uses the hints for empty fields and converts to stored units', () => {
    const result = resolveSet('weight_reps', set({ reps: '5' }), { ...noHints, weight: '135' }, lb);

    expect(result).toEqual({
      ok: true,
      values: { weight: '135', reps: '5', duration: '', distance: '' },
      saved: { weightKg: 61.235, reps: 5, durationSeconds: null, distanceM: null },
    });
  });

  it('says which values are missing', () => {
    expect(resolveSet('weight_reps', set(), noHints, kg)).toEqual({
      ok: false,
      message: 'Enter the weight and reps.',
    });
    expect(resolveSet('distance_duration', set(), noHints, kg)).toEqual({
      ok: false,
      message: 'Enter the distance and time.',
    });
  });

  it('checks the same limits as the database', () => {
    expect(resolveSet('bodyweight_reps', set({ reps: '0' }), noHints, kg)).toMatchObject({
      ok: false,
      message: 'Reps must be from 1 to 1000.',
    });
    expect(
      resolveSet('weight_reps', set({ weight: '1001', reps: '1' }), noHints, kg),
    ).toMatchObject({
      ok: false,
    });
  });

  it('reads times and distances', () => {
    const result = resolveSet(
      'distance_duration',
      set({ distance: '1,5', duration: '600' }),
      noHints,
      kg,
    );
    expect(result).toMatchObject({ ok: true, saved: { distanceM: 1500, durationSeconds: 360 } });
  });
});
