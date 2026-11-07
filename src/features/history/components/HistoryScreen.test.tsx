import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useOutbox } from '@/lib/outbox/outboxStore';

import type { PastWorkout } from '../schemas/historySchemas';
import { HistoryScreen } from './HistoryScreen';

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
const benchId = '00000000-0000-4000-8000-000000000001';

function today(hour: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour).getTime();
}

const saved: PastWorkout = {
  id: '30000000-0000-4000-8000-000000000001',
  routineId: null,
  name: 'Push A',
  notes: null,
  startedAt: today(7),
  endedAt: today(8),
  exercises: [
    {
      id: 'e1',
      position: 0,
      notes: null,
      exercise: {
        id: benchId,
        name: 'Bench press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['chest'],
      },
      sets: [
        {
          id: 's1',
          position: 0,
          weightKg: 80,
          reps: 8,
          durationSeconds: null,
          distanceM: null,
        },
      ],
    },
  ],
};

async function renderHistory(workouts: PastWorkout[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, staleTime: Infinity, retry: false } },
  });
  queryClient.setQueryData(['training-history', userId], workouts);
  queryClient.setQueryData(['cardio-sessions', userId], []);
  queryClient.setQueryData(['exercises', userId], []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  await render(<HistoryScreen />, { wrapper });
}

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOutbox.setState({ items: [] });
  });

  it('lists workouts under their day with sets, volume and duration, and opens one', async () => {
    const user = userEvent.setup();
    await renderHistory([saved]);

    expect(screen.getByText('1 set, 640 kg')).toBeOnTheScreen();
    expect(screen.getByText('1 h')).toBeOnTheScreen();

    await user.press(screen.getByText('Push A'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/workouts/[id]', params: { id: saved.id } });
  });

  it('marks a workout waiting in the outbox as not synced yet', async () => {
    const user = userEvent.setup();
    useOutbox.getState().add({
      id: '30000000-0000-4000-8000-000000000002',
      kind: 'workout',
      userId,
      payload: {
        id: '30000000-0000-4000-8000-000000000002',
        routine_id: null,
        name: 'Pull A',
        notes: null,
        started_at: new Date(today(18)).toISOString(),
        ended_at: new Date(today(19)).toISOString(),
        exercises: [
          {
            exercise_id: benchId,
            notes: null,
            sets: [
              {
                weight_kg: 80,
                reps: 8,
                duration_seconds: null,
                distance_m: null,
              },
            ],
          },
        ],
      },
    });
    await renderHistory([saved]);

    expect(screen.getByText('Not synced yet')).toBeOnTheScreen();
    await user.press(screen.getByText('Pull A'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/workouts/pending/[id]',
      params: { id: '30000000-0000-4000-8000-000000000002' },
    });
  });

  it('shows an empty state with no workouts', async () => {
    await renderHistory([]);
    expect(screen.getByText('No workouts yet')).toBeOnTheScreen();
  });
});
