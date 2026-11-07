import { supabase } from '@/lib/supabase';

import { fetchTrainingHistory } from './history';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/features/auth/components/SessionProvider', () => ({ useSession: jest.fn() }));

const fromMock = supabase.from as jest.Mock;
const workoutId = '30000000-0000-4000-8000-000000000001';

describe('fetchTrainingHistory', () => {
  it('parses workouts and puts exercises and sets in their saved order', async () => {
    const row = {
      id: workoutId,
      routine_id: null,
      name: 'Push A',
      notes: null,
      started_at: '2026-10-09T17:00:00+00:00',
      ended_at: '2026-10-09T18:00:00+00:00',
      workout_exercises: [
        {
          id: '40000000-0000-4000-8000-000000000002',
          position: 1,
          notes: null,
          exercise: {
            id: '00000000-0000-4000-8000-000000000002',
            name: 'Plank',
            exercise_type: 'duration',
            primary_muscles: ['abdominals'],
          },
          sets: [],
        },
        {
          id: '40000000-0000-4000-8000-000000000001',
          position: 0,
          notes: null,
          exercise: {
            id: '00000000-0000-4000-8000-000000000001',
            name: 'Bench press',
            exercise_type: 'weight_reps',
            primary_muscles: ['chest'],
          },
          sets: [
            {
              id: '50000000-0000-4000-8000-000000000002',
              position: 1,
              weight_kg: 82.5,
              reps: 8,
              duration_seconds: null,
              distance_m: null,
            },
            {
              id: '50000000-0000-4000-8000-000000000001',
              position: 0,
              weight_kg: 40,
              reps: 10,
              duration_seconds: null,
              distance_m: null,
            },
          ],
        },
      ],
    };
    fromMock.mockReturnValue({
      select: () => ({ order: () => ({ range: async () => ({ data: [row], error: null }) }) }),
    });

    const [workout] = await fetchTrainingHistory();

    expect(workout?.startedAt).toBe(Date.UTC(2026, 9, 9, 17));
    expect(workout?.exercises.map((item) => item.exercise.name)).toEqual(['Bench press', 'Plank']);
    expect(workout?.exercises[0]?.sets.map((set) => set.weightKg)).toEqual([40, 82.5]);
  });
});
