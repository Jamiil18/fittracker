import type { WeightUnit } from '@/lib/units';

import { createRoutineFormSchema, type RoutineExerciseFormInput } from './routineSchemas';

const benchId = '00000000-0000-4000-8000-000000000001';
const plankId = '00000000-0000-4000-8000-000000000002';

function bench(overrides: Partial<RoutineExerciseFormInput> = {}): RoutineExerciseFormInput {
  return {
    exerciseId: benchId,
    exerciseName: 'Bench press',
    exerciseType: 'weight_reps',
    sets: '3',
    repsMin: '8',
    repsMax: '12',
    durationMinutes: '',
    durationSeconds: '',
    weight: '',
    restSeconds: null,
    ...overrides,
  };
}

function plank(overrides: Partial<RoutineExerciseFormInput> = {}): RoutineExerciseFormInput {
  return bench({
    exerciseId: plankId,
    exerciseName: 'Plank',
    exerciseType: 'duration',
    repsMin: '',
    repsMax: '',
    durationMinutes: '1',
    durationSeconds: '30',
    ...overrides,
  });
}

function parse(
  exercises: RoutineExerciseFormInput[],
  name = ' Push A ',
  weightUnit: WeightUnit = 'kg',
) {
  return createRoutineFormSchema(weightUnit).safeParse({ name, notes: '', exercises });
}

function messages(result: ReturnType<typeof parse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('routineFormSchema', () => {
  it('turns typed text into targets, trimming the name and dropping empty notes', () => {
    const result = parse([bench({ restSeconds: 150 }), plank()]);

    expect(result.success && result.data).toEqual({
      name: 'Push A',
      notes: null,
      exercises: [
        {
          exerciseId: benchId,
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 12,
          targetDurationSeconds: null,
          targetWeightKg: null,
          restSeconds: 150,
        },
        {
          exerciseId: plankId,
          targetSets: 3,
          targetRepsMin: null,
          targetRepsMax: null,
          targetDurationSeconds: 90,
          targetWeightKg: null,
          restSeconds: null,
        },
      ],
    });
  });

  it('leaves optional targets empty and saves a range of one number as a fixed target', () => {
    const result = parse([bench({ repsMin: '', repsMax: '' }), bench({ repsMax: '8' })]);

    expect(result.success && result.data.exercises.map((item) => item.targetRepsMin)).toEqual([
      null,
      8,
    ]);
    expect(result.success && result.data.exercises[1]?.targetRepsMax).toBeNull();
  });

  it('only saves the targets that fit the exercise type', () => {
    const result = parse([
      bench({ durationMinutes: '2' }),
      plank({ repsMin: '10', durationMinutes: '', durationSeconds: '' }),
    ]);

    expect(result.success && result.data.exercises[0]?.targetDurationSeconds).toBeNull();
    expect(result.success && result.data.exercises[1]).toMatchObject({
      targetRepsMin: null,
      targetDurationSeconds: null,
    });
  });

  it('requires a name and at least one exercise', () => {
    expect(messages(parse([], '   '))).toEqual(['Enter a name.', 'Add at least one exercise.']);
  });

  it('rejects sets and reps outside the database limits', () => {
    expect(messages(parse([bench({ sets: '' })]))).toEqual(['Enter the number of sets.']);
    expect(messages(parse([bench({ sets: '21' })]))).toEqual(['Sets must be from 1 to 20.']);
    expect(messages(parse([bench({ sets: '2.5' })]))).toEqual(['Sets must be from 1 to 20.']);
    expect(messages(parse([bench({ repsMin: '0' })]))).toEqual(['Reps must be from 1 to 100.']);
  });

  it('checks that the reps range makes sense', () => {
    expect(messages(parse([bench({ repsMin: '12', repsMax: '8' })]))).toEqual([
      'Maximum reps must be at least the minimum.',
    ]);
    expect(messages(parse([bench({ repsMin: '', repsMax: '8' })]))).toEqual([
      'Enter the minimum reps too, or clear the maximum.',
    ]);
  });

  it('keeps target times between one second and an hour', () => {
    expect(messages(parse([plank({ durationMinutes: '0', durationSeconds: '0' })]))).toEqual([
      'Time must be from 0:01 to 60:00.',
    ]);
    expect(messages(parse([plank({ durationMinutes: '60', durationSeconds: '1' })]))).toEqual([
      'Time must be from 0:01 to 60:00.',
    ]);
    expect(messages(parse([plank({ durationSeconds: '75' })]))).toEqual([
      'Seconds must be from 0 to 59.',
    ]);
  });

  it('saves a target weight in kilograms, typed in either unit', () => {
    const inKilograms = parse([bench({ weight: '62,5' })]);
    const inPounds = parse([bench({ weight: '135' })], 'Push A', 'lb');

    expect(inKilograms.success && inKilograms.data.exercises[0]?.targetWeightKg).toBe(62.5);
    expect(inPounds.success && inPounds.data.exercises[0]?.targetWeightKg).toBe(61.235);
  });

  it('keeps a weight only for the weighted types', () => {
    const result = parse([
      bench({ exerciseType: 'assisted_bodyweight', weight: '20' }),
      bench({ exerciseType: 'bodyweight_reps', weight: '20' }),
    ]);

    expect(result.success && result.data.exercises.map((item) => item.targetWeightKg)).toEqual([
      20,
      null,
    ]);
  });

  it('rejects a weight of zero, too heavy, or not a number', () => {
    expect(messages(parse([bench({ weight: '0' })]))).toEqual([
      'Weight must be above 0 and at most 1000 kg.',
    ]);
    expect(messages(parse([bench({ weight: '2201' })], 'Push A', 'lb'))).toEqual([
      'Weight must be above 0 and at most 2200 lb.',
    ]);
    expect(messages(parse([bench({ exerciseType: 'assisted_bodyweight', weight: 'a' })]))).toEqual([
      'Assistance must be above 0 and at most 1000 kg.',
    ]);
  });

  it('limits a routine to 30 exercises', () => {
    expect(messages(parse(Array.from({ length: 31 }, () => bench())))).toEqual([
      'A routine can have up to 30 exercises.',
    ]);
  });
});
