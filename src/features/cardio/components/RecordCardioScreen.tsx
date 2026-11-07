import * as Location from 'expo-location';
import { useCallback } from 'react';

import { PermissionGate } from '@/components/ui/PermissionGate';
import { Screen } from '@/components/ui/Screen';
import { logger } from '@/lib/logger';
import { useOnAppForeground } from '@/lib/useOnAppForeground';

import { CardioRecorder } from './CardioRecorder';

// Asks for location only here, when the user wants to record, after saying
// what it's used for.
export function RecordCardioScreen() {
  const [permission, requestPermission, readPermission] = Location.useForegroundPermissions();
  // After "Open settings", the user may come back with location allowed.
  useOnAppForeground(
    useCallback(() => {
      readPermission().catch((error: unknown) => logger.error('read location permission', error));
    }, [readPermission]),
  );
  return (
    <Screen padded={false} edges={['bottom']}>
      <PermissionGate
        permission={permission}
        title="Location for outdoor cardio"
        explanation="FitTracker uses your location only while you record a run, walk or ride on this screen, to measure the distance and draw your route. It stops when you pause, finish or leave the screen."
        allowLabel="Allow location"
        onRequest={() => void requestPermission()}
      >
        <CardioRecorder />
      </PermissionGate>
    </Screen>
  );
}
