import { supabase } from '@/lib/supabase';

import { deleteRoutine, fetchRoutines, saveRoutine } from './routines';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/features/auth/components/SessionProvider', () => ({ useSession: jest.fn() }));

const fromMock = supabase.from as jest.Mock;
const rpcMock = supabase.rpc as jest.Mock;

const routineId = '10000000-0000-4000-8000-000000000001';

function routineExerciseRow(position: number, name: string) {
  return {
    id: `20000000-0000-4000-8000-00000000000${position}`,
    position,
    target_sets: 3,
    target_reps_min: 8,
    target_reps_max: null,
    target_duration_seconds: null,
    target_weight_kg: position === 0 ? 62.5 : null,
    rest_seconds: null,
    exercise: {
      id: `00000000-0000-4000-8000-00000000000${position}`,
      owner_id: null,
      name,
      exercise_type: 'weight_reps',
      primary_muscles: ['chest'],
      secondary_muscles: [],
      equipment: 'barbell',
    },
  };
}

describe('fetchRoutines', () => {
  beforeEach(() => jest.clearAllMocks());

  it('parses each routine and puts its exercises in their saved order', async () => {
    const row = {
      id: routineId,
      name: 'Push A',
      notes: null,
      position: 0,
      routine_exercises: [routineExerciseRow(1, 'Dips'), routineExerciseRow(0, 'Bench press')],
    };
    fromMock.mockReturnValue({
      select: () => ({ order: () => ({ order: async () => ({ data: [row], error: null }) }) }),
    });

    const [routine] = await fetchRoutines();

    expect(routine?.name).toBe('Push A');
    expect(routine?.exercises.map((item) => item.exercise.name)).toEqual(['Bench press', 'Dips']);
    expect(routine?.exercises[0]).toMatchObject({
      targetSets: 3,
      targetWeightKg: 62.5,
      restSeconds: null,
    });
  });
});

describe('saveRoutine', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends the routine and its exercises to save_routine in one call', async () => {
    rpcMock.mockResolvedValue({ data: routineId, error: null });

    const savedId = await saveRoutine(null, {
      name: 'Push A',
      notes: null,
      exercises: [
        {
          exerciseId: '00000000-0000-4000-8000-000000000001',
          targetSets: 3,
          targetRepsMin: 8,
          targetRepsMax: 12,
          targetDurationSeconds: null,
          targetWeightKg: 60,
          restSeconds: 150,
        },
      ],
    });

    expect(savedId).toBe(routineId);
    expect(rpcMock).toHaveBeenCalledWith('save_routine', {
      routine_id: null,
      routine_name: 'Push A',
      routine_notes: null,
      exercises: [
        {
          exercise_id: '00000000-0000-4000-8000-000000000001',
          target_sets: 3,
          target_reps_min: 8,
          target_reps_max: 12,
          target_duration_seconds: null,
          target_weight_kg: 60,
          rest_seconds: 150,
        },
      ],
    });
  });

  it('reports a routine that has gone as not found', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'not found' } });

    await expect(
      saveRoutine(routineId, { name: 'Push A', notes: null, exercises: [] }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('deleteRoutine', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports a failed request as offline', async () => {
    fromMock.mockReturnValue({
      delete: () => ({
        eq: async () => ({ error: { message: 'TypeError: Network request failed' } }),
      }),
    });

    await expect(deleteRoutine(routineId)).rejects.toMatchObject({ code: 'offline' });
  });
});
