import { onlineManager } from '@tanstack/react-query';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { createRef, useEffect, type RefObject } from 'react';

import { useOutbox } from '@/lib/outbox/outboxStore';
import { supabase } from '@/lib/supabase';

import { useActiveWorkout } from '../activeWorkoutStore';
import { useFinishedWorkout } from '../finishedWorkoutStore';
import type { WorkoutSession } from '../schemas/sessionSchema';
import { useWorkoutActions } from './useWorkoutActions';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/features/auth/components/SessionProvider', () => ({
  useSession: () => ({ user: { id: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90' } }),
}));
jest.mock('@/features/settings/api/profile', () => ({
  useProfile: () => ({
    data: { weightUnit: 'kg', distanceUnit: 'km', defaultRestSeconds: 120 },
  }),
}));
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
let mockIdCount = 0;
jest.mock('@/lib/ids', () => ({
  newId: () => `40000000-0000-4000-8000-${String(++mockIdCount).padStart(12, '0')}`,
}));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'n1'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const userId = '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90';
const rpcMock = supabase.rpc as jest.Mock;

type Actions = ReturnType<typeof useWorkoutActions>;

// Renders the hook's dialog and hands its actions to the test.
function Harness({ actionsRef }: { actionsRef: RefObject<Actions | null> }) {
  const actions = useWorkoutActions();
  useEffect(() => {
    actionsRef.current = actions;
  });
  return actions.dialog;
}

const actionsRef = createRef<Actions>();
const actions = {
  startWorkout: (...args: Parameters<Actions['startWorkout']>) =>
    actionsRef.current?.startWorkout(...args),
  confirmFinish: (...args: Parameters<Actions['confirmFinish']>) =>
    actionsRef.current?.confirmFinish(...args),
};

function workout(doneFlags: boolean[]): WorkoutSession {
  return {
    id: '30000000-0000-4000-8000-000000000001',
    userId,
    routineId: null,
    name: 'Push A',
    notes: '',
    startedAt: Date.now() - 60 * 60 * 1000,
    weightUnit: 'kg',
    distanceUnit: 'km',
    timer: null,
    exercises: [
      {
        key: 'bench',
        exercise: {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Bench press',
          exerciseType: 'weight_reps',
        },
        notes: null,
        restSeconds: 120,
        targets: { weightKg: null, repsMin: null, durationSeconds: null },
        sets: doneFlags.map((done, index) => ({
          key: `s${index}`,
          weight: '80',
          reps: '8',
          duration: '',
          distance: '',
          done,
        })),
      },
    ],
  };
}

describe('useWorkoutActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    useActiveWorkout.setState({ session: null });
    useOutbox.setState({ items: [] });
    useFinishedWorkout.setState({ summary: null });
  });

  it('starts an empty workout and opens it', async () => {
    await render(<Harness actionsRef={actionsRef} />);
    await act(async () => actions.startWorkout(null));

    expect(useActiveWorkout.getState().session).toMatchObject({ name: 'Workout', userId });
    expect(mockRouter.push).toHaveBeenCalledWith('/workout');
  });

  it('asks before replacing a workout in progress', async () => {
    useActiveWorkout.setState({ session: workout([false]) });
    await render(<Harness actionsRef={actionsRef} />);
    await act(async () => actions.startWorkout(null));

    expect(screen.getByText('Workout in progress')).toBeOnTheScreen();
    expect(useActiveWorkout.getState().session?.name).toBe('Push A');
  });

  it('confirms unticked sets, then queues the workout, shows the summary and syncs it', async () => {
    const user = userEvent.setup();
    rpcMock.mockResolvedValue({ data: '30000000-0000-4000-8000-000000000001', error: null });
    useActiveWorkout.setState({ session: workout([true, false]) });
    await render(<Harness actionsRef={actionsRef} />);

    await act(async () => actions.confirmFinish(new Map()));
    expect(screen.getByText("1 set isn't ticked and won't be saved.")).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Finish workout' }));

    expect(useActiveWorkout.getState().session).toBeNull();
    expect(useFinishedWorkout.getState().summary).toMatchObject({ name: 'Push A', setCount: 1 });
    expect(mockRouter.replace).toHaveBeenCalledWith('/workout-summary');
    expect(rpcMock).toHaveBeenCalledWith('save_workout', {
      workout: expect.objectContaining({ id: '30000000-0000-4000-8000-000000000001' }),
    });
    await waitFor(() => expect(useOutbox.getState().items).toHaveLength(0));
  });

  it('keeps a finished workout queued when there is no connection', async () => {
    onlineManager.setOnline(false);
    useActiveWorkout.setState({ session: workout([true]) });
    await render(<Harness actionsRef={actionsRef} />);

    await act(async () => actions.confirmFinish(new Map()));

    expect(rpcMock).not.toHaveBeenCalled();
    expect(useOutbox.getState().items).toEqual([
      expect.objectContaining({ id: '30000000-0000-4000-8000-000000000001', kind: 'workout' }),
    ]);
  });

  it('offers to discard a workout with nothing ticked', async () => {
    const user = userEvent.setup();
    useActiveWorkout.setState({ session: workout([false]) });
    await render(<Harness actionsRef={actionsRef} />);

    await act(async () => actions.confirmFinish(new Map()));
    expect(screen.getByText('Nothing to save yet')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Discard workout' }));
    expect(screen.getByText('Discard workout?')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Discard workout' }));

    expect(useActiveWorkout.getState().session).toBeNull();
    expect(useOutbox.getState().items).toHaveLength(0);
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
