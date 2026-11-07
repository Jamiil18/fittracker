import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { PastWorkout } from '@/features/history/schemas/historySchemas';

import { ProgressScreen } from './ProgressScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/auth/components/SessionProvider', () => ({
  useSession: () => ({ user: { id: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90' } }),
}));
jest.mock('@/features/settings/api/profile', () => ({
  useProfile: () => ({ data: { weightUnit: 'kg', distanceUnit: 'km' } }),
}));

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.getTime();
}

function workout(id: string, startedAt: number, weightKg: number): PastWorkout {
  return {
    id,
    routineId: null,
    name: 'Push A',
    notes: null,
    startedAt,
    endedAt: startedAt + 3600_000,
    exercises: [
      {
        id: `${id}-e`,
        position: 0,
        notes: null,
        exercise: {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Bench press',
          exerciseType: 'weight_reps',
          primaryMuscles: ['chest'],
        },
        sets: [
          {
            id: `${id}-s`,
            position: 0,
            weightKg,
            reps: 5,
            durationSeconds: null,
            distanceM: null,
          },
        ],
      },
    ],
  };
}

async function renderProgress(history: PastWorkout[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, staleTime: Infinity, retry: false } },
  });
  queryClient.setQueryData(['training-history', userId], history);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  await render(<ProgressScreen />, { wrapper });
}

describe('ProgressScreen', () => {
  it('shows the latest exercise, its change over the range, records and values', async () => {
    const user = userEvent.setup();
    await renderProgress([workout('b', daysAgo(1), 85), workout('a', daysAgo(8), 80)]);

    expect(screen.getAllByText('Bench press').length).toBeGreaterThan(0);
    expect(screen.getByText('Change over 3 months')).toBeOnTheScreen();
    expect(screen.getAllByText('Personal records')).toHaveLength(1);

    await user.press(screen.getByRole('button', { name: 'Show values' }));
    expect(screen.getAllByText('85 kg').length).toBeGreaterThan(0);

    await user.press(screen.getByRole('button', { name: 'See all' }));
    expect(mockPush).toHaveBeenCalledWith('/records');
  });

  it('shows times as m:ss for a timed exercise', async () => {
    const plank = (id: string, startedAt: number, seconds: number): PastWorkout => {
      const base = workout(id, startedAt, 0);
      const [entry] = base.exercises;
      if (!entry) throw new Error('expected an exercise');
      return {
        ...base,
        exercises: [
          {
            ...entry,
            exercise: {
              id: '00000000-0000-4000-8000-000000000002',
              name: 'Plank',
              exerciseType: 'duration',
              primaryMuscles: ['abdominals'],
            },
            sets: entry.sets.map((set) => ({
              ...set,
              weightKg: null,
              reps: null,
              durationSeconds: seconds,
            })),
          },
        ],
      };
    };
    await renderProgress([plank('b', daysAgo(1), 80), plank('a', daysAgo(8), 70)]);

    expect(screen.getByText(/^Latest, .*: 1:20$/)).toBeOnTheScreen();
    expect(screen.getByText('+0:10')).toBeOnTheScreen();
  });

  it('asks for a second workout before drawing a trend', async () => {
    await renderProgress([workout('a', daysAgo(1), 80)]);
    expect(
      screen.getByText('Log this exercise in two workouts in this range to see a trend.'),
    ).toBeOnTheScreen();
  });

  it('shows an empty state before any workout', async () => {
    await renderProgress([]);
    expect(screen.getByText('No progress to show yet')).toBeOnTheScreen();
  });
});
