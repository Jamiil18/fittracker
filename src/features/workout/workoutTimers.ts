import { AppState } from 'react-native';

import { useActiveWorkout } from './activeWorkoutStore';
import { setCompletedHaptic, timerEndedHaptic } from './haptics';
import type { WorkoutTimer } from './schemas/sessionSchema';
import { completeSet, uncompleteSet } from './utils/session';
import { adjustTimer, attachNotification, clearTimer, startTimer } from './utils/sessionTimer';
import { cancelTimerNotification, scheduleTimerNotification } from './timerNotifications';

// Starting, changing and ending the workout's one timer, together with its
// notification. The timer itself is just two times in the saved workout; the
// notification is what tells the user when the app is in the background.

// Cancels a timer's notification whenever that timer is replaced, moved or
// removed, however it happened: skipping, ticking another set, deleting the
// set or exercise, or discarding the workout. Call once; returns a function
// that stops watching.
export function watchTimerNotifications(): () => void {
  return useActiveWorkout.subscribe((state, previous) => {
    const before = previous.session?.timer ?? null;
    const after = state.session?.timer ?? null;
    if (before?.notificationId && before.notificationId !== after?.notificationId) {
      void cancelTimerNotification(before.notificationId);
    }
  });
}

function currentTimer() {
  return useActiveWorkout.getState().session?.timer ?? null;
}

async function scheduleFor(timer: Pick<WorkoutTimer, 'kind' | 'startedAt' | 'endsAt'>) {
  const id = await scheduleTimerNotification(timer.kind, timer.endsAt);
  if (!id) return;
  // The timer may have been skipped, moved or replaced while this was scheduling.
  const current = currentTimer();
  if (current?.startedAt === timer.startedAt && current.endsAt === timer.endsAt) {
    useActiveWorkout.getState().update((session) => attachNotification(session, timer, id));
  } else {
    await cancelTimerNotification(id);
  }
}

function replaceTimer(
  timer: Omit<WorkoutTimer, 'notificationId' | 'startedAt' | 'endsAt'>,
  seconds: number,
) {
  const startedAt = Date.now();
  const next = { ...timer, startedAt, endsAt: startedAt + seconds * 1000 };
  useActiveWorkout.getState().update((session) => startTimer(session, next));
  void scheduleFor(next);
}

export function stopTimer(): void {
  useActiveWorkout.getState().update(clearTimer);
}

// The rest after a set of this exercise, unless its rest is switched off.
function startRest(exerciseKey: string): void {
  const exercise = useActiveWorkout
    .getState()
    .session?.exercises.find((item) => item.key === exerciseKey);
  if (!exercise || exercise.restSeconds === 0) {
    stopTimer();
    return;
  }
  replaceTimer({ kind: 'rest', exerciseKey, setKey: null }, exercise.restSeconds);
}

export function startSetTimer(exerciseKey: string, setKey: string, seconds: number): void {
  replaceTimer({ kind: 'set', exerciseKey, setKey }, seconds);
}

// −15s and +15s on the rest bar.
export function adjustRest(deltaSeconds: number): void {
  const timer = currentTimer();
  if (!timer) return;
  useActiveWorkout.getState().update((session) => adjustTimer(session, deltaSeconds, Date.now()));
  const adjusted = currentTimer();
  if (adjusted && adjusted.endsAt > Date.now()) void scheduleFor(adjusted);
}

// Ticks a set with the values it was completed with, then starts the rest.
export function tickSet(
  exerciseKey: string,
  setKey: string,
  values: Parameters<typeof completeSet>[3],
) {
  useActiveWorkout
    .getState()
    .update((session) => completeSet(session, exerciseKey, setKey, values));
  setCompletedHaptic();
  startRest(exerciseKey);
}

export function untickSet(exerciseKey: string, setKey: string): void {
  useActiveWorkout.getState().update((session) => uncompleteSet(session, exerciseKey, setKey));
}

// Called when the timer's end time has passed. If that happens while the app
// is open, the phone vibrates; if it was noticed later (the app was in the
// background or closed), the notification has already told the user, so the
// timer is just tidied away.
export function endTimer(timer: WorkoutTimer): void {
  if (currentTimer()?.startedAt !== timer.startedAt) return;
  const onTime = AppState.currentState === 'active' && Date.now() - timer.endsAt < 2000;
  useActiveWorkout.getState().update(clearTimer);
  if (timer.kind === 'set' && timer.setKey) {
    useActiveWorkout
      .getState()
      .update((session) => completeSet(session, timer.exerciseKey, timer.setKey ?? '', {}));
    if (onTime) startRest(timer.exerciseKey);
  }
  if (onTime) timerEndedHaptic();
}
