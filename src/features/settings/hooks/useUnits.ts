import type { Units } from '@/features/workout/utils/setValues';

import { useProfile } from '../api/profile';

// The user's weight and distance units, for showing stored values. Falls back
// to metric only while the profile loads, which the signed-in screens wait for.
export function useUnits(): Units {
  const profile = useProfile().data;
  return {
    weightUnit: profile?.weightUnit ?? 'kg',
    distanceUnit: profile?.distanceUnit ?? 'km',
  };
}
