import { supabase } from '@/lib/supabase';

import { fetchExerciseLibrary } from './exercises';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/features/auth/components/SessionProvider', () => ({ useSession: jest.fn() }));

const fromMock = supabase.from as jest.Mock;

function row(index: number) {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    name: `Exercise ${index}`,
    exercise_type: 'weight_reps',
    primary_muscles: ['chest'],
    secondary_muscles: [],
    equipment: 'barbell',
  };
}

describe('fetchExerciseLibrary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps requesting pages until a short page arrives', async () => {
    const pages = [Array.from({ length: 1000 }, (_, i) => row(i)), [row(1000)]];
    const range = jest.fn(async () => ({ data: pages.shift(), error: null }));
    fromMock.mockReturnValue({
      select: () => ({ order: () => ({ range }) }),
    });

    const library = await fetchExerciseLibrary();

    expect(range).toHaveBeenCalledTimes(2);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(library).toHaveLength(1001);
    expect(library[1000]).toMatchObject({ name: 'Exercise 1000', exerciseType: 'weight_reps' });
  });
});
