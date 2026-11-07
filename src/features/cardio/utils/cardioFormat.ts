import { formatDuration } from '@/lib/durations';
import { formatDistance, fromMetres, type DistanceUnit } from '@/lib/units';

import type { Activity } from './route';

export const activityLabels: Record<Activity, string> = {
  run: 'Run',
  walk: 'Walk',
  ride: 'Ride',
};

// A pace stored as seconds per kilometre, in the user's unit: "5:30 /km",
// "8:51 /mi". A dash when there isn't one yet.
export function formatPace(secondsPerKm: number | null, unit: DistanceUnit): string {
  if (secondsPerKm === null) return '–';
  const perUnit = secondsPerKm / 1000 / fromMetres(1, unit);
  return `${formatDuration(perUnit)} /${unit}`;
}

// The second line of a session in History: "4.21 km, 10:55 /km".
export function cardioSummaryText(
  distanceM: number,
  movingSeconds: number,
  unit: DistanceUnit,
): string {
  const pace = distanceM >= 20 && movingSeconds > 0 ? (movingSeconds / distanceM) * 1000 : null;
  return pace === null
    ? formatDistance(distanceM, unit)
    : `${formatDistance(distanceM, unit)}, ${formatPace(pace, unit)}`;
}
