import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import { useActiveWorkout } from './activeWorkoutStore';
import type { WorkoutSession } from './schemas/sessionSchema';
import {
  adjustRest,
  endTimer,
  startSetTimer,
  stopTimer,
  tickSet,
  watchTimerNotifications,
} from './workoutTimers';

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

const scheduleMock = Notifications.scheduleNotificationAsync as jest.Mock;
const cancelMock = Notifications.cancelScheduledNotificationAsync as jest.Mock;

function session(restSeconds = 90): WorkoutSession {
  return {
    id: '30000000-0000-4000-8000-000000000001',
    userId: '6f1c7a52-8d3e-4b0a-9c55-2e6f1d7b8a90',
    routineId: null,
    name: 'Push A',
    notes: '',
    startedAt: 0,
    weightUnit: 'kg',
    distanceUnit: 'km',
    timer: null,
    exercises: [
      {
        key: 'plank',
        exercise: {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Plank',
          exerciseType: 'duration',
        },
        notes: null,
        restSeconds,
        targets: { weightKg: null, repsMin: null, durationSeconds: null },
        sets: [
          {
            key: 's1',
            weight: '',
            reps: '',
            duration: '45',
            distance: '',
            done: false,
          },
        ],
      },
    ],
  };
}

// Lets the notification scheduling, which is asynchronous, finish.
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('workout timers', () => {
  let stopWatching: () => void;
  beforeEach(() => {
    jest.clearAllMocks();
    let count = 0;
    scheduleMock.mockImplementation(async () => `n${++count}`);
    useActiveWorkout.setState({ session: session() });
    stopWatching = watchTimerNotifications();
  });
  afterEach(() => stopWatching());

  it('ticks a set, starts the rest, and schedules its notification', async () => {
    tickSet('plank', 's1', { duration: '45' });
    await settle();

    const state = useActiveWorkout.getState().session;
    expect(state?.exercises[0]?.sets[0]?.done).toBe(true);
    expect(state?.timer).toMatchObject({
      kind: 'rest',
      exerciseKey: 'plank',
      notificationId: 'n1',
    });
    expect((state?.timer?.endsAt ?? 0) - (state?.timer?.startedAt ?? 0)).toBe(90_000);
  });

  it('starts no rest when the rest time is off', () => {
    useActiveWorkout.setState({ session: session(0) });
    tickSet('plank', 's1', {});
    expect(useActiveWorkout.getState().session?.timer).toBeNull();
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('cancels the notification when the rest is skipped or moved', async () => {
    tickSet('plank', 's1', {});
    await settle();

    adjustRest(15);
    expect(cancelMock).toHaveBeenCalledWith('n1');
    await settle();
    expect(useActiveWorkout.getState().session?.timer?.notificationId).toBe('n2');

    stopTimer();
    expect(cancelMock).toHaveBeenCalledWith('n2');
    expect(useActiveWorkout.getState().session?.timer).toBeNull();
  });

  it('cancels the notification when the workout is cleared', async () => {
    tickSet('plank', 's1', {});
    await settle();

    useActiveWorkout.getState().clear();
    expect(cancelMock).toHaveBeenCalledWith('n1');
  });

  it('ticks a timed set when its time is up, then starts the rest if the app is open', async () => {
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
    startSetTimer('plank', 's1', 45);
    await settle();
    const timer = useActiveWorkout.getState().session?.timer;
    if (!timer) throw new Error('expected a timer');
    jest.spyOn(Date, 'now').mockReturnValue(timer.endsAt);

    endTimer(timer);

    const state = useActiveWorkout.getState().session;
    expect(state?.exercises[0]?.sets[0]?.done).toBe(true);
    expect(state?.timer?.kind).toBe('rest');
    jest.restoreAllMocks();
  });

  it('only tidies away a timer noticed late, without starting the rest', async () => {
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
    startSetTimer('plank', 's1', 45);
    await settle();
    const timer = useActiveWorkout.getState().session?.timer;
    if (!timer) throw new Error('expected a timer');
    jest.spyOn(Date, 'now').mockReturnValue(timer.endsAt + 60_000);

    endTimer(timer);

    const state = useActiveWorkout.getState().session;
    expect(state?.exercises[0]?.sets[0]?.done).toBe(true);
    expect(state?.timer).toBeNull();
    jest.restoreAllMocks();
  });
});
