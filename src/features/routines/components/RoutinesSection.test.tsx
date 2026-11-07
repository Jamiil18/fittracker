import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useIsOffline } from '@/lib/useIsOffline';
import { supabase } from '@/lib/supabase';

import type { Routine } from '../schemas/routineSchemas';
import { RoutinesSection } from './RoutinesSection';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/auth/components/SessionProvider', () => ({
  useSession: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('@/lib/useIsOffline', () => ({ useIsOffline: jest.fn(() => false) }));

const isOfflineMock = useIsOffline as jest.Mock;

function routine(name: string, exerciseNames: string[]): Routine {
  return {
    id: `routine-${name}`,
    name,
    notes: null,
    exercises: exerciseNames.map((exerciseName, position) => ({
      id: `${name}-${position}`,
      position,
      exercise: {
        id: `exercise-${exerciseName}`,
        name: exerciseName,
        exerciseType: 'weight_reps',
        primaryMuscles: ['chest'],
        secondaryMuscles: [],
        equipment: 'barbell',
      },
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: null,
      targetDurationSeconds: null,
      targetWeightKg: null,
      restSeconds: null,
    })),
  };
}

async function renderSection(routines: Routine[]) {
  const queryClient = new QueryClient({
    // Infinite gcTime schedules no clean-up timers, which would keep Jest
    // running for five minutes after a mutation.
    defaultOptions: {
      queries: { gcTime: Infinity, staleTime: Infinity, retry: false },
      mutations: { gcTime: Infinity },
    },
  });
  queryClient.setQueryData(['routines', 'user-1'], routines);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  await render(<RoutinesSection />, { wrapper });
}

describe('RoutinesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isOfflineMock.mockReturnValue(false);
  });

  it('invites you to create a routine when there are none', async () => {
    const user = userEvent.setup();
    await renderSection([]);

    expect(screen.getByText('No routines yet')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'New routine' }));
    expect(mockPush).toHaveBeenCalledWith('/routines/new');
    expect(screen.queryByRole('button', { name: 'Reorder' })).not.toBeOnTheScreen();
  });

  it('lists routines with their first exercises and opens one', async () => {
    const user = userEvent.setup();
    await renderSection([
      routine('Push A', ['Bench press', 'Dips', 'Flyes']),
      routine('Pull A', ['Pull-up']),
    ]);

    expect(screen.getByText('Bench press, Dips, +1 more')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeOnTheScreen();

    await user.press(screen.getByText('Pull A'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/routines/[id]',
      params: { id: 'routine-Pull A' },
    });
  });

  it('offers Delete to screen readers, and confirms before deleting', async () => {
    const user = userEvent.setup();
    const deleteRequest = jest.fn(async () => ({ error: null }));
    (supabase.from as jest.Mock).mockReturnValue({ delete: () => ({ eq: deleteRequest }) });
    await renderSection([routine('Push A', ['Bench press'])]);

    await fireEvent(screen.getByText('Push A'), 'accessibilityAction', {
      nativeEvent: { actionName: 'Delete' },
    });

    expect(screen.getByText('Delete routine?')).toBeOnTheScreen();
    expect(
      screen.getByText('"Push A" will be deleted. The exercises in it stay in your library.'),
    ).toBeOnTheScreen();
    expect(deleteRequest).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Delete routine' }));
    expect(deleteRequest).toHaveBeenCalledWith('id', 'routine-Push A');
  });

  it('keeps routines viewable offline and disables changes', async () => {
    isOfflineMock.mockReturnValue(true);
    await renderSection([routine('Push A', ['Bench press']), routine('Pull A', ['Pull-up'])]);

    expect(screen.getByText('Push A')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'New' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reorder' })).toBeDisabled();
  });

  it('says how to create a first routine once back online', async () => {
    isOfflineMock.mockReturnValue(true);
    await renderSection([]);

    expect(
      screen.getByText('Connect to the internet to create your first routine.'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'New routine' })).not.toBeOnTheScreen();
  });
});
