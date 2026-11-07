import { useSyncExternalStore } from 'react';

import { useActiveWorkout } from '../activeWorkoutStore';

function subscribe(onChange: () => void) {
  return useActiveWorkout.persist.onFinishHydration(onChange);
}

function hasRestored() {
  return useActiveWorkout.persist.hasHydrated();
}

// Whether the saved workout has been read back from the phone's storage, which
// happens once, shortly after the app opens.
export function useWorkoutRestored(): boolean {
  return useSyncExternalStore(subscribe, hasRestored);
}
