import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { useActiveWorkout } from '../activeWorkoutStore';
import type { SessionExercise, WorkoutSession } from '../schemas/sessionSchema';
import type { HistorySet } from '../utils/setValues';
import { WorkoutExerciseBlock } from './WorkoutExerciseBlock';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/features/auth/components/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'n1'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

const units = { weightUnit: 'kg', distanceUnit: 'km' } as const;

function emptySet(key: string) {
  return {
    key,
    weight: '',
    reps: '',
    duration: '',
    distance: '',
    done: false,
  };
}

function exercise(overrides: Partial<SessionExercise>): SessionExercise {
  return {
    key: 'bench',
    exercise: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Bench press',
      exerciseType: 'weight_reps',
    },
    notes: null,
    restSeconds: 120,
    targets: { weightKg: null, repsMin: null, durationSeconds: null },
    sets: [emptySet('s1'), emptySet('s2')],
    ...overrides,
  };
}

const lastTime: HistorySet[] = [
  {
    workoutId: 'w0',
    startedAt: '2026-10-02T17:00:00Z',
    exercisePosition: 0,
    setPosition: 0,
    weightKg: 80,
    reps: 8,
    durationSeconds: null,
    distanceM: null,
  },
];

async function renderBlock(item: SessionExercise, history?: HistorySet[], now = 0) {
  const session: WorkoutSession = {
    id: '30000000-0000-4000-8000-000000000001',
    userId: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90',
    routineId: null,
    name: 'Push A',
    notes: '',
    startedAt: 0,
    weightUnit: 'kg',
    distanceUnit: 'km',
    timer: null,
    exercises: [item],
  };
  useActiveWorkout.setState({ session });
  await render(
    <WorkoutExerciseBlock
      exercise={item}
      units={units}
      history={history}
      timer={null}
      now={now}
      onOpenMenu={jest.fn()}
    />,
  );
}

// Draws the block again from the saved workout, the way WorkoutScreen does
// after the store changes.
async function redrawBlock(now: number) {
  const session = useActiveWorkout.getState().session;
  const item = session?.exercises[0];
  if (!session || !item) throw new Error('No workout in the store');
  await screen.rerender(
    <WorkoutExerciseBlock
      exercise={item}
      units={units}
      history={undefined}
      timer={session.timer}
      now={now}
      onOpenMenu={jest.fn()}
    />,
  );
}

function storedSet(index: number) {
  return useActiveWorkout.getState().session?.exercises[0]?.sets[index];
}

describe('WorkoutExerciseBlock', () => {
  it('shows the last workout and uses it for an empty set that is ticked', async () => {
    const user = userEvent.setup();
    await renderBlock(exercise({}), lastTime);

    expect(screen.getByText('80 × 8')).toBeOnTheScreen();
    expect(screen.getByLabelText('Bench press set 1 weight')).toHaveProp('placeholder', '80');

    await user.press(screen.getByRole('checkbox', { name: 'Bench press set 1 done' }));

    expect(storedSet(0)).toMatchObject({ weight: '80', reps: '8', done: true });
    expect(useActiveWorkout.getState().session?.timer?.kind).toBe('rest');
  });

  it('says what is missing when there is nothing to tick the set with', async () => {
    const user = userEvent.setup();
    await renderBlock(exercise({}));

    await user.press(screen.getByRole('checkbox', { name: 'Bench press set 1 done' }));

    expect(screen.getByText('Enter the weight and reps.')).toBeOnTheScreen();
    expect(storedSet(0)?.done).toBe(false);
  });

  it('offers Delete set to screen readers, which cannot swipe', async () => {
    await renderBlock(exercise({}));

    await fireEvent(screen.getByLabelText('Set 2'), 'accessibilityAction', {
      nativeEvent: { actionName: 'delete' },
    });

    const sets = useActiveWorkout.getState().session?.exercises[0]?.sets;
    expect(sets?.map((set) => set.key)).toEqual(['s1']);
  });

  it('shows the columns for the exercise type', async () => {
    await renderBlock(
      exercise({
        exercise: {
          id: '00000000-0000-4000-8000-000000000002',
          name: 'Plank',
          exerciseType: 'duration',
        },
        targets: { weightKg: null, repsMin: null, durationSeconds: 45 },
      }),
    );

    // Headings are hidden from screen readers; each input has its own label.
    const hidden = { includeHiddenElements: true };
    expect(screen.getByText('Time', hidden)).toBeOnTheScreen();
    expect(screen.queryByText('Reps', hidden)).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Plank set 1 time')).toHaveProp('placeholder', '0:45');
    expect(screen.getByRole('button', { name: 'Start Plank set 1 timer' })).toBeOnTheScreen();
  });

  it('first shows exactly the entered time when a timed set starts', async () => {
    // The screen's clock last updated 400 ms before Start was pressed, as it
    // only updates every half second.
    const clockReading = 1_000_000;
    const pressedAt = clockReading + 400;
    await renderBlock(
      exercise({
        exercise: {
          id: '00000000-0000-4000-8000-000000000002',
          name: 'Plank',
          exerciseType: 'duration',
        },
        sets: [{ ...emptySet('s1'), duration: '5' }],
      }),
      undefined,
      clockReading,
    );
    jest.spyOn(Date, 'now').mockReturnValue(pressedAt);

    await fireEvent.press(screen.getByRole('button', { name: 'Start Plank set 1 timer' }));
    await redrawBlock(clockReading);

    expect(screen.getByText('0:05')).toBeOnTheScreen();
    expect(screen.queryByText('0:06')).not.toBeOnTheScreen();
    // The set still ends, and "Time's up" still fires, 5 seconds after the press.
    expect(useActiveWorkout.getState().session?.timer).toMatchObject({
      kind: 'set',
      startedAt: pressedAt,
      endsAt: pressedAt + 5000,
    });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: expect.objectContaining({ date: pressedAt + 5000 }) }),
    );

    await redrawBlock(pressedAt + 1000);
    expect(screen.getByText('0:04')).toBeOnTheScreen();
    jest.restoreAllMocks();
  });

  it('marks added weight in the heading for weighted bodyweight', async () => {
    await renderBlock(
      exercise({
        exercise: {
          id: '00000000-0000-4000-8000-000000000003',
          name: 'Weighted dip',
          exerciseType: 'weighted_bodyweight',
        },
      }),
    );

    expect(screen.getByText('+kg', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
