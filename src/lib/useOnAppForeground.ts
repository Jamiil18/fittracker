import { useEffect } from 'react';
import { AppState } from 'react-native';

// Runs `callback` each time the app comes back to the front. Used for state
// the user can change outside the app, such as a permission turned on in the
// phone's settings, which the app would otherwise only read when the screen
// first opens. `callback` should keep the same identity between renders.
export function useOnAppForeground(callback: () => void): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') callback();
    });
    return () => subscription.remove();
  }, [callback]);
}
