import { useEffect } from 'react';

import { useSession } from '@/features/auth/components/SessionProvider';
import { useOutboxSync } from '@/lib/outbox/useOutboxSync';

import { useActiveWorkout } from '../activeWorkoutStore';
import { useTimerWatcher } from '../hooks/useTimerWatcher';
import { outboxSenders } from '@/features/sync/outboxSenders';
import { setUpTimerNotifications } from '../timerNotifications';
import { watchTimerNotifications } from '../workoutTimers';

// The parts of training that run whichever screen is open: ending timers on
// time, keeping their notifications in step, and sending finished workouts.
// Rendered once while signed in; draws nothing.
export function WorkoutBackgroundTasks() {
  const { user } = useSession();
  const userId = user?.id ?? null;

  useEffect(() => {
    void setUpTimerNotifications();
    return watchTimerNotifications();
  }, []);

  // A workout saved on the phone by someone else is never shown. Signing out
  // clears it, so this only matters if that clear didn't finish.
  useEffect(() => {
    const { session, clear } = useActiveWorkout.getState();
    if (session && userId && session.userId !== userId) clear();
  }, [userId]);

  useTimerWatcher();
  useOutboxSync(userId, outboxSenders);
  return null;
}
