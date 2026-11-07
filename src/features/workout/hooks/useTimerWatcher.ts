import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useActiveWorkout } from '../activeWorkoutStore';
import { endTimer } from '../workoutTimers';

// Ends the workout's timer when its time comes, wherever the user is in the
// app. JavaScript timers pause in the background, so the end is checked again
// whenever the app comes back to the front; a timer that ran out while the app
// was closed is ended as soon as the app opens.
export function useTimerWatcher(): void {
  const timer = useActiveWorkout((state) => state.session?.timer ?? null);

  useEffect(() => {
    if (!timer) return;
    const check = () => {
      if (Date.now() >= timer.endsAt) endTimer(timer);
    };
    const timeout = setTimeout(check, Math.max(0, timer.endsAt - Date.now()));
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') check();
    });
    return () => {
      clearTimeout(timeout);
      appState.remove();
    };
  }, [timer]);
}
