import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { logger } from '@/lib/logger';

import { useCardioRecording } from '../recordingStore';
import { addPoint } from '../utils/recording';

// Follows the phone's location while `active` and adds each reading to the
// recording (addPoint drops imprecise readings and impossible jumps). Only
// runs while the recording screen is open: FitTracker tracks location in the
// foreground only. Returns a message if tracking failed.
export function useLocationTracking(active: boolean): string | null {
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let subscription: Location.LocationSubscription | null = null;
    let stopped = false;

    const begin = async () => {
      if (!(await Location.hasServicesEnabledAsync())) {
        setProblem('Location is turned off on this phone. Turn it on to record your route.');
        return;
      }
      setProblem(null);
      const watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
        (location) => {
          useCardioRecording
            .getState()
            .update((recording) =>
              addPoint(
                recording,
                [location.coords.longitude, location.coords.latitude, location.timestamp],
                location.coords.accuracy,
              ),
            );
        },
        (reason) => {
          logger.error('location updates', reason);
          setProblem("Your location couldn't be read. Check that location is on, then try again.");
        },
      );
      // The screen may have closed while tracking was starting.
      if (stopped) watch.remove();
      else subscription = watch;
    };

    begin().catch((error: unknown) => {
      logger.error('start location tracking', error);
      setProblem("Your location couldn't be read. Check that location is on, then try again.");
    });

    return () => {
      stopped = true;
      subscription?.remove();
    };
  }, [active]);

  return active ? problem : null;
}
