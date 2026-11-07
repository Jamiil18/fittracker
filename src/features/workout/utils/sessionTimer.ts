import type { WorkoutSession, WorkoutTimer } from '../schemas/sessionSchema';

// Changes to the workout's one timer, kept apart from the other session
// changes in session.ts. Side effects (notifications, haptics) are in
// workoutTimers.ts; these only change the saved times.

export function startTimer(
  session: WorkoutSession,
  timer: Omit<WorkoutTimer, 'notificationId'>,
): WorkoutSession {
  return { ...session, timer: { ...timer, notificationId: null } };
}

// The scheduled notification arrives after the timer is set, because
// scheduling is asynchronous; it is only kept if the same timer, with the same
// end, is still running.
export function attachNotification(
  session: WorkoutSession,
  timer: Pick<WorkoutTimer, 'startedAt' | 'endsAt'>,
  notificationId: string,
): WorkoutSession {
  const current = session.timer;
  if (!current || current.startedAt !== timer.startedAt || current.endsAt !== timer.endsAt) {
    return session;
  }
  return { ...session, timer: { ...current, notificationId } };
}

// Moves the end of the rest timer, never to before now.
export function adjustTimer(session: WorkoutSession, deltaSeconds: number, now: number) {
  if (!session.timer) return session;
  const endsAt = Math.max(now, session.timer.endsAt + deltaSeconds * 1000);
  return { ...session, timer: { ...session.timer, endsAt, notificationId: null } };
}

// Time left on the timer. The screen's clock only updates every half second,
// so when a timer has just started, `now` can be a moment older than its start.
// Counting from that older time would make a 5 second timer first show 0:06,
// so the clock is never read as earlier than the start.
export function millisecondsLeft(
  timer: Pick<WorkoutTimer, 'startedAt' | 'endsAt'>,
  now: number,
): number {
  return Math.max(0, timer.endsAt - Math.max(now, timer.startedAt));
}

// Rounded up, so it reads 0:00 only once the time is up.
export function secondsLeft(timer: Pick<WorkoutTimer, 'startedAt' | 'endsAt'>, now: number) {
  return Math.ceil(millisecondsLeft(timer, now) / 1000);
}

export function clearTimer(session: WorkoutSession): WorkoutSession {
  return { ...session, timer: null };
}
