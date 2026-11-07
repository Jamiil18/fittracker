import type { ExerciseSummary } from '@/features/exercises/schemas/exerciseSchemas';

import type { Routine } from '../schemas/routineSchemas';
import { newRoutineExercise, routineToFormInput } from './routineForm';

function exercise(overrides: Partial<ExerciseSummary>): ExerciseSummary {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Bench press',
    exerciseType: 'weight_reps',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: 'barbell',
    ...overrides,
  };
}

const routine: Routine = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Push A',
  notes: 'Pause the first rep',
  exercises: [
    {
      id: '20000000-0000-4000-8000-000000000001',
      position: 0,
      exercise: exercise({}),
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetDurationSeconds: null,
      targetWeightKg: 61.235,
      restSeconds: 150,
    },
    {
      id: '20000000-0000-4000-8000-000000000002',
      position: 1,
      exercise: exercise({ id: '00000000-0000-4000-8000-000000000002', exerciseType: 'duration' }),
      targetSets: 2,
      targetRepsMin: null,
      targetRepsMax: null,
      targetDurationSeconds: 75,
      targetWeightKg: null,
      restSeconds: null,
    },
  ],
};

describe('newRoutineExercise', () => {
  it('starts with three sets, or one set for distance work, and the default rest', () => {
    expect(newRoutineExercise(exercise({}))).toMatchObject({ sets: '3', restSeconds: null });
    expect(newRoutineExercise(exercise({ exerciseType: 'distance_duration' })).sets).toBe('1');
  });
});

describe('routineToFormInput', () => {
  it('fills the form, splitting times into minutes and seconds', () => {
    const input = routineToFormInput(routine, 'kg');

    expect(input.name).toBe('Push A');
    expect(input.exercises[0]).toMatchObject({ sets: '3', repsMin: '8', repsMax: '12' });
    expect(input.exercises[1]).toMatchObject({ durationMinutes: '1', durationSeconds: '15' });
  });

  it("shows the target weight in the user's unit", () => {
    expect(routineToFormInput(routine, 'kg').exercises[0]?.weight).toBe('61.24');
    expect(routineToFormInput(routine, 'lb').exercises[0]?.weight).toBe('135');
  });
});
